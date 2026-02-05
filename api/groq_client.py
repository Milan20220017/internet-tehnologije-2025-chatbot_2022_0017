import os
import json
import logging
import datetime
import re
from typing import Any, Dict, List, Optional, Literal, TypedDict

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

Intent = Literal[
    "greeting",
    "branches_hours",
    "branches_list",
    "appointments_help",
    "appointments_slots",
    "fx_rate",
    "docs_required",
    "faq",
    "today_date",
    "current_time",
    "general",
    "unknown",
]

class ChatTurn(TypedDict):
    role: Literal["user", "assistant"]
    content: str

class BotResponse(TypedDict):
    intent: Intent
    reply: str
    link: str


_ALLOWED_INTENTS = {
    "greeting",
    "branches_hours",
    "branches_list",
    "appointments_help",
    "appointments_slots",
    "fx_rate",
    "docs_required",
    "faq",
    "today_date",
    "current_time",
    "general",
    "unknown",
}

SYSTEM_PROMPT = """
Ti si koristan asistent koji prvenstveno pomaže kao bankarski chatbot za Srbiju (filijale, radno vreme, termini, dokumentacija, osnovni info).
ALI: možeš odgovoriti i na opšta pitanja korisnika (datum, vreme, škola, tehnologije, itd).
Ako pitanje nije bankarsko, slobodno odgovori normalno i kratko.

OBAVEZNO: Odgovori ISKLJUČIVO validnim JSON-om (bez dodatnog teksta, bez markdown-a).

Schema:
{
  "intent": "greeting|branches_hours|branches_list|appointments_help|appointments_slots|fx_rate|docs_required|faq|today_date|current_time|general|unknown",
  "reply": "kratak i koristan odgovor na srpskom",
  "link": "opciono, ili prazno"
}

Pravila:
- reply max 2-4 rečenice, jasno i prirodno.
- Ako je pitanje nejasno, postavi 1 kratko potpitanje ILI ponudi 3 opcije.
- Ne izmišljaj tačne bankarske podatke (tarife, kurseve, radno vreme) ako nisu dati u STATE/KONTEKSTU; u tom slučaju traži dodatnu informaciju ili uputi na zvaničan kontakt.
- Za opšta pitanja (npr. datum/vreme), odgovori direktno: intent=general ili today_date/current_time.
- link neka bude "" ako nema.
- JSON mora da se parsira sa json.loads bez greške.
- Ne ponavljaj istu generičku rečenicu više puta.
""".strip()

REPAIR_PROMPT = """
Popravi sledeći sadržaj u VALIDAN JSON objekat tačno po zadatoj šemi.
Vrati ISKLJUČIVO JSON (bez dodatnog teksta).

Schema:
{
  "intent": "greeting|branches_hours|branches_list|appointments_help|appointments_slots|fx_rate|docs_required|faq|today_date|current_time|general|unknown",
  "reply": "kratak i koristan odgovor na srpskom",
  "link": "opciono, ili prazno"
}

Sadržaj za popravku:
""".strip()


def groq_client() -> OpenAI:
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise RuntimeError("Nedostaje GROQ_API_KEY env var.")
    base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    return OpenAI(api_key=key, base_url=base_url)


def _extract_first_json_object_balanced(text: str) -> str:
    s = (text or "").strip()
    if not s:
        return ""
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


def _normalize_output(data: Dict[str, Any]) -> BotResponse:
    intent = str(data.get("intent") or "unknown").strip()
    reply = str(data.get("reply") or "").strip()
    link = str(data.get("link") or "").strip()

    if intent not in _ALLOWED_INTENTS:
        intent = "unknown"

    if not reply:
        intent = "unknown"
        reply = "Nisam siguran kako da odgovorim na to. Možeš li precizirati pitanje?"

    return {"intent": intent, "reply": reply, "link": link}  


