import { useState } from "react";
import { sendChat } from "../api/chat"; // vidi dole chat.js

export default function ChatWidget() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Zdravo! Kako mogu da pomognem?" },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setText("");
    setLoading(true);

    try {
      const res = await sendChat(trimmed); // { intent, reply, link? }
      const reply = res?.reply || "Nemam odgovor trenutno.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Greška pri slanju poruke." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "10px 12px",
              borderRadius: 14,
              background:
                msg.role === "user" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "white",
              whiteSpace: "pre-wrap",
            }}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <form
        onSubmit={onSend}
        style={{
          display: "flex",
          gap: 8,
          padding: 10,
          borderTop: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napiši poruku..."
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.25)",
            color: "white",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "..." : "Pošalji"}
        </button>
      </form>
    </div>
  );
}
