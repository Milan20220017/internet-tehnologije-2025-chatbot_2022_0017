import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const { refreshUser } = useAuth();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const data = await loginUser({ username, password });
      localStorage.setItem("accessToken", data.access);
      localStorage.setItem("refreshToken", data.refresh);

      await refreshUser();// osvežavanje podataka o korisniku nakon uspešne prijave
      nav("/reserve");// preusmeravanje na stranicu rezervacije nakon uspešne prijave
    } catch (e2) {
      setErr("Neuspešna prijava. Proveri username i lozinku.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "32px auto", padding: 16 }}>
      <h2>Prijava</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          placeholder="Lozinka"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {err && <div style={{ color: "crimson" }}>{err}</div>}

        <button disabled={loading || !username || !password} type="submit">
          {loading ? "Prijava..." : "Uloguj se"}
        </button>
      </form>
    </div>
  );
}
