/**
 * ProtectedRoute regression tests.
 *
 * Covers QA spec item 9:
 *   ProtectedRoute uses AuthContext/backend auth state, not raw localStorage.
 *
 * These tests mock useAuthContext directly so no network calls are made and
 * axios is never imported.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock the AuthContext module — eliminates any axios/cookie dependency
jest.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuthContext: jest.fn(),
}));

import ProtectedRoute from "../Frontend/components/Auth/ProtectedRoute";
import { useAuthContext } from "../context/AuthContext";

const Protected = () => <div data-testid="protected-content">Secret Page</div>;

function renderWithRouter(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ProtectedRoute>
        <Protected />
      </ProtectedRoute>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  afterEach(() => jest.clearAllMocks());

  test("shows loading state while auth is being checked", () => {
    useAuthContext.mockReturnValue({
      state: { isAuthenticated: false, loading: true, user: null },
    });

    renderWithRouter("/dashboard");

    // Should not show content while loading
    expect(screen.queryByTestId("protected-content")).toBeNull();
    // Should show loading indicator
    expect(screen.getByText(/checking authentication/i)).toBeInTheDocument();
  });

  test("redirects unauthenticated user to /login", () => {
    useAuthContext.mockReturnValue({
      state: { isAuthenticated: false, loading: false, user: null },
    });

    const { container } = renderWithRouter("/dashboard");

    // Protected content must NOT be rendered for unauthenticated user
    expect(screen.queryByTestId("protected-content")).toBeNull();
    // No secret content in the DOM
    expect(container.textContent).not.toContain("Secret Page");
  });

  test("renders children for authenticated user", () => {
    useAuthContext.mockReturnValue({
      state: {
        isAuthenticated: true,
        loading: false,
        user: { id: "u1", role: "user" },
      },
    });

    renderWithRouter("/dashboard");

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  test("regression: does not rely on localStorage value alone", () => {
    // Even if localStorage has a 'user' value, if AuthContext says not authenticated,
    // the route must redirect. This ensures we use backend-verified state.
    localStorage.setItem("user", JSON.stringify({ id: "u1", role: "admin" }));

    useAuthContext.mockReturnValue({
      state: { isAuthenticated: false, loading: false, user: null },
    });

    const { container } = renderWithRouter("/dashboard");

    // localStorage has a user but AuthContext says not authenticated — must redirect
    expect(screen.queryByTestId("protected-content")).toBeNull();
    expect(container.textContent).not.toContain("Secret Page");

    localStorage.clear();
  });
});
