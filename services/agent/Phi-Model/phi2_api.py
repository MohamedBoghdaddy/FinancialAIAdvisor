from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM
import json

app = Flask(__name__)

model_id = "karimm-74/phi2-finetuned-LM"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id)

@app.route("/generate", methods=["POST"])
def generate():
    try:
        data = request.get_json()
        instruction = data.get("instruction", "")
        user_input = data.get("input", {})

        # ✅ Format the prompt with clear structure
        prompt = (
            f"### Instruction:\n{instruction}\n\n"
            f"### Input:\n{json.dumps(user_input, indent=2)}\n\n"
            "### Response:\n"
            "Start with a summary paragraph about the user's financial habits, then provide actionable advice prefixed by 'Answer:'."
        )

        inputs = tokenizer(prompt, return_tensors="pt")
        outputs = model.generate(
            **inputs,
            max_new_tokens=300,
            do_sample=True,
            temperature=0.7,
            top_p=0.95
        )

        result = tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Clean result to only show after ### Response:
        if "### Response:" in result:
            result = result.split("### Response:")[-1].strip()

        return jsonify({"output": result})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001)
