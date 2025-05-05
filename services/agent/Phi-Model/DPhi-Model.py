from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from peft import PeftModel
import torch
import requests
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Financial AI Agent")

# === CORS Setup ===
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Load Fine-Tuned Phi-2 with LoRA ===
try:
    base_model = AutoModelForCausalLM.from_pretrained(
        "microsoft/phi-2", device_map="auto", torch_dtype=torch.float16
    )
    model = PeftModel.from_pretrained(base_model, "./phi2-finetuned")
    tokenizer = AutoTokenizer.from_pretrained("./phi2-finetuned")
    tokenizer.pad_token = tokenizer.eos_token
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Model loading failed: {str(e)}")

generator = pipeline("text-generation", model=model, tokenizer=tokenizer)

class Prompt(BaseModel):
    instruction: str

def fetch_questionnaire_data():
    try:
        response = requests.get("http://localhost:4000/api/questionnaire/latest")
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to fetch questionnaire: {response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching questionnaire: {str(e)}")

@app.post("/chat")
def generate_response(data: Prompt):
    try:
        print(f"Received instruction: {data.instruction}")
        questionnaire = fetch_questionnaire_data()

        # Format questionnaire nicely
        questionnaire_formatted = "\n".join([
            f"{key.upper()}: {value}" for key, value in questionnaire.items()
        ])

        # Prompt designed to first analyze the profile and then answer the question
        prompt = f"""
You are a financial AI assistant. You will be shown a user's financial profile and a user query.
First, analyze the user's profile. Then answer the user's instruction based on the analysis.

### User Financial Profile:
{questionnaire_formatted}

### User Instruction:
{data.instruction}

### AI Response:
"""

        output = generator(prompt, max_new_tokens=300, do_sample=True, temperature=0.7)
        response_text = output[0]["generated_text"].replace(prompt.strip(), "").strip()
        return {"response": response_text}

    except Exception as e:
        print(f"Error generating response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")
