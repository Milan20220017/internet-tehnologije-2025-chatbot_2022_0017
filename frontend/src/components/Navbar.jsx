import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    "nav-link" + (isActive ? " active fw-semibold" : "");

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top border-bottom border-secondary">
      <div className="container">
        <span className="navbar-brand fw-bold">Banka</span>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink to="/" className={linkClass}>Početna</NavLink>
            </li>

            <li className="nav-item">
              <NavLink to="/branches" className={linkClass}>Filijale</NavLink>
            </li>

            {user?.role === "user" && (
              <li className="nav-item">
                <NavLink to="/my-appointments" className={linkClass}>Moji termini</NavLink>
              </li>
            )}

            {user?.role === "employee" && (
              <li className="nav-item">
                <NavLink to="/employee" className={linkClass}>Termini filijale</NavLink>
              </li>
            )}

            {user?.role === "admin" && (
              <li className="nav-item">
                <NavLink to="/admin" className={linkClass}>Admin</NavLink>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-2">
            {!user ? (
              <>
                <NavLink to="/login" className="btn btn-outline-light btn-sm">Login</NavLink>
                <NavLink to="/register" className="btn btn-primary btn-sm">Register</NavLink>
              </>
            ) : (
              <>
                <span className="text-white-50 small">
                  Ulogovan: <span className="text-white fw-semibold">{user.username}</span>{" "}
                  (<span className="text-white">{user.role}</span>)
                </span>

                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
