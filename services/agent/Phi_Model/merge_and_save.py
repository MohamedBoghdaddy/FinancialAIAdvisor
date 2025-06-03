from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import os
import torch

print("📦 Step 1: Loading base Phi-2 model...")

base_model = AutoModelForCausalLM.from_pretrained(
    "microsoft/phi-2",
    device_map="auto",                    # ✅ Automatically map to GPU if available
    torch_dtype=torch.float16,            # ✅ Use less memory (important!)
    trust_remote_code=True
)

print("🔗 Step 2: Loading LoRA adapter from ./phi2-finetuned")

peft_model = PeftModel.from_pretrained(
    base_model,
    "./phi2-finetuned",
    device_map="auto",                    # ✅ Also load adapters to GPU
    torch_dtype=torch.float16,
    trust_remote_code=True
)

print("🧠 Step 3: Merging weights into base model...")

merged_model = peft_model.merge_and_unload()

SAVE_PATH = "./phi2-finetuned-merged"
os.makedirs(SAVE_PATH, exist_ok=True)

print(f"💾 Step 4: Saving model to {SAVE_PATH}...")
merged_model.save_pretrained(SAVE_PATH)
AutoTokenizer.from_pretrained("microsoft/phi-2").save_pretrained(SAVE_PATH)

print("✅ Merged and saved clean model for fast loading.")
