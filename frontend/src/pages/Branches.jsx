import { useEffect, useState } from "react";
import { getBranches } from "../api/appointments";
import { useNavigate } from "react-router-dom";
import WeatherCard from "../components/WeatherCard";


export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const data = await getBranches();
        setBranches(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr("Greška pri učitavanju filijala.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Filijale</h3>
        <button className="btn btn-primary" onClick={() => navigate("/reserve")}>
          Rezerviši termin
        </button>
      </div>

      {/* 🔽 VREMENSKA PROGNOZA */}
      <div className="mb-4">
        <WeatherCard city="Belgrade" />
      </div>

      {loading && (
        <div className="d-flex align-items-center gap-2 text-white-50">
          <div className="spinner-border spinner-border-sm" role="status" />
          Učitavam...
        </div>
      )}


      {err && (
        <div className="alert alert-danger mt-3 mb-0" role="alert">
          {err}
        </div>
      )}

      {!loading && !err && branches.length === 0 && (
        <div className="alert alert-secondary mt-3 mb-0">
          Trenutno nema dostupnih filijala.
        </div>
      )}

      <div className="row g-3 mt-2">
        {branches.map((b) => (
          <div className="col-12 col-md-6" key={b.id}>
            <div className="card bg-dark text-light border-secondary shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 className="card-title mb-1">{b.name}</h5>
                    <div className="text-white-50 small">{b.city}</div>
                  </div>

                  <span className="badge text-bg-secondary">ID: {b.id}</span>
                </div>

                <hr className="border-secondary my-3" />

                <div className="d-flex flex-column gap-2 small">
                  <div className="d-flex justify-content-between">
                    <span className="text-white-50">Adresa</span>
                    <span className="text-end">{b.address}</span>
                  </div>

                  <div className="d-flex justify-content-between">
                    <span className="text-white-50">Radno vrijeme</span>
                    <span>{b.open_time} – {b.close_time}</span>
                  </div>

                  <div className="d-flex justify-content-between">
                    <span className="text-white-50">Slot</span>
                    <span>{b.slot_minutes} min</span>
                  </div>
                </div>
              </div>

              <div className="card-footer bg-transparent border-secondary d-flex justify-content-end">
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={() => navigate("/reserve")}
                >
                  Izaberi termin
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
