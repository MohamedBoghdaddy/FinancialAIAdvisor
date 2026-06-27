/**
 * Regression tests for the voice command execute controller.
 *
 * Covers QA spec items:
 *   24  Low-risk voice command executes with navigation response
 *   25  Medium-risk command requires confirmation
 *   26  High-risk command is always blocked
 *   27  Forbidden command is blocked
 *   28  Voice command execution is audit logged
 *
 * Tests run without a real MongoDB or external LLM service.
 */

jest.mock("../utils/auditLog.js", () => ({
  recordAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../config/env.js", () => ({
  env: {
    JWT_SECRET: "test-secret",
    NODE_ENV: "test",
    isProduction: false,
    FLASK_API_BASE_URL: "http://localhost:8000",
  },
}));

// We import the REAL voiceIntents so the intent registry is accurate
// (no mocking needed — it has no side effects)

import { executeVoiceCommand } from "../controller/voiceController.js";
import { recordAuditLog } from "../utils/auditLog.js";

// Helper: build mock req/res
const makeReq = (body, user = { _id: "user123" }) => ({ body, user });
const makeRes = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());


// ── Regression 24: Low-risk intent executes ───────────────────────────────

test("low-risk navigate_dashboard executes and returns route", async () => {
  const req = makeReq({ intent: "navigate_dashboard" });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const body = res.json.mock.calls[0][0];
  expect(body.success).toBe(true);
  expect(body.data.status).toBe("executed");
  expect(body.data.route).toBe("/dashboard");
});

test("low-risk view_balance executes", async () => {
  const req = makeReq({ intent: "view_balance" });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json.mock.calls[0][0].data.status).toBe("executed");
});


// ── Regression 25: Medium-risk requires confirmation ─────────────────────

test("medium-risk intent without confirmed=true returns confirmation_required", async () => {
  const req = makeReq({ intent: "update_profile_preference", confirmed: false });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const body = res.json.mock.calls[0][0];
  expect(body.data.status).toBe("confirmation_required");
});

test("medium-risk intent with confirmed=true executes", async () => {
  const req = makeReq({ intent: "update_profile_preference", confirmed: true });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  const body = res.json.mock.calls[0][0];
  expect(body.data.status).toBe("executed");
});


// ── Regression 26 & 27: Forbidden intents are always blocked ─────────────

test("transfer_funds is blocked with 403", async () => {
  const req = makeReq({ intent: "transfer_funds" });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json.mock.calls[0][0].success).toBe(false);
});

test("change_password is blocked with 403", async () => {
  const req = makeReq({ intent: "change_password" });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(res.status).toHaveBeenCalledWith(403);
});

test("delete_account is blocked with 403", async () => {
  const req = makeReq({ intent: "delete_account" });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(res.status).toHaveBeenCalledWith(403);
});

test("buy_asset is blocked with 403", async () => {
  const req = makeReq({ intent: "buy_asset" });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(res.status).toHaveBeenCalledWith(403);
});

test("forbidden_action generic is blocked with 403", async () => {
  const req = makeReq({ intent: "forbidden_action" });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(res.status).toHaveBeenCalledWith(403);
});

test("unknown intent returns 400", async () => {
  const req = makeReq({ intent: "completely_made_up_intent" });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
});

test("missing intent field returns 400", async () => {
  const req = makeReq({});
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
});


// ── Regression 28: Audit log is written ──────────────────────────────────

test("executed low-risk intent writes an audit log entry", async () => {
  const req = makeReq({ intent: "navigate_dashboard" }, { _id: "user-audit-test" });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(recordAuditLog).toHaveBeenCalled();
  const logCall = recordAuditLog.mock.calls[0][0];
  expect(logCall.action).toBe("voice_execute");
  expect(logCall.userId).toBe("user-audit-test");
});

test("blocked forbidden intent writes a high-risk audit log", async () => {
  const req = makeReq({ intent: "transfer_funds" }, { _id: "attacker-id" });
  const res = makeRes();

  await executeVoiceCommand(req, res);

  expect(recordAuditLog).toHaveBeenCalled();
  const logCall = recordAuditLog.mock.calls[0][0];
  expect(logCall.action).toBe("voice_execute_blocked");
  expect(logCall.riskLevel).toBe("high");
});