def _build_user_content(user_message: str, context: str = "", state: Optional[Dict[str, Any]] = None) -> str:
    user_message = (user_message or "").strip()

    parts: List[str] = []
    if state:
        parts.append("STATE (pouzdan izvor istine):\n" + json.dumps(state, ensure_ascii=False))

    if context.strip():
        parts.append("KONTEKST (pouzdan izvor istine):\n" + context.strip())

    parts.append("PITANJE KORISNIKA:\n" + user_message)
    return "\n\n".join(parts).strip()


def _compact_history(history: List[ChatTurn], max_turns: int) -> List[ChatTurn]:
    """
    Ne šalji cijelu istoriju:
    - uzmi samo zadnjih max_turns poruka
    - izbaci preduge poruke (da ne “zaglave” stil)
    - normalizuj whitespace
    """
    trimmed = history[-max_turns:] if max_turns > 0 else []
    out: List[ChatTurn] = []
    for t in trimmed:
        role = t.get("role", "user")
        content = (t.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue

        if len(content) > 800:
            content = content[:800].rstrip() + "…"

        content = re.sub(r"\s+", " ", content).strip()
        out.append({"role": role, "content": content})
    return out


def _is_date_question(msg: str) -> bool:
    m = (msg or "").lower()
    triggers = [
        "koji je datum",
        "datum danas",
        "danasnji datum",
        "koji je dan danas",
        "koji je danas dan",
        "današnji datum",
    ]
    return any(t in m for t in triggers)


def _is_time_question(msg: str) -> bool:
    m = (msg or "").lower()
    triggers = [
        "koliko je sati",
        "trenutno vreme",
        "trenutno vrijeme",
        "koje je vrijeme",
        "vreme sada",
        "vrijeme sada",
    ]
    return any(t in m for t in triggers)


def _today_reply() -> str:
    today = datetime.date.today()
    days = {
        0: "ponedeljak",
        1: "utorak",
        2: "sreda",
        3: "četvrtak",
        4: "petak",
        5: "subota",
        6: "nedelja",
    }
    return f"Danas je {days[today.weekday()]}, {today.strftime('%d.%m.%Y')}."


def _time_reply() -> str:
    now = datetime.datetime.now()
    return f"Trenutno je {now.strftime('%H:%M')}."


def groq_chat_json(
    user_message: str,
    context: str = "",
    history: Optional[List[ChatTurn]] = None,
    state: Optional[Dict[str, Any]] = None,
    max_history_turns: int = 6,  
) -> BotResponse:
    """
    user_message: trenutno pitanje korisnika
    context: pouzdan tekstualni kontekst (npr. iz baze)
    history: lista prethodnih poruka [{"role":"user"/"assistant","content":"..."}]
    state: struktura (filijala/datum/usluga/slotovi...) - najstabilnije za rezervacije
    max_history_turns: koliko zadnjih poruka da proslediš modelu (preporuka 4-8)
    """

    msg = (user_message or "").strip()
    if not msg:
        return {"intent": "unknown", "reply": "Napiši pitanje pa ću pomoći.", "link": ""}

    if _is_date_question(msg):
        return {"intent": "today_date", "reply": _today_reply(), "link": ""}

    if _is_time_question(msg):
        return {"intent": "current_time", "reply": _time_reply(), "link": ""}

    client = groq_client()

    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    user_content = _build_user_content(msg, context=context, state=state)

    messages: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if history:
        compact = _compact_history(history, max_history_turns)
        for turn in compact:
            messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({"role": "user", "content": user_content})

    temperature = float(os.getenv("GROQ_TEMPERATURE", "0.7"))
    max_tokens = int(os.getenv("GROQ_MAX_TOKENS", "500"))

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
    except TypeError:
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    content = (resp.choices[0].message.content or "").strip()
    if not content:
        return {"intent": "unknown", "reply": "Nisam dobio odgovor od modela.", "link": ""}

    # 3) Parse
    try:
        return _normalize_output(json.loads(content))
    except Exception:
        pass

    blob = _extract_first_json_object_balanced(content)
    if blob:
        try:
            return _normalize_output(json.loads(blob))
        except Exception:
            pass

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
                max_tokens=250,
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

    return {
        "intent": "general",
        "reply": content[:600] if content else "Nisam uspeo da generišem validan odgovor.",
        "link": "",
    }
