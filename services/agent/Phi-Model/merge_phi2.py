from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# Load the original base model (downloads once)
base_model = AutoModelForCausalLM.from_pretrained("microsoft/phi-2")

# Load your LoRA adapter (this is your fine-tuned part)
adapter_path = "services/agent/Phi-Model/phi2-finetuned-LM/phi2-finetuned-LM"
model = PeftModel.from_pretrained(base_model, adapter_path)

# Merge them together into one final model
model = model.merge_and_unload()

# Save the new merged model in one folder
output_path = "services/agent/Phi-Model/phi2-merged"
model.save_pretrained(output_path)

# Save tokenizer too
tokenizer = AutoTokenizer.from_pretrained(adapter_path)
tokenizer.save_pretrained(output_path)

print("✅ Model merged and saved to:", output_path)
