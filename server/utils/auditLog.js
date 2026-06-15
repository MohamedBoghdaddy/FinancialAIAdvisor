import AuditLog from "../models/AuditLogModel.js";

/**
 * Records a sensitive-action audit entry. Never throws — logging failures
 * must not break the request that triggered them.
 */
export const recordAuditLog = async ({
  userId = null,
  action,
  category,
  req = null,
  metadata = {},
  riskLevel = "low",
}) => {
  try {
    await AuditLog.create({
      userId,
      action,
      category,
      ip: req?.headers?.["x-forwarded-for"] || req?.ip,
      userAgent: req?.headers?.["user-agent"],
      metadata,
      riskLevel,
    });
  } catch (err) {
    console.error("⚠️ Failed to write audit log:", err.message);
  }
};

export default recordAuditLog;
