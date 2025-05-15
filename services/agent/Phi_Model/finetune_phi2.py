import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments, DataCollatorForLanguageModeling
from datasets import load_dataset

# === Config ===
model_name = "microsoft/phi-2"
dataset_path = "../financial_finetune.json"

# === Load tokenizer ===
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Fix: Add pad_token if missing
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

# === Load model ===
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float32,
    device_map={"": 0}
)
model.config.pad_token_id = tokenizer.pad_token_id

# === Freeze all layers ===
for param in model.model.parameters():
    param.requires_grad = False

# === Unfreeze last 2 layers
for i in [-1, -2]:
    for param in model.model.layers[i].parameters():
        param.requires_grad = True

# === Unfreeze final layernorm and lm_head
for param in model.model.final_layernorm.parameters():
    param.requires_grad = True
for param in model.lm_head.parameters():
    param.requires_grad = True

# === Load and format dataset ===
def format_prompt(example):
    prompt = f"### Instruction:\n{example['instruction']}\n\n### Response:\n{example['output']}"
    return tokenizer(prompt, padding="max_length", truncation=True, max_length=512)

dataset = load_dataset("json", data_files={"train": dataset_path})
tokenized_dataset = dataset["train"].map(format_prompt)

# === Data collator ===
data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

# === Training arguments (adjusted for low memory) ===
training_args = TrainingArguments(
    output_dir="./phi2-finetuned",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    num_train_epochs=3,
    learning_rate=2e-5,
    fp16=False,  # Disabled for stability on 4GB GPU
    logging_dir="./logs",
    save_strategy="epoch",
    save_total_limit=2,
    evaluation_strategy="no",
    report_to="none"
)

# === Trainer ===
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
    tokenizer=tokenizer,
    data_collator=data_collator
)

# === Train ===
trainer.train()

# === Save final model ===
trainer.save_model("./phi2-finetuned")
tokenizer.save_pretrained("./phi2-finetuned")
