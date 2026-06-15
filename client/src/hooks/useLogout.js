import { useCallback } from "react";
import { useAuthContext } from "../context/AuthContext";

export const useLogout = () => {
  const { logout } = useAuthContext();

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  return { logout: handleLogout };
};
