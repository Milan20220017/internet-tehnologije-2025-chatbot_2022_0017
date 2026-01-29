import os
import json
import logging
from typing import Any, Dict, List, Optional, Literal, TypedDict

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ----------------------------
# Logging (ne smeta u prod-u, samo utiče ako ga uključiš)
# ----------------------------
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ----------------------------
# Types
# ----------------------------
Intent = Literal[
    "greeting",
    "branches_hours",
    "branches_list",
    "appointments_help",
    "appointments_slots",
    "fx_rate",
    "docs_required",
    "faq",
    "unknown",
]

class ChatTurn(TypedDict):
    role: Literal["user", "assistant"]
    content: str

class BotResponse(TypedDict):
    intent: Intent
    reply: str
    link: str

# ----------------------------
# Prompt
# ----------------------------
SYSTEM_PROMPT = """
Ti si bankarski chatbot za Srbiju. Pomažeš korisnicima oko:
- filijala i radnog vremena
- rezervacije termina (koraci, potrebni podaci, slobodni slotovi)
- osnovne informacije o dokumentima
- FAQ o bankarskim uslugama (na visokom nivou)

OBAVEZNO: Odgovori ISKLJUČIVO validnim JSON-om (bez dodatnog teksta, bez markdown-a).

Schema:
{
  "intent": "greeting|branches_hours|branches_list|appointments_help|appointments_slots|fx_rate|docs_required|faq|unknown",
  "reply": "kratak i koristan odgovor na srpskom",
  "link": "opciono, ili prazno"
}

Pravila:
- reply max ~2-4 rečenice, jasno i profesionalno
- Ako korisnik pita nejasno (npr. 'a kako to', 'šta još'), postavi 1-2 potpitanja ili ponudi 3 konkretne opcije.
- Ne izmišljaj tarife/kurseve/tačne podatke ako nisu u KONTEKSTU/STATE; ako nema info → intent=unknown i uputi na zvaničan kontakt.
- link neka bude "" ako nema
- JSON mora da se parsira sa json.loads bez greške
- Ne ponavljaj istu generičku rečenicu (tipa 'Mogu da pomognem...') više puta.

Primeri (format je OBAVEZNO JSON):
{"intent":"greeting","reply":"Zdravo! Mogu pomoći oko filijala, termina i potrebne dokumentacije. Šta vam treba?","link":""}
{"intent":"appointments_help","reply":"Da biste rezervisali termin, recite: filijalu, datum i uslugu. Da li već imate izabranu filijalu?","link":""}
{"intent":"unknown","reply":"Ne mogu pouzdano da odgovorim bez dodatnih informacija. Možete li precizirati pitanje ili kontaktirati banku?","link":""}
""".strip()

# ----------------------------
# Client
# ----------------------------
def groq_client() -> OpenAI:
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise RuntimeError("Nedostaje GROQ_API_KEY env var.")
    base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    return OpenAI(api_key=key, base_url=base_url)

# ----------------------------
# JSON extraction (balanced braces) - stabilnije od regex-a
# ----------------------------
def _extract_first_json_object_balanced(text: str) -> str:
    s = (text or "").strip()
    if not s:
        return ""

    # Brzi put: već izgleda kao JSON objekat
    if s.startswith("{") and s.endswith("}"):
        return s

    start = s.find("{")
    if start == -1:
        return ""

    depth = 0
    for i in range(start, len(s)):
        ch = s[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1].strip()

    return ""

# ----------------------------
# Validation / normalization
# ----------------------------
_ALLOWED_INTENTS = {
    "greeting", "branches_hours", "branches_list", "appointments_help",
    "appointments_slots", "fx_rate", "docs_required", "faq", "unknown"
}

def _normalize_output(data: Dict[str, Any]) -> BotResponse:
    intent = str(data.get("intent") or "unknown").strip()
    reply = str(data.get("reply") or "").strip()
    link = str(data.get("link") or "").strip()

    if intent not in _ALLOWED_INTENTS:
        intent = "unknown"

    if not reply:
        reply = "Ne mogu pouzdano da odgovorim na to. Molim vas kontaktirajte banku."

    return {"intent": intent, "reply": reply, "link": link}  # type: ignore[return-value]

