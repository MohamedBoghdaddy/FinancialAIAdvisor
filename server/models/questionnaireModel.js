import mongoose from "mongoose";

const questionnaireSchema = new mongoose.Schema({
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

const questionnaireModel = mongoose.model(
  "questionnaireModel",
  questionnaireSchema
);

export default questionnaireModel;