import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "auth",
        "admin",
        "profile",
        "ai",
        "security",
        "voice",
        "account",
      ],
      required: true,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
export default AuditLog;
