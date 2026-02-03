import api from "./api";

export async function fetchMyAppointments() {
  const res = await api.get("/appointments/my/");
  return res.data;
}
export async function getBranches() {
  const res = await api.get("/branches/");
  return res.data;
}

export async function getBranchSlots(branchId, date) {
  const res = await api.get(`/branches/${branchId}/slots/`, { params: { date } });
  return res.data;
}

export async function createAppointment(payload) {
  // payload: { branch_id, start_time }
  const res = await api.post("/appointments/", payload);
  return res.data;
}

export async function getMyAppointments() {
  const res = await api.get("/appointments/my/");
  return res.data;
}

export async function cancelAppointment(id) {
  const res = await api.post(`/appointments/${id}/cancel/`);
  return res.data;
}
