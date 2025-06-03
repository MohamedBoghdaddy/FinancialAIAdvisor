# services/agent/Phi_Model/phi2_loader.py

import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel
from functools import lru_cache

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LORA_PATH = os.path.join(BASE_DIR, "phi2-finetuned")

# ✅ Device & Optimization Settings
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🧠 Using device: {device.upper()}")

bnb_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_threshold=6.0,
    llm_int8_enable_fp32_cpu_offload=True
)

@lru_cache()
def get_model():
    print("📦 Loading quantized Phi-2 base...")
    base_model = AutoModelForCausalLM.from_pretrained(
        "microsoft/phi-2",
        device_map="auto",
        quantization_config=bnb_config,
        trust_remote_code=True
    )

    print("🔗 Loading LoRA fine-tuned adapters...")
    model = PeftModel.from_pretrained(
        base_model,
        LORA_PATH,
        device_map="auto"
    )

    tokenizer = AutoTokenizer.from_pretrained(LORA_PATH)
    tokenizer.pad_token = tokenizer.eos_token
    model.eval()

    print("✅ Ready for fast inference with smart LoRA overlays.")
    return model, tokenizer

# 🚀 Preload on import
model, tokenizer = get_model()

__all__ = ["model", "tokenizer", "get_model"]
