export default function BranchSelect({ branches, value, onChange }) {
  return (
    <div>
      <label>Filijala</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Izaberi filijalu</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} – {b.address}
          </option>
        ))}
      </select>
    </div>
  );
}
