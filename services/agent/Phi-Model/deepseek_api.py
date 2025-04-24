from flask import Flask, request, jsonify
import openai
import os
import json

app = Flask(__name__)

# ✅ Use your actual DeepSeek API key here
api_key = 
openai_client = openai.OpenAI(
    api_key=api_key,
    base_url="https://api.deepseek.com/v1"  # ✅ Must include /v1
)

@app.route("/generate", methods=["POST"])
def generate():
    try:
        data = request.get_json()
        instruction = data.get("instruction", "")
        user_input = data.get("input", {})

        prompt = (
            f"### Instruction:\n{instruction}\n\n"
            f"### Input:\n{json.dumps(user_input, indent=2)}\n\n"
            "### Response:\n"
            "Start with a summary paragraph about the user's financial habits, then provide actionable advice prefixed by 'Answer:'"
        )

        # ✅ Use the new style with .chat.completions.create
        response = openai_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a helpful financial assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )

        result = response.choices[0].message.content
        return jsonify({"output": result})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001)
