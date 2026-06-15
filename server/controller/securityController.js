import AuditLog from "../models/AuditLogModel.js";
import User from "../models/UserModel.js";

// Look-back window for "recent" activity used by the account score.
const RECENT_WINDOW_DAYS = 30;

/**
 * GET /api/security/account-score
 * Deterministic security score (0-100) for the authenticated user's
 * account, based on signals already stored on the user/audit log.
 */
export const getAccountScore = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = req.user;

    const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const recentFailedLogins = await AuditLog.countDocuments({
      userId,
      action: "failed_login",
      createdAt: { $gte: since },
    });

    const factors = [];
    let score = 100;

    if (user.blocked) {
      score -= 50;
      factors.push({
        factor: "account_blocked",
        impact: -50,
        detail: "This account is currently blocked.",
      });
    }

    if (recentFailedLogins > 0) {
      const penalty = Math.min(30, recentFailedLogins * 5);
      score -= penalty;
      factors.push({
        factor: "recent_failed_logins",
        impact: -penalty,
        detail: `${recentFailedLogins} failed login attempt(s) in the last ${RECENT_WINDOW_DAYS} days.`,
      });
    }

    // Multi-factor authentication is not yet implemented; flag it as a
    // standing recommendation rather than a fabricated pass/fail.
    factors.push({
      factor: "mfa_enabled",
      impact: 0,
      detail: "Multi-factor authentication is not yet available for this account.",
    });

    score = Math.max(0, Math.min(100, score));

    let rating = "Good";
    if (score < 50) rating = "At Risk";
    else if (score < 80) rating = "Fair";

    res.status(200).json({
      success: true,
      data: {
        score,
        rating,
        factors,
        explanation:
          "Score starts at 100 and is reduced for account-level risk signals (blocked status, recent failed logins).",
        limitations: [
          "Does not measure password strength, since passwords are stored hashed.",
          "Multi-factor authentication is not yet implemented, so it cannot be scored.",
        ],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/security/audit-log
 * Paginated audit log entries for the authenticated user.
 */
export const getAuditLog = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

    const filter = { userId: req.user._id };

    const [entries, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: entries,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalEntries: total,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/security/admin/security-center
 * Admin-only aggregate security overview.
 */
export const getSecurityCenter = async (req, res) => {
  try {
    const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [blockedUsers, recentHighRiskEvents, recentFailedLogins, totalUsers] =
      await Promise.all([
        User.countDocuments({ blocked: true }),
        AuditLog.find({ riskLevel: "high", createdAt: { $gte: since } })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),
        AuditLog.countDocuments({ action: "failed_login", createdAt: { $gte: since } }),
        User.countDocuments({}),
      ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        blockedUsers,
        recentFailedLogins,
        recentHighRiskEvents,
        windowDays: RECENT_WINDOW_DAYS,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
