import os
import json
import torch
import logging
import threading
import time
import GPUtil
import pandas as pd
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import (
    AutoTokenizer, AutoModelForCausalLM, Trainer, TrainingArguments,
    DataCollatorForLanguageModeling
)
import uvicorn

# -----------------------------------------------------------------------------
# CONFIGURATION & PATHS
# -----------------------------------------------------------------------------

load_dotenv(os.path.join(os.getcwd(), "../../server/.env"))
MONGO_URL = os.getenv("MONGO_URL")

BASE_MODEL_DIR = "./meta-llama"
MODEL_PATH = os.path.join(BASE_MODEL_DIR, "Llama-3.2-1B")
FINE_TUNED_MODEL_PATH = "./fine_tuned_llama"
CACHE_PATH = "./cached_datasets"
TOKENIZED_CACHE = os.path.join(CACHE_PATH, "tokenized_dataset")
FINETUNE_JSON_PATH = "./financial_finetune.json"

os.makedirs(CACHE_PATH, exist_ok=True)

# -----------------------------------------------------------------------------
# LOGGING & DEVICE CONFIGURATION
# -----------------------------------------------------------------------------

device = "cuda" if torch.cuda.is_available() else "cpu"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# MONGODB & FASTAPI SETUP
# -----------------------------------------------------------------------------

try:
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client["financial_ai"]
    client.server_info()
    logger.info("✅ MongoDB connected successfully.")
except Exception as e:
    logger.error(f"❌ MongoDB Connection Failed: {e}")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# GPU MONITORING
# -----------------------------------------------------------------------------

def monitor_gpu():
    """Monitors GPU usage and switches device if necessary."""
    global device
    while True:
        try:
            gpus = GPUtil.getGPUs()
            if not gpus:
                logger.warning("⚠️ No GPUs detected. Running on CPU.")
                return

            gpu_mem = gpus[0].memoryUsed
            logger.info(f"🔥 GPU Memory Usage: {gpu_mem / 1024:.2f} GB")

            if gpu_mem > 3000:  # 3GB threshold for RTX 3050
                logger.warning("⚠️ High GPU Memory! Offloading model to CPU.")
                device = "cpu"
                torch.cuda.empty_cache()
            elif gpu_mem < 2500 and device == "cpu":
                logger.info("✅ GPU memory freed! Moving back to GPU...")
                device = "cuda"
        except Exception as e:
            logger.error(f"⚠️ GPU Monitoring Error: {e}")
        time.sleep(5)

gpu_monitor_thread = threading.Thread(target=monitor_gpu, daemon=True)
gpu_monitor_thread.start()

# -----------------------------------------------------------------------------
# DATASET LOADING & PROCESSING FUNCTIONS
# -----------------------------------------------------------------------------

def load_json_dataset():
    """Loads the financial fine-tuning dataset from a JSON file."""
    if not os.path.exists(FINETUNE_JSON_PATH):
        raise FileNotFoundError(f"❌ Dataset file not found at {FINETUNE_JSON_PATH}")
    with open(FINETUNE_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("❌ Dataset is not a valid JSON list.")
    return data

def format_text(example):
    """
    Formats dataset samples into a single text field.
    If the 'text' field exists and is non-empty, it is ignored and rebuilt.
    """
    instruction = str(example.get("instruction", ""))
    input_text = str(example.get("input", ""))
    output_text = str(example.get("output", ""))
    return {
        "text": f"### Instruction:\n{instruction}\n\n### Input:\n{input_text}\n\n### Response:\n{output_text}"
    }

def tokenize_function(example, tokenizer):
    """
    Tokenizes the text field and returns numerical token IDs and attention masks.
    """
    text = example["text"].strip()
    tokenized = tokenizer(
        text,
        padding="max_length",
        truncation=True,
        max_length=512,
        return_tensors="pt",
    )
    return {
        "input_ids": tokenized["input_ids"].squeeze().tolist(),
        "attention_mask": tokenized["attention_mask"].squeeze().tolist(),
    }

def prepare_dataset():
    """Loads, formats, tokenizes, and splits the dataset."""
    if os.path.exists(TOKENIZED_CACHE):
        logger.info("✅ Loading cached tokenized dataset.")
        return torch.load(TOKENIZED_CACHE)

    raw_data = load_json_dataset()
    formatted_data = [format_text(example) for example in raw_data]

    tokenizer, _ = load_llama()
    tokenized_data = [tokenize_function(sample, tokenizer) for sample in formatted_data]

    train_size = int(0.8 * len(tokenized_data))
    dataset = {
        "train": tokenized_data[:train_size],
        "test": tokenized_data[train_size:]
    }

    # Save dataset
    torch.save(dataset, TOKENIZED_CACHE)
    logger.info("✅ Dataset processed and cached.")

    return dataset

# -----------------------------------------------------------------------------
# MODEL LOADING
# -----------------------------------------------------------------------------

def load_llama():
    """Loads the LLaMA tokenizer and model with proper device handling."""
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    tokenizer.pad_token = tokenizer.eos_token

    logger.info("🚀 Loading model...")

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_PATH,
        low_cpu_mem_usage=True,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map="auto"  # ✅ Let Accelerate handle device placement
    )

    logger.info("✅ Model loaded successfully!")
    return tokenizer, model


# -----------------------------------------------------------------------------
# FINE-TUNING
# -----------------------------------------------------------------------------

def fine_tune_llama():
    """Fine-tunes the LLaMA model using the prepared dataset."""
    dataset = prepare_dataset()
    tokenizer, model = load_llama()

    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
        pad_to_multiple_of=8
    )

    training_args = TrainingArguments(
        output_dir=FINE_TUNED_MODEL_PATH,
        eval_strategy="steps",
        save_strategy="steps",
        save_steps=1000,
        eval_steps=1000,
        per_device_train_batch_size=2,
        per_device_eval_batch_size=2,
        gradient_accumulation_steps=64,
        num_train_epochs=2,
        learning_rate=5e-5,
        weight_decay=0.01,
        warmup_steps=100,
        save_total_limit=5,
        logging_dir="./logs",
        optim="adamw_torch",
        report_to="none",
        remove_unused_columns=False,
        load_best_model_at_end=True
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["test"],
        data_collator=data_collator
    )

    trainer.train()
    trainer.save_model(FINE_TUNED_MODEL_PATH)
    tokenizer.save_pretrained(FINE_TUNED_MODEL_PATH)
    logger.info("🎉 Fine-tuning completed successfully!")

# -----------------------------------------------------------------------------
# FASTAPI ENDPOINTS
# -----------------------------------------------------------------------------

@app.post("/api/fine-tune")
def fine_tune():
    try:
        fine_tune_llama()
        return {"message": "Fine-tuning completed successfully."}
    except Exception as e:
        logger.error(f"❌ Fine-tuning error: {e}")
        raise HTTPException(status_code=500, detail="Fine-tuning failed.")

@app.post("/api/chat")
async def chat(input_data: BaseModel):
    try:
        response = generate_response(input_data.message)
        return {"response": response}
    except Exception as e:
        logger.error(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process message.")

def generate_response(prompt):
    tokenizer = AutoTokenizer.from_pretrained(FINE_TUNED_MODEL_PATH)
    model = AutoModelForCausalLM.from_pretrained(FINE_TUNED_MODEL_PATH).to(device)
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model.generate(**inputs, max_length=500, temperature=0.7, top_p=0.95)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)
# -----------------------------------------------------------------------------
# RUN FASTAPI SERVER
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run("agent:app", host="0.0.0.0", port=5000, reload=True)
