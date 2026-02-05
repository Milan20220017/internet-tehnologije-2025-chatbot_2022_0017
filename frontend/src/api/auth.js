import api from "./api";
import axios from "axios";

export async function me() {
  const token = localStorage.getItem("access");
  const res = await axios.get("http://127.0.0.1:8000/api/auth/me/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

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
