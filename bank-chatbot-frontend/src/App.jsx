import React from "react";
import { Navigate, Route, Routes, Link } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Reserve from "./pages/Reserve.jsx";
import MyAppointments from "./pages/MyAppointments.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import FloatingChat from "./components/FloatingChat";


function Protected({ children }) {
  const { isLoading, isAuthed } = useAuth();

  if (isLoading) return <div style={{ padding: 24 }}>Učitavanje...</div>;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

function TopNav() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 12, borderBottom: "1px solid #ddd", display: "flex", gap: 12, alignItems: "center" }}>
      <Link to="/reserve">Rezerviši</Link>
      <Link to="/my-appointments">Moji termini</Link>
      <div style={{ marginLeft: "auto" }}>
        {user ? (
          <>
            <span style={{ marginRight: 12 }}>Ulogovan: {user.username}</span>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ marginRight: 12 }}>Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <TopNav />
      <Routes>
        <Route path="/" element={<Navigate to="/reserve" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/reserve"
          element={
            <Protected>
              <Reserve />
            </Protected>
          }
        />
        <Route
          path="/my-appointments"
          element={
            <Protected>
              <MyAppointments />
            </Protected>
          }
        />

        <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />
      </Routes>

      {/* Chat kao widget u dnu */}
      <FloatingChat />

    </div>
  );
}
