import api from "./api";

export async function sendChat(message) {
  const res = await api.post("/chat/", { message });
  return res.data; // { intent, reply, link? }
}
