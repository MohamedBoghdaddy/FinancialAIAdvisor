
import React from "react";

const FinancialReport = ({ data }) => {
  if (!data?.output) return <p>No data available.</p>;

  let parsedOutput;

  try {
    const cleaned = typeof data.output === "string"
      ? data.output
          .replace(/^```json/, "")
          .replace(/```$/, "")
          .replace(/\\n/g, "\n")
          .trim()
      : data.output;

    parsedOutput = typeof cleaned === "string" ? JSON.parse(cleaned) : cleaned;
  } catch (err) {
    console.error("❌ Failed to parse AI response:", err);
    return <p>Invalid response format from AI.</p>;
  }

  const { summary, advice } = parsedOutput;

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 shadow-2xl p-10 mt-12 rounded-3xl border border-gray-300 max-w-5xl mx-auto space-y-10 animate-fade-in">
      
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-800 mb-2 flex items-center justify-center gap-2">
          📊 AI Financial Report
        </h1>
        <p className="text-gray-500 text-md">Personalized insights powered by AI</p>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-xl shadow-inner">
        <h2 className="text-2xl font-semibold text-blue-700 mb-3 flex items-center gap-2">
          💡 Summary
        </h2>
        <textarea
          className="w-full p-4 border border-blue-200 rounded-md resize-none bg-white text-gray-800 font-medium leading-relaxed shadow-sm"
          value={summary}
          readOnly
          rows="5"
        />
      </div>

      {/* Recommendations */}
      <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-xl shadow-inner">
        <h2 className="text-2xl font-semibold text-green-700 mb-4 flex items-center gap-2">
          ✅ Recommendations
        </h2>
        <div className="space-y-6">
          {Array.isArray(advice) && advice.length > 0 ? (
            advice.map((tip, idx) => {
              // Remove "Tip X -" prefix from the content
              const cleanedTip = tip.replace(/^Tip\s*\d+\s*-\s*/i, "").trim();
              return (
                <div key={idx}>
                  <label className="block text-base font-semibold text-gray-700 mb-1">
                    Tip {idx + 1}
                  </label>
                  <textarea
                    className="w-full p-4 border border-green-200 rounded-md resize-none bg-white text-gray-700 shadow-sm"
                    value={cleanedTip}
                    readOnly
                    rows="3"
                  />
                </div>
              );
            })
          ) : (
            <p className="text-red-500 font-semibold">No advice available.</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-sm text-gray-400 italic text-center pt-4 border-t">
        Last updated by <span className="text-green-600 font-semibold">FinWise Assistant 🌿</span>
      </div>
    </div>
  );
};

export default FinancialReport;
