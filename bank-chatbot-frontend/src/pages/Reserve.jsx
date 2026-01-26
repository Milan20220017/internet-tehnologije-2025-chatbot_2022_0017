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
    <div style={{ maxWidth: 520, padding: 16 }}>
      <h1>Rezerviši termin</h1>

      {msg && <p>{msg}</p>}

      <div style={{ display: "grid", gap: 12 }}>
        <BranchSelect branches={branches} value={branchId} onChange={setBranchId} />

        <div>
          <label>Datum</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <SlotPicker slots={slots} value={selectedSlot} onChange={setSelectedSlot} />

        <button onClick={handleReserve} disabled={!selectedSlot}>
          Zakaži
        </button>
      </div>
    </div>
  );
}
