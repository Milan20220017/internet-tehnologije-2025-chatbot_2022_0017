import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Reserve from "./pages/Reserve.jsx";
import MyAppointments from "./pages/MyAppointments.jsx";
import { useAuth } from "./context/AuthContext.jsx"; // prilagodi ako ti je /contexts/
import Navbar from "./components/Navbar";
import FloatingChat from "./components/FloatingChat";
import Branches from "./pages/Branches.jsx";


function Protected({ children }) {
  const { isLoading, isAuthed } = useAuth();

  if (isLoading) return <div className="container"><div className="card">Učitavanje...</div></div>;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="page">
      <Navbar />

      <div className="container py-4">
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
            path="/branches"
            element={
              <Protected>
                <Branches />
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

          <Route path="*" element={<div className="card">404</div>} />
        </Routes>
      </div>

      <FloatingChat />
    </div>
  );
}
