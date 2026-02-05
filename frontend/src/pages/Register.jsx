import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api/auth";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function onChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (form.password !== form.password2) {
      setErr("Lozinke se ne poklapaju.");
      return;
    }

    try {
      setLoading(true);
      await registerUser(form);
      nav("/login");
    } catch (e) {
      const data = e?.response?.data;
      if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : String(data[firstKey]);
        setErr(msg || "Greška pri registraciji.");
      } else {
        setErr("Greška pri registraciji.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, padding: 24 }}>
      <h2>Registracija</h2>

      {err ? <p style={{ color: "tomato" }}>{err}</p> : null}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          name="username"
          placeholder="Korisničko ime"
          value={form.username}
          onChange={onChange}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={onChange}
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Lozinka"
          value={form.password}
          onChange={onChange}
          required
        />
        <input
          name="password2"
          type="password"
          placeholder="Potvrdi lozinku"
          value={form.password2}
          onChange={onChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Kreiram nalog..." : "Registruj se"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        Već imaš nalog? <Link to="/login">Uloguj se</Link>
      </p>
    </div>
  );
}
