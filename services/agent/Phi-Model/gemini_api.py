
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import json

app = Flask(__name__)

# Enable CORS for localhost:3000
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# ✅ Configure Gemini
genai.configure(api_key="")
model = genai.GenerativeModel("gemini-1.5-flash")

@app.route("/generate", methods=["POST"])
def generate():
    try:
        print("✅ /generate endpoint called")

        user_input = request.get_json()

        # Extract fields
        income = user_input.get("income", "0")
        rent = user_input.get("rent", "0")
        utilities = user_input.get("utilities", "0")
        diet = user_input.get("dietPlan", "Not Provided")
        transport = user_input.get("transportCost", "0")
        recurring = user_input.get("otherRecurring", "None")
        savings = user_input.get("savingAmount", "0")
        custom_expenses = user_input.get("customExpenses", [])

        # Build structured prompt
        prompt = (
            "You are a professional financial advisor AI.\n"
            "Analyze this user's financial data and provide:\n"
            "1. A short summary\n"
            "2. 6 personalized advice tips\n\n"
            "User Profile:\n"
            f"- Total Monthly Income: {income} EGP\n"
            f"- Rent or Mortgage: {rent} EGP\n"
            f"- Utilities: {utilities} EGP\n"
            f"- Diet Plan: {diet}\n"
            f"- Transportation Cost: {transport} EGP\n"
            f"- Other Recurring Expenses: {recurring}\n"
            f"- Monthly Savings: {savings} EGP\n"
            "Custom Expenses:\n" +
            "".join([f"  - {e.get('name', '')}: {e.get('amount', '')} EGP\n" for e in custom_expenses]) +
            "\n\nRespond ONLY in valid JSON using this format:\n"
            '{\n'
            '  "summary": "Short financial overview...",\n'
            '  "advice": [\n'
            '    "Tip 1 - ...",\n'
            '    "Tip 2 - ...",\n'
            '    "Tip 3 - ...",\n'
            '    "Tip 4 - ...",\n'
            '    "Tip 5 - ...",\n'
            '    "Tip 6 - ..."\n'
            '  ]\n'
            '}\n'
            "Only respond with valid JSON. No extra words before or after."
        )

        # Generate response
        try:
            response = model.generate_content(prompt)
            result_text = response.text
            print("🧠 RAW GEMINI RESPONSE:\n", result_text)
        except Exception as model_error:
            print("❌ Gemini model error:", model_error)
            return jsonify({"error": "Gemini model failed"}), 500

        # Try to parse JSON directly
        try:
            cleaned = result_text.strip().removeprefix("```json").removesuffix("```").strip()
            result_json = json.loads(cleaned)
            return jsonify(result_json)
        except json.JSONDecodeError as parse_err:
            print("⚠️ Failed to parse as JSON:", parse_err)
            return jsonify({"output": result_text})  # fallback

    except Exception as e:
        print("❌ Server Error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001)
