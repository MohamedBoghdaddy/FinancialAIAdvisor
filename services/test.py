import os
from transformers import AutoTokenizer, AutoModelForCausalLM

model_path = os.path.abspath("services/agent/Phi-Model/phi2-finetuned-LM/phi2-finetuned-LM")

# 👇 print useful debug info
print("Path:", model_path)
print("Exists:", os.path.exists(model_path))
print("Contents:", os.listdir(model_path))

# Try loading model
tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
model = AutoModelForCausalLM.from_pretrained(model_path, local_files_only=True)

print("✅ Model and tokenizer loaded successfully.")