# ----------------------------
# Build user content with optional context/state
# ----------------------------
def _build_user_content(user_message: str, context: str = "", state: Optional[Dict[str, Any]] = None) -> str:
    user_message = (user_message or "").strip()

    parts: List[str] = []
    if state:
        # state u JSON-u je super jer model zna šta je "izvor istine"
        parts.append("STATE (pouzdan izvor istine):\n" + json.dumps(state, ensure_ascii=False))

    if context.strip():
        parts.append("KONTEKST (pouzdan izvor istine):\n" + context.strip())

    parts.append("PITANJE KORISNIKA:\n" + user_message)
    return "\n\n".join(parts).strip()

# ----------------------------
# Optional: attempt to "repair" invalid JSON by asking model again
# ----------------------------
REPAIR_PROMPT = """
Popravi sledeći sadržaj u VALIDAN JSON objekat tačno po zadatoj šemi.
Vrati ISKLJUČIVO JSON (bez dodatnog teksta).

Schema:
{
  "intent": "greeting|branches_hours|branches_list|appointments_help|appointments_slots|fx_rate|docs_required|faq|unknown",
  "reply": "kratak i koristan odgovor na srpskom",
  "link": "opciono, ili prazno"
}

Sadržaj za popravku:
""".strip()

# ----------------------------
# Main function
# ----------------------------
def groq_chat_json(
    user_message: str,
    context: str = "",
    history: Optional[List[ChatTurn]] = None,
    state: Optional[Dict[str, Any]] = None,
    max_history_turns: int = 10,
) -> BotResponse:
    """
    user_message: trenutno pitanje korisnika
    context: pouzdan tekstualni kontekst (npr. iz baze)
    history: lista prethodnih poruka [{"role":"user"/"assistant","content":"..."}]
    state: struktura (filijala/datum/usluga/slotovi...) - najstabilnije za rezervacije
    max_history_turns: koliko zadnjih poruka da proslediš modelu
    """
    client = groq_client()
    model = os.getenv("GROQ_MODEL", "llama3-8b-8192")

    user_content = _build_user_content(user_message, context=context, state=state)

    messages: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Dodaj zadnjih N poruka radi konteksta (sprječava "a kako to" random odgovore)
    if history:
        trimmed = history[-max_history_turns:]
        for turn in trimmed:
            role = turn.get("role", "user")
            content = (turn.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_content})

    # Poziv
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=float(os.getenv("GROQ_TEMPERATURE", "0.2")),
            max_tokens=int(os.getenv("GROQ_MAX_TOKENS", "320")),
            # Ako Groq/account/model podržava — ogromno poboljšanje stabilnosti
            response_format={"type": "json_object"},
        )
    except TypeError:
        # wrapper/server ne podržava response_format ili max_tokens
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=float(os.getenv("GROQ_TEMPERATURE", "0.2")),
        )

    content = (resp.choices[0].message.content or "").strip()
    if not content:
        return {"intent": "unknown", "reply": "Nisam dobio odgovor od modela.", "link": ""}

    # 1) Direktni json.loads
    try:
        return _normalize_output(json.loads(content))
    except Exception:
        pass

    # 2) Izvuci prvi JSON objekat (balanced)
    blob = _extract_first_json_object_balanced(content)
    if blob:
        try:
            return _normalize_output(json.loads(blob))
        except Exception:
            pass

    # 3) Repair pass (opciono, ali spašava dosta slučajeva)
    try:
        repair_messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": REPAIR_PROMPT + "\n\n" + content},
        ]
        try:
            repair_resp = client.chat.completions.create(
                model=model,
                messages=repair_messages,
                temperature=0.0,
                max_tokens=250,
                response_format={"type": "json_object"},
            )
        except TypeError:
            repair_resp = client.chat.completions.create(
                model=model,
                messages=repair_messages,
                temperature=0.0,
            )

        repaired = (repair_resp.choices[0].message.content or "").strip()
        try:
            return _normalize_output(json.loads(repaired))
        except Exception:
            repaired_blob = _extract_first_json_object_balanced(repaired)
            if repaired_blob:
                return _normalize_output(json.loads(repaired_blob))
    except Exception as e:
        logger.info("Repair pass failed: %s", e)

    # 4) Final fallback
    return {
        "intent": "unknown",
        "reply": content[:600] if content else "Nisam uspeo da generišem validan odgovor.",
        "link": "",
    }
