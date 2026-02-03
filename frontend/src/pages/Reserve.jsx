import { useEffect, useMemo, useState } from "react";
import { getBranches, getBranchSlots, createAppointment } from "../api/appointments";
import { me } from "../api/auth"; // <--- dodaj ovaj fajl/poziv (GET /api/auth/me/)

export default function Reserve() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [msg, setMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

function formatSlot(iso) {
  const d = new Date(iso);
  return d.toLocaleString("sr-RS", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

  // Učitavanje trenutnog korisnika (da znamo da li je zaposleni)
  useEffect(() => {
    (async () => {
      try {
        const u = await me();
        setUser(u);
      } catch (e) {
        // Ako nema tokena ili endpointa, user ostaje null
      } finally {
        setUserLoaded(true);
      }
    })();
  }, []);

  // Prepoznaj zaposlenog (podržava i role i is_staff)
  const isEmployee = useMemo(() => {
    if (!user) return false;
    if (user.role) return String(user.role).toLowerCase() === "employee";
    if (typeof user.is_staff === "boolean") return user.is_staff === true;
    return false;
  }, [user]);

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
  setNotice({ type: "", text: "" });

  if (isEmployee) {
    setNotice({ type: "warning", text: "Zaposleni ne mogu zakazivati termine." });
    return;
  }
  if (!branchId || !selectedSlot) {
    setNotice({ type: "info", text: "Izaberi filijalu i termin." });
    return;
  }

  setIsSubmitting(true);
  try {
    await createAppointment({ branch_id: Number(branchId), start_time: selectedSlot });

 setNotice({ type: "success", text: "Termin je uspješno zakazan ✅" });
setToastOpen(true);
setTimeout(() => setToastOpen(false), 2500);

    // ✅ UX: skloni izabrani termin iz liste (da se vidi da je zauzet)
    setSlots((prev) => prev.filter((x) => x !== selectedSlot));
    setSelectedSlot("");
  } catch (e) {
    setNotice({
      type: "danger",
      text: "Neuspešno zakazivanje (termin zauzet ili neispravni podaci).",
    });
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-7 col-lg-6">
          <div className="card bg-dark text-light border-secondary shadow">
            <div className="card-body">
              <h3 className="card-title mb-4">Rezerviši termin</h3>
              {notice.text && (
  <div className={`alert alert-${notice.type} border-0`} role="alert">
    {notice.text}
  </div>
)}


              {/* Poruke */}
              {msg && (
                <div className="alert alert-info border-0" role="alert">
                  {msg}
                </div>
              )}

              {/* Ako je user učitan i zaposlen -> objasni i sakrij formu */}
              {userLoaded && isEmployee ? (
                <div className="alert alert-warning border-0" role="alert">
                  Zaposleni ne mogu da rezervišu termine. Možete pregledati raspored u panelu za zaposlene.
                </div>
              ) : (
                <>
                  {/* Filijala */}
                  <div className="mb-3">
                    <label className="form-label">Filijala</label>

                    <div className="dropdown">
                      <button
                        className="form-control d-flex justify-content-between align-items-center"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <span>
                          {branchId
                            ? branches.find((b) => String(b.id) === String(branchId))?.name
                            : "Izaberi filijalu"}
                        </span>
                        <span className="ms-2 opacity-75">▾</span>
                      </button>

                      <ul className="dropdown-menu w-100">
                        {branches.map((b) => (
                          <li key={b.id}>
                            <button
                              type="button"
                              className={
                                "dropdown-item " + (String(branchId) === String(b.id) ? "active" : "")
                              }
                              onClick={() => {
                                setMsg("");
                                setBranchId(String(b.id));
                              }}
                            >
                              {b.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Datum */}
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

                  {/* Slotovi */}
                  <div className="mb-3">
                    <label className="form-label">Slobodni termini</label>

                    {!branchId || !date ? (
                      <div className="text-white-50 small">
                        Izaberi filijalu i datum da vidiš slobodne slotove.
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="alert alert-secondary mb-0">Nema slobodnih termina.</div>
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
                            <span>{formatSlot(s)}</span>

                            {selectedSlot === s && (
                              <span className="badge bg-light text-dark">Izabran</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Sticky akcije */}
                  <div className="sticky-actions pt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="small text-white-50">
                        Izabrani termin: {selectedSlot ? selectedSlot : "—"}
                      </div>
                    </div>

                    <button
                      className="btn btn-primary w-100"
                      disabled={!branchId || !selectedSlot || isSubmitting}
                      onClick={handleReserve}
                    >
                      {isSubmitting ? "Zakazujem..." : "Zakaži"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="toast-wrap">
  <div className={"toast-card " + (toastOpen ? "show" : "")}>
    <div className="toast-icon">✅</div>
    <div className="toast-text">{notice.text}</div>
  </div>
</div>

    </div>
  );
}
