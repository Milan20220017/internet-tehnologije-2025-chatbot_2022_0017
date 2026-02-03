import { useState } from "react";
import ChatWidget from "./ChatWidget";

export default function FloatingChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Dugme (zvezdica) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            width: 56,
            height: 56,
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            fontSize: 24,
            boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
          }}
          title="Chat"
        >
          ⭐
        </button>
      )}

      {/* Popup prozor */}
      {open && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            width: 360,
            maxWidth: "90vw",
            height: 520,
            maxHeight: "75vh",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            background: "#111",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 18 }}>⭐</span>
              <div>
                <div style={{ fontWeight: 700 }}>Bank Chat</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Tu sam da pomognem 🙂
                </div>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                fontSize: 18,
                cursor: "pointer",
                opacity: 0.8,
              }}
              title="Zatvori"
            >
              ✕
            </button>
          </div>

          {/* Telo chata */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChatWidget />
          </div>
        </div>
      )}
    </>
  );
}
