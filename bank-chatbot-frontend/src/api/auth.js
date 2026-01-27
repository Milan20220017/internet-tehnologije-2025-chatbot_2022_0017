// src/api/auth.js
import api from "./api"; // tvoj axios instance

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
  // JWT logout = obriši tokene lokalno
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}
