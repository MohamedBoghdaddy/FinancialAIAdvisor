import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: { type: String, required: true },
    nid: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    income: { type: Number }, // New field for Monthly Income
    financialGoals: { type: String }, // New field for Financial Goals
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    receiveNotifications: {
      type: Boolean,
      default: true,
    },
    profilePhoto: {
      type: String,
    },
    cvFileName: {
      type: String,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

export default User;
