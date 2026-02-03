import api from "./api";

export async function sendChat(message) {
  const res = await api.post("/chat/", { message });
  return res.data; // { intent, reply, link? }
}
export async function fetchChatHistory() {
  const res = await api.get("/chat/history/");
  return res.data; // [{role, content, created_at}]
}
