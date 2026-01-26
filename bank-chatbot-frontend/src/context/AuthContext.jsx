import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, logoutUser } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthed = !!localStorage.getItem("accessToken");

  async function refreshUser() {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch (e) {
      // token invalid / expired
      setUser(null);
      logoutUser();
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthed) refreshUser();
    else setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    logoutUser();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, setUser, isLoading, isAuthed: !!user, refreshUser, logout }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

