import { useEffect, useMemo, useRef, useState } from "react";
import { sendChat, fetchChatHistory } from "../api/chat";
import { useAuth } from "../context/AuthContext";

export default function ChatWidget() {
  useAuth(); 

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");

  const endRef = useRef(null);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);// useMemo se koristi za optimizaciju performansi, kako bi se izbeglo ponovno izračunavanje vrednosti canSend pri svakom renderovanju komponente, osim ako se ne promene zavisnosti (text ili sending).

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoadingHistory(true);
      setError("");

      try {
        const history = await fetchChatHistory(); 
        if (cancelled) return;

        if (Array.isArray(history) && history.length > 0) {
          setMessages(
            history.map((m) => ({
              role: m.role,
              content: m.content,
            }))
          );
        } else {
          setMessages([{ role: "assistant", content: "Zdravo! Kako mogu da pomognem?" }]);
        }
      } catch (e) {
        if (!cancelled) {
          setMessages([{ role: "assistant", content: "Zdravo! Kako mogu da pomognem?" }]);
          setError("Ne mogu da učitam istoriju chata.");
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSend(e) {
    e.preventDefault();
    setError("");

    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg = { role: "user", content: trimmed };

    setMessages((m) => [...m, userMsg]);
    setText("");
    setSending(true);

    try {
      const res = await sendChat(trimmed); // { intent, reply, link? }
      const reply = res?.reply?.trim() || "Nemam odgovor trenutno.";

      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Greška pri slanju poruke. Pokušaj ponovo." },
      ]);
      setError("Slanje nije uspelo.");
    } finally {
      setSending(false);
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
        {loadingHistory && (
          <div style={{ alignSelf: "center", opacity: 0.8, fontSize: 13, color: "white" }}>
            Učitavam istoriju...
          </div>
        )}

        {error && (
          <div
            style={{
              alignSelf: "center",
              opacity: 0.95,
              fontSize: 13,
              color: "white",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "6px 10px",
              borderRadius: 10,
              background: "rgba(255, 0, 0, 0.10)",
            }}
          >
            {error}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "10px 12px",
              borderRadius: 14,
              background:
                msg.role === "user"
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "white",
              whiteSpace: "pre-wrap",
              lineHeight: 1.35,
            }}
          >
            {msg.content}
          </div>
        ))}

        <div ref={endRef} />
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
          disabled={loadingHistory}
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
          disabled={!canSend || loadingHistory}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            cursor: canSend ? "pointer" : "not-allowed",
            opacity: !canSend || loadingHistory ? 0.6 : 1,
          }}
        >
          {sending ? "..." : "Pošalji"}
        </button>
      </form>
    </div>
  );
}
