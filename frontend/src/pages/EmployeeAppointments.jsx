import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/api"; // prilagodi putanju ako ti je drugačija

export default function EmployeeAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await api.get("/employee/appointments/"); // baseURL već sadrži /api
        setAppointments(res.data);
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
          err?.message ||
          "Greška pri učitavanju."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  if (loading) {
    return (
      <div className="card p-3">
        <h5>Učitavanje termina...</h5>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-3 text-danger">
        <h5>{error}</h5>
      </div>
    );
  }

  return (
    <div className="card p-3">
      <h3 className="mb-3">Termini moje filijale</h3>

      <p className="text-muted">
        Zaposleni: <strong>{user?.username}</strong>
      </p>

      {appointments.length === 0 ? (
        <p>Nema zakazanih termina.</p>
      ) : (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Datum i vreme</th>
              <th>Korisnik</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.start_time).toLocaleString()}</td>
                <td>{a.user_username}</td>
                <td>{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
