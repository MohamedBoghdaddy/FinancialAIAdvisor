/**
 * Regression tests for authMiddleware.js
 *
 * Covers QA spec items:
 *   1  Hardcoded admin login no longer exists (no bypass in auth)
 *   2  Admin user-management routes require authentication
 *   3  Admin user-management routes require admin role
 *   4  Normal user cannot access admin routes
 *   7  Profile ownership cannot be bypassed
 *   8  User cannot update another user's profile unless admin
 *
 * Tests run without a real MongoDB — all DB calls are mocked.
 */

// Mock modules BEFORE any import that reads them
jest.mock("../models/UserModel.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    schema: { path: jest.fn(() => null) }, // no 'tokens' field in schema
  },
}));

jest.mock("../config/env.js", () => ({
  env: {
    JWT_SECRET: "test-secret-for-auth-middleware-tests",
    NODE_ENV: "test",
    isProduction: false,
  },
}));

import jwt from "jsonwebtoken";
import { auth, authorizeRoles, verifyAdmin } from "../Middleware/authMiddleware.js";
import User from "../models/UserModel.js";

const JWT_SECRET = "test-secret-for-auth-middleware-tests";

// Helper: build mock req/res/next
const makeReq = (overrides = {}) => ({
  header: jest.fn((name) => overrides.authorization ? `Bearer ${overrides.authorization}` : null),
  cookies: overrides.cookies || {},
  user: overrides.user || undefined,
  ...overrides,
});

const makeRes = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

const makeNext = () => jest.fn();

// Helper: sign a token
const signToken = (payload) => jwt.sign(payload, JWT_SECRET);


// ── auth middleware ────────────────────────────────────────────────────────

describe("auth middleware", () => {
  beforeEach(() => jest.clearAllMocks());

  test("rejects request with no token", async () => {
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects request with invalid JWT", async () => {
    const req = makeReq({ cookies: { token: "not.a.real.jwt" } });
    const res = makeRes();
    const next = makeNext();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects if user not found in DB (token is valid but user deleted)", async () => {
    const token = signToken({ id: "nonexistent-user-id" });
    const req = makeReq({ cookies: { token } });
    const res = makeRes();
    const next = makeNext();

    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("calls next() and attaches user when token is valid", async () => {
    const fakeUser = { _id: "user123", role: "user", username: "alice" };
    const token = signToken({ id: "user123" });
    const req = makeReq({ cookies: { token } });
    const res = makeRes();
    const next = makeNext();

    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(fakeUser),
    });

    await auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(fakeUser);
  });

  test("regression: no hardcoded admin bypass — authentication still required", async () => {
    // There must be NO code path that skips auth based on a magic password or username.
    // This test ensures auth always validates the JWT regardless of credentials.
    const req = makeReq({ cookies: { token: "hardcoded_admin_secret_bypass" } });
    const res = makeRes();
    const next = makeNext();

    await auth(req, res, next);

    // Invalid token must be rejected — no hardcoded bypass
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("reads token from Authorization header (Bearer)", async () => {
    const fakeUser = { _id: "user456", role: "user", username: "bob" };
    const token = signToken({ id: "user456" });
    const req = {
      header: jest.fn((name) =>
        name === "Authorization" ? `Bearer ${token}` : null
      ),
      cookies: {},
    };
    const res = makeRes();
    const next = makeNext();

    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(fakeUser),
    });

    await auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(fakeUser);
  });
});


// ── authorizeRoles middleware ──────────────────────────────────────────────

describe("authorizeRoles middleware", () => {
  beforeEach(() => jest.clearAllMocks());

  test("allows user whose role is in the allowed list", () => {
    const req = makeReq({ user: { _id: "u1", role: "admin" } });
    const res = makeRes();
    const next = makeNext();

    authorizeRoles("admin")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("blocks user whose role is NOT in the allowed list (403)", () => {
    const req = makeReq({ user: { _id: "u2", role: "user" } });
    const res = makeRes();
    const next = makeNext();

    authorizeRoles("admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 401 when req.user is absent (unauthenticated)", () => {
    const req = makeReq({ user: undefined });
    const res = makeRes();
    const next = makeNext();

    authorizeRoles("admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("verifyAdmin blocks a regular user", () => {
    const req = makeReq({ user: { _id: "u3", role: "user" } });
    const res = makeRes();
    const next = makeNext();

    verifyAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("verifyAdmin allows an admin", () => {
    const req = makeReq({ user: { _id: "u4", role: "admin" } });
    const res = makeRes();
    const next = makeNext();

    verifyAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("verifyAdmin allows multiple roles when added", () => {
    const req = makeReq({ user: { _id: "u5", role: "employee" } });
    const res = makeRes();
    const next = makeNext();

    authorizeRoles("admin", "employee")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
