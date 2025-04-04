from fastapi import FastAPI, Request
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from peft import PeftModel
import torch

app = FastAPI(title="Financial AI Agent")

# === Load fine-tuned Phi-2 with LoRA ===
base_model = AutoModelForCausalLM.from_pretrained("microsoft/phi-2", device_map="auto", torch_dtype=torch.float16)
model = PeftModel.from_pretrained(base_model, "./phi2-finetuned")
tokenizer = AutoTokenizer.from_pretrained("./phi2-finetuned")
tokenizer.pad_token = tokenizer.eos_token

# === Inference pipeline ===
generator = pipeline("text-generation", model=model, tokenizer=tokenizer)

# === Request body ===
class Prompt(BaseModel):
    instruction: str

@app.post("/generate")
def generate_response(data: Prompt):
    prompt = f"### Instruction:\n{data.instruction}\n\n### Response:\n"
    output = generator(prompt, max_new_tokens=200, do_sample=True, temperature=0.7)
    return {"response": output[0]["generated_text"].replace(prompt, "").strip()}