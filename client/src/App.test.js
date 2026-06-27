/**
 * App smoke test — verifies the top-level component renders without crashing.
 *
 * The stale "renders learn react link" test has been removed because the app
 * no longer uses Create-React-App's starter template. Auth is mocked so no
 * real network calls are made during tests.
 */

// Manual axios mock must be declared before any import that reads axios.
jest.mock("axios", () => ({
  get: jest.fn(() => Promise.reject({ response: { status: 401 } })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  defaults: { headers: { common: {} } },
  create: jest.fn(function () {
    return {
      get: jest.fn(() => Promise.reject({ response: { status: 401 } })),
      post: jest.fn(() => Promise.resolve({ data: {} })),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    };
  }),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
}));

jest.mock("js-cookie", () => ({
  get: jest.fn(() => null),
  set: jest.fn(),
  remove: jest.fn(),
}));

import React from "react";
import { render } from "@testing-library/react";
import App from "./App";

describe("App smoke test", () => {
  test("renders without crashing (unauthenticated state)", () => {
    // Should not throw even with mocked/unavailable backend
    expect(() => render(<App />)).not.toThrow();
  });

  test("App default export is a React component", () => {
    expect(typeof App).toBe("function");
  });
});
