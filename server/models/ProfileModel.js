import mongoose from "mongoose";

const CustomExpenseSchema = new mongoose.Schema({
  name: String,
  amount: Number,
});

const ProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: String,
    email: String,
    income: String,
    financialGoals: String,
    age: String,
    occupation: String,
    rent: String,
    utilities: String,
    dietPlan: String,
    transportCost: String,
    otherRecurring: String,
    savingAmount: String,
    customExpenses: [CustomExpenseSchema],
    employmentStatus: String,
    salary: String,
    homeOwnership: String,
    hasDebt: String,
    lifestyle: String,
    riskTolerance: Number,
    investmentApproach: Number,
    emergencyPreparedness: Number,
    financialTracking: Number,
    futureSecurity: Number,
    spendingDiscipline: Number,
    assetAllocation: Number,
    riskTaking: Number,
    dependents: String,
  },
  { timestamps: true }
);

const Profile = mongoose.model("Profile", ProfileSchema);
export default Profile;
