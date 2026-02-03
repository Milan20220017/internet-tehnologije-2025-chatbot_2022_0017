import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Reserve from "./pages/Reserve.jsx";
import MyAppointments from "./pages/MyAppointments.jsx";
import Branches from "./pages/Branches.jsx";
import Navbar from "./components/Navbar";
import FloatingChat from "./components/FloatingChat";
import { useAuth } from "./context/AuthContext.jsx";
import EmployeeAppointments from "./pages/EmployeeAppointments.jsx";


/**
 * Osnovna zaštita: mora biti ulogovan
 */
function Protected({ children }) {
  const { isLoading, isAuthed } = useAuth();

  if (isLoading) {
    return (
      <div className="container">
        <div className="card">Učitavanje...</div>
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Role-based zaštita: dozvoli samo određenim rolama
 * allow = ["user"] | ["employee"] | ["admin"] | kombinacije
 */
function RoleProtected({ allow = [], children }) {
  const { isLoading, isAuthed, user } = useAuth();

  if (isLoading) {
    return (
      <div className="container">
        <div className="card">Učitavanje...</div>
      </div>
    );
  }

  if (!isAuthed || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allow.length > 0 && !allow.includes(user.role)) {
    return <Navigate to="/reserve" replace />;
  }

  return children;
}

export default function App() {
  return (
    <div className="page">
      <Navbar />

      <div className="container py-4">
        <Routes>
          {/* default */}
          <Route path="/" element={<Navigate to="/reserve" replace />} />

          {/* auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* USER rute */}
          <Route
            path="/reserve"
            element={
              <Protected>
                <Reserve />
              </Protected>
            }
          />
          <Route
            path="/employee"
            element={
              <RoleProtected allow={["employee"]}>
                <EmployeeAppointments />
              </RoleProtected>
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
              <RoleProtected allow={["user"]}>
                <MyAppointments />
              </RoleProtected>
            }
          />

          {/* EMPLOYEE ruta (za sada placeholder) */}
          {/* <Route
            path="/employee"
            element={
              <RoleProtected allow={["employee"]}>
                <div className="card p-3">
                  <h4>Employee panel</h4>
                  <p>Ovde će ići termini tvoje filijale.</p>
                </div>
              </RoleProtected>
            }
          /> */}

          {/* ADMIN ruta (placeholder) */}
          <Route
            path="/admin"
            element={
              <RoleProtected allow={["admin"]}>
                <div className="card p-3">
                  <h4>Admin panel</h4>
                  <p>Ovde admin vidi sve termine i korisnike.</p>
                </div>
              </RoleProtected>
            }
          />

          {/* fallback */}
          <Route path="*" element={<div className="card">404</div>} />
        </Routes>
      </div>

      <FloatingChat />
    </div>
  );
}
