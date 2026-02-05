import { useEffect, useState } from "react";
import { fetchMyAppointments, cancelAppointment } from "../api/appointments";

function formatDT(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt; 
  return d.toLocaleString("sr-RS", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await fetchMyAppointments();
      const list = Array.isArray(data) ? data : data.appointments;
      setAppointments(list || []);
    } catch (e) {
      setMsg("Greška pri učitavanju termina.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (id) => {
    setMsg("");
    try {
      await cancelAppointment(id);
      setMsg("Termin je otkazan.");
      await load();
    } catch (e) {
      setMsg("Ne mogu da otkažem termin (možda je već otkazan).");
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Moji termini</h3>
        <button className="btn btn-outline-light btn-sm" onClick={load} disabled={loading}>
          Osveži
        </button>
      </div>

      {msg && (
        <div className="alert alert-info border-0" role="alert">
          {msg}
        </div>
      )}

      {loading && (
        <div className="d-flex align-items-center gap-2 text-white-50">
          <div className="spinner-border spinner-border-sm" role="status" />
          Učitavam...
        </div>
      )}

      {!loading && appointments.length === 0 && (
        <div className="alert alert-secondary">Nemaš zakazane termine.</div>
      )}

      <div className="card bg-dark text-light border-secondary shadow-sm">
        <div className="list-group list-group-flush">
          {appointments.map((a) => {
            const branchName = a?.branch?.name || a?.branch_name || "Filijala";
            const city = a?.branch?.city;
            const address = a?.branch?.address;

            const start = a?.start_time || a?.date; // zavisi šta vraća backend
            const status = a?.status || "booked";

            const badgeClass =
              status === "canceled" ? "text-bg-secondary" : "text-bg-success";

            return (
              <div
                key={a.id}
                className="list-group-item bg-dark text-light border-secondary d-flex justify-content-between align-items-start gap-3"
              >
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <strong>{branchName}</strong>
                    {city && <span className="text-white-50 small">• {city}</span>}
                    <span className={"badge " + badgeClass}>
                      {status === "canceled" ? "Otkazano" : "Zakazano"}
                    </span>
                  </div>

                  <div className="text-white-50 small mt-1">
                    {formatDT(start)}
                    {address ? ` • ${address}` : ""}
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-light btn-sm"
                    onClick={() => handleCancel(a.id)}
                    disabled={status === "canceled"}
                    title="Otkaži termin"
                  >
                    Otkaži
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
