import mongoose from "mongoose";

const questionnaireSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the user
  age: { type: Number, required: true },
  employmentStatus: { type: String, required: true },
  homeOwnership: { type: String, required: true },
  hasDebt: { type: String, required: true },
  lifestyle: { type: String, required: true },
  riskTolerance: { type: String, required: true },
  dependents: { type: String, required: true },
  financialGoals: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Questionnaire = mongoose.model("Questionnaire", questionnaireSchema);

export default Questionnaire;
