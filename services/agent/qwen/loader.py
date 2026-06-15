"""Lazy loader for the local Qwen2.5-Instruct LLM.

The model is NOT loaded at import time. It is only loaded on the first
request that needs it, and is cached afterwards. This keeps app startup
fast and avoids OOM on small instances that never call the LLM endpoints.

Configuration is entirely via environment variables so the same code can
run on a 4GB GPU (4-bit quantized) or fall back to CPU.
"""
import os
import threading

MODEL_ID = os.getenv("LOCAL_LLM_MODEL_ID", "Qwen/Qwen2.5-1.5B-Instruct")
DEVICE = os.getenv("LOCAL_LLM_DEVICE", "auto")  # "auto", "cuda", "cpu"
LOAD_IN_4BIT = os.getenv("LOCAL_LLM_LOAD_IN_4BIT", "true").lower() in ("1", "true", "yes")
MAX_NEW_TOKENS = int(os.getenv("LOCAL_LLM_MAX_NEW_TOKENS", "512"))
TEMPERATURE = float(os.getenv("LOCAL_LLM_TEMPERATURE", "0.7"))
TOP_P = float(os.getenv("LOCAL_LLM_TOP_P", "0.9"))

_model = None
_tokenizer = None
_resolved_device = None
_load_lock = threading.Lock()
_load_error = None


def is_loaded() -> bool:
    return _model is not None


def get_status() -> dict:
    return {
        "model_id": MODEL_ID,
        "loaded": is_loaded(),
        "device": _resolved_device,
        "load_in_4bit": LOAD_IN_4BIT,
        "error": _load_error,
    }


def get_model():
    """Load (once) and return (model, tokenizer). Thread-safe."""
    global _model, _tokenizer, _resolved_device, _load_error

    if _model is not None:
        return _model, _tokenizer

    with _load_lock:
        if _model is not None:
            return _model, _tokenizer

        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer

            device = DEVICE
            if device == "auto":
                device = "cuda" if torch.cuda.is_available() else "cpu"

            tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

            model_kwargs = {}
            if device == "cuda" and LOAD_IN_4BIT:
                from transformers import BitsAndBytesConfig

                model_kwargs["quantization_config"] = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_use_double_quant=True,
                )
                model_kwargs["device_map"] = "auto"
            elif device == "cuda":
                model_kwargs["torch_dtype"] = torch.float16
                model_kwargs["device_map"] = "auto"
            else:
                model_kwargs["torch_dtype"] = torch.float32

            model = AutoModelForCausalLM.from_pretrained(MODEL_ID, **model_kwargs)
            if device == "cpu":
                model = model.to("cpu")
            model.eval()

            _model, _tokenizer, _resolved_device = model, tokenizer, device
            _load_error = None
        except Exception as e:
            _load_error = str(e)
            raise

    return _model, _tokenizer


def generate(messages, max_new_tokens=None, temperature=None, top_p=None) -> str:
    """Run chat-style generation and return the decoded assistant reply."""
    import torch

    model, tokenizer = get_model()

    text = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    inputs = tokenizer(text, return_tensors="pt").to(model.device)

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens or MAX_NEW_TOKENS,
            temperature=temperature or TEMPERATURE,
            top_p=top_p or TOP_P,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    generated = output_ids[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(generated, skip_special_tokens=True).strip()
