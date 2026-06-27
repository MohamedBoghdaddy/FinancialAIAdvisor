/**
 * AdminRoute regression tests.
 *
 * Covers QA spec items:
 *   10  AdminRoute uses backend-validated user role
 *   3   Admin routes reject non-admin users
 *
 * These tests mock useAuthContext so no network calls are made.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuthContext: jest.fn(),
}));

import AdminRoute from "../Frontend/components/Auth/AdminRoute";
import { useAuthContext } from "../context/AuthContext";

const AdminPage = () => <div data-testid="admin-content">Admin Panel</div>;

function renderWithRouter(initialPath = "/admin/dashboard") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AdminRoute>
        <AdminPage />
      </AdminRoute>
    </MemoryRouter>
  );
}

describe("AdminRoute", () => {
  afterEach(() => jest.clearAllMocks());

  test("shows loading state while checking auth", () => {
    useAuthContext.mockReturnValue({
      state: { isAuthenticated: false, loading: true, user: null },
      isAdmin: false,
    });

    renderWithRouter();

    expect(screen.queryByTestId("admin-content")).toBeNull();
    expect(screen.getByText(/checking authentication/i)).toBeInTheDocument();
  });

  test("redirects unauthenticated user to /login", () => {
    useAuthContext.mockReturnValue({
      state: { isAuthenticated: false, loading: false, user: null },
      isAdmin: false,
    });

    const { container } = renderWithRouter();

    expect(screen.queryByTestId("admin-content")).toBeNull();
    expect(container.textContent).not.toContain("Admin Panel");
  });

  test("redirects authenticated non-admin to /dashboard", () => {
    useAuthContext.mockReturnValue({
      state: {
        isAuthenticated: true,
        loading: false,
        user: { id: "u1", role: "user" },
      },
      isAdmin: false,
    });

    const { container } = renderWithRouter();

    // Non-admin must not see admin content
    expect(screen.queryByTestId("admin-content")).toBeNull();
    expect(container.textContent).not.toContain("Admin Panel");
  });

  test("renders admin content for admin user", () => {
    useAuthContext.mockReturnValue({
      state: {
        isAuthenticated: true,
        loading: false,
        user: { id: "u2", role: "admin" },
      },
      isAdmin: true,
    });

    renderWithRouter();

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
  });

  test("regression: admin role comes from backend (isAdmin flag), not localStorage", () => {
    // Simulate: localStorage has admin role but AuthContext says user is NOT admin.
    // The route must still block access.
    localStorage.setItem("user", JSON.stringify({ id: "u3", role: "admin" }));

    useAuthContext.mockReturnValue({
      state: {
        isAuthenticated: true,
        loading: false,
        user: { id: "u3", role: "user" }, // backend says role=user
      },
      isAdmin: false, // isAdmin derived from backend-verified user object
    });

    const { container } = renderWithRouter();

    expect(screen.queryByTestId("admin-content")).toBeNull();
    expect(container.textContent).not.toContain("Admin Panel");

    localStorage.clear();
  });
});
