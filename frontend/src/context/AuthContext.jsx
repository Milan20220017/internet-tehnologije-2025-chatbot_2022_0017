import  { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, logoutUser } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasToken = !!localStorage.getItem("access"); // pretvaranje u boolean

  async function refreshUser() {
    try {
      const me = await fetchMe();// dohvaćanje podataka o korisniku
      setUser(me);
    } catch (e) {
      setUser(null);
      logoutUser(); 
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (hasToken) refreshUser();
    else setIsLoading(false);
  }, []);

  function logout() {
    logoutUser();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      setUser,
      isLoading,
      isAuthed: !!user,     
      hasToken,             
      refreshUser,
      logout,
    }),
    [user, isLoading, hasToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;// pružanje konteksta djeci
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
