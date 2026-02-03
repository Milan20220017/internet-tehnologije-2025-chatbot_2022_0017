import axios from "axios";

const BASE = "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

function resolveQueue(newAccess) {
  queue.forEach((cb) => cb(newAccess));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // samo 401 i samo jednom po requestu
    if (status !== 401 || original?._retry) {
      return Promise.reject(error);
    }

    // ne pokušavaj refresh ako je baš login/refresh endpoint pukao
    if (original?.url?.includes("/auth/login/") || original?.url?.includes("/auth/refresh/")) {
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem("refresh");
    if (!refresh) return Promise.reject(error);

    original._retry = true;

    // ako refresh već traje, sačekaj
    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((newAccess) => {
          original.headers.Authorization = `Bearer ${newAccess}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;

    try {
      const resp = await axios.post(
        `${BASE}/auth/refresh/`,
        { refresh },
        { headers: { "Content-Type": "application/json" } }
      );

      const newAccess = resp.data?.access;
      if (!newAccess) throw new Error("No access token in refresh response");

      localStorage.setItem("access", newAccess);
      resolveQueue(newAccess);

      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (e) {
      // refresh neuspešan => izbaci korisnika
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
