import api from "./api";

export async function me() {
  const token = localStorage.getItem("access");
  const res = await api.get("/auth/me/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);
console.log("API_ORIGIN =", API_ORIGIN);
console.log("BASE =", BASE);

export async function registerUser({ username, email, password, password2 }) {
  const res = await api.post("/auth/register/", {
    username,
    email,
    password,
    password2,
  });
  return res.data;
}
export async function fetchMe() {
  const res = await api.get("/auth/me/");
  return res.data;
}

export async function loginUser({ username, password }) {
  const res = await api.post("/auth/login/", { username, password });

  localStorage.setItem("access", res.data.access);
  localStorage.setItem("refresh", res.data.refresh);

  return res.data;
}
export function logoutUser() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}
