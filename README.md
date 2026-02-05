# Chatbot_Django (Django REST + React)

Full-stack aplikacija rađena za predmet **Internet tehnologije**.  
Backend je implementiran u **Django + Django REST Framework**, a frontend u **React**.  
Aplikacija omogućava autentifikaciju korisnika (JWT), rezervaciju termina u filijalama, kao i chatbot funkcionalnost (FAQ + LLM).

---

## Tehnologije

### Backend
- Django 5.2.11
- Django REST Framework
- JWT autentifikacija (djangorestframework-simplejwt)
- Swagger / OpenAPI dokumentacija (drf-spectacular)
- CORS podrška (django-cors-headers)
- SQLite baza (u Dockeru preko named volume)
- Eksterni API-ji: OpenWeather API, Groq/LLM API

### Frontend
- React
- react-router-dom (rutiranje)
- axios (API pozivi + token refresh interceptori)
- Bootstrap (stilizacija)

---

## Funkcionalnosti

- Registracija i prijava korisnika (JWT)
- Role-based pristup (user / employee / admin)
- Rezervacija termina po filijali i datumu
- Pregled i otkazivanje termina
- Chatbot (FAQ + LLM fallback)
- Prikaz vremenskih podataka po gradu

---

## Modeli (Backend)

Sistem sadrži najmanje 5 međusobno povezanih modela:
- User (custom user sa ulogama)
- Branch (filijala)
- Appointment (termin)
- FAQEntry (FAQ za chatbot)
- ChatMessage (istorija poruka)

---

## API dokumentacija (Swagger)

- Swagger UI: http://localhost:8000/api/docs/
- OpenAPI schema: http://localhost:8000/api/schema/

---

## Pokretanje aplikacije (Docker / docker-compose)

```bash
docker-compose up --build
```

### Servisi
- Backend: http://localhost:8000  
- Frontend: http://localhost:5172  

Docker compose automatski izvršava migracije i startuje server:

- backend:
  ```
  python manage.py migrate && python manage.py runserver 0.0.0.0:8000
  ```
- frontend:
  ```
  npm run dev -- --host 0.0.0.0 --port 5172
  ```

SQLite podaci se čuvaju u named volume: `sqlite_data`.

---

## Pokretanje aplikacije (lokalno bez Dockera)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev -- --port 5172
```

---

## Frontend rute

Implementirano rutiranje za sve delove aplikacije:

- `/login` – prijava
- `/register` – registracija
- `/reserve` – rezervacija termina (Protected)
- `/branches` – filijale (Protected)
- `/my-appointments` – korisnički termini (RoleProtected: user)
- `/employee` – termini filijale (RoleProtected: employee)
- `/admin` – admin panel (RoleProtected: admin)

---

## Reusable komponente (Frontend)

Globalne reusable komponente:
- Navbar
- FloatingChat
- Protected i RoleProtected (route guards)

---

## Bezbednost (min 3)

Primene zaštite:
- JWT autentifikacija + ograničavanje pristupa rutama (IsAuthenticated)
- Role-based permissions (employee / admin rute)
- IDOR zaštita (korisnik može otkazati samo sopstveni termin)
- CORS konfiguracija (React ↔ Django API)

---

## Grane (Git)

- main – stabilna verzija
- develop – integraciona grana
- feature/swagger
- feature/ci-cd

---

## Napomena

Frontend koristi axios interceptore za automatsko dodavanje  
`Authorization: Bearer <access>` zaglavlja i automatsko osvežavanje tokena putem  
`/api/auth/refresh/` endpointa u slučaju `401 Unauthorized` greške.
