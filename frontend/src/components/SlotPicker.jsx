// export default function SlotPicker({ slots, value, onChange }) {
//   if (!slots.length) return <p>Nema slobodnih termina.</p>;

//   return (
//     <div>
//       <label>Termin</label>
//       <select value={value} onChange={(e) => onChange(e.target.value)}>
//         <option value="">Izaberi termin</option>
//         {slots.map((s) => (
//           <option key={s} value={s}>
//             {new Date(s).toLocaleString("sr-RS")}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// }
