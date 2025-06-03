# services/agent/Phi_Model/phi2_loader.py

import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel



BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, "services", "agent", "Phi_Model", "phi2-finetuned")
OFFLOAD_DIR = os.path.join(BASE_DIR, "offload")

os.makedirs(OFFLOAD_DIR, exist_ok=True)

print("🚀 Loading base Phi-2 model...")
base_model = AutoModelForCausalLM.from_pretrained(
    "microsoft/phi-2",
    device_map="auto",
    torch_dtype=torch.float16,
    offload_folder=OFFLOAD_DIR,
)

print("🔗 Applying LoRA adapter...")
model = PeftModel.from_pretrained(
    base_model,
    MODEL_PATH,
    device_map="auto",
    offload_folder=OFFLOAD_DIR,
)

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
tokenizer.pad_token = tokenizer.eos_token
model.eval()

print("✅ Phi-2 model fully loaded and ready.")

__all__ = ["model", "tokenizer"]
