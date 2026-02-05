import axios from "axios";

const BASE = "http://127.0.0.1:8000/api";

const api = axios.create({// kreiranje axios instance s baznim URL-om i zaglavljima
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {// interceptor za dodavanje access tokena u zaglavlje svakog zahtjeva
  const token = localStorage.getItem("access");// LocalStorage je ugrađeni web storage objekt koji omogućava web aplikacijama da skladište podatke lokalno unutar preglednika korisnika.
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

    if (status !== 401 || original?._retry) {// retry sprecava beskonačnu petlju
      return Promise.reject(error);
    }

    if (original?.url?.includes("/auth/login/") || original?.url?.includes("/auth/refresh/")) {// ne pokušavaj osvježiti token ako je greška došla s login ili refresh endpointa
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem("refresh");// dohvaćanje refresh tokena iz localStorage
    if (!refresh) return Promise.reject(error);// ako nema refresh tokena, odbaci grešku

    original._retry = true;//da ne bi ušli u beskonačnu petlju

    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((newAccess) => {
          original.headers.Authorization = `Bearer ${newAccess}`;// postavljanje novog access tokena u zaglavlje originalnog zahtjeva
          resolve(api(original));// ponovni pokušaj originalnog zahtjeva s novim tokenom
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
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
