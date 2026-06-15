/**
 * Registry of voice/text command intents recognized by FinGenie.
 *
 * Risk levels:
 *  - low: read-only / navigation actions, executed immediately
 *  - medium: changes app-level settings, requires explicit confirmation
 *  - high: money movement, trades, account/privilege changes - always
 *    blocked. FinGenie never executes these via voice.
 *
 * `route` is a frontend path the client can navigate to for "low" intents
 * that simply open a page.
 */
export const VOICE_INTENTS = {
  navigate_dashboard: { riskLevel: "low", route: "/dashboard" },
  navigate_health_score: { riskLevel: "low", route: "/health-score" },
  navigate_scam_checker: { riskLevel: "low", route: "/scam-checker" },
  navigate_security_center: { riskLevel: "low", route: "/security-center" },
  navigate_scenario_simulator: { riskLevel: "low", route: "/scenario-simulator" },
  navigate_model_metrics: { riskLevel: "low", route: "/model-metrics" },
  view_profile: { riskLevel: "low", route: "/profile" },
  view_balance: { riskLevel: "low", route: "/dashboard" },
  view_spending: { riskLevel: "low", route: "/finance" },

  update_profile_preference: { riskLevel: "medium" },
};

// Forbidden no matter what - never executed via voice, regardless of
// confirmation. Matches agent/qwen/safety.py's FORBIDDEN_ACTION_KEYWORDS.
export const FORBIDDEN_INTENTS = new Set([
  "forbidden_action",
  "transfer_funds",
  "send_money",
  "buy_asset",
  "sell_asset",
  "withdraw_funds",
  "delete_account",
  "delete_user",
  "change_admin_privileges",
  "change_password",
  "reset_password",
]);

export const getIntentConfig = (intent) => VOICE_INTENTS[intent];
