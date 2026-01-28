import { useEffect, useState } from "react";
import BranchSelect from "../components/BranchSelect";
import SlotPicker from "../components/SlotPicker";
import { getBranches, getBranchSlots, createAppointment } from "../api/appointments";

export default function Reserve() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getBranches();
        setBranches(data);
      } catch (e) {
        setMsg("Greška pri učitavanju filijala.");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!branchId || !date) return;
      try {
        const data = await getBranchSlots(branchId, date);
        setSlots(data.available_slots || []);
        setSelectedSlot("");
      } catch (e) {
        setMsg("Greška pri učitavanju slobodnih termina.");
      }
    })();
  }, [branchId, date]);

  const handleReserve = async () => {
    setMsg("");
    if (!branchId || !selectedSlot) {
      setMsg("Izaberi filijalu i termin.");
      return;
    }
    try {
      await createAppointment({ branch_id: Number(branchId), start_time: selectedSlot });
      setMsg("Termin je uspešno zakazan.");
    } catch (e) {
      setMsg("Neuspešno zakazivanje (termin zauzet ili neispravni podaci).");
    }
  };

return (
  <div className="container py-5">
    <div className="row justify-content-center">
      <div className="col-12 col-md-7 col-lg-6">
        <div className="card bg-dark text-light border-secondary shadow">
          <div className="card-body">
            <h3 className="card-title mb-4">Rezerviši termin</h3>

            {msg && (
              <div className="alert alert-info border-0" role="alert">
                {msg}
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">Filijala</label>
              <select
                className="form-select"
                value={branchId}
                onChange={(e) => {
                  setMsg("");
                  setBranchId(e.target.value);
                }}
              >
                <option value="">Izaberi filijalu</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Datum</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => {
                  setMsg("");
                  setDate(e.target.value);
                }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Slobodni termini</label>

              {!branchId || !date ? (
                <div className="text-white-50 small">
                  Izaberi filijalu i datum da vidiš slobodne slotove.
                </div>
              ) : slots.length === 0 ? (
                <div className="alert alert-secondary mb-0">
                  Nema slobodnih termina.
                </div>
              ) : (
                <div className="list-group">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={
                        "list-group-item list-group-item-action d-flex justify-content-between align-items-center " +
                        (selectedSlot === s ? "active" : "")
                      }
                      onClick={() => setSelectedSlot(s)}
                    >
                      <span>{s}</span>
                      {selectedSlot === s && (
                        <span className="badge bg-light text-dark">Izabran</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="btn btn-primary w-100"
              disabled={!branchId || !selectedSlot}
              onClick={handleReserve}
            >
              Zakaži
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
