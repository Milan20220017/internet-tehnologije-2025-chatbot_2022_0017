from httpx import request
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .faq_matcher import match_faq
from django.shortcuts import render, get_object_or_404
from django.contrib.auth import get_user_model
from .models import Branch, Appointment, ChatMessage, FAQEntry
from .serializers import RegisterSerializer, UserSerializer, BranchSerializer, AppointmentSerializer
from .permissions import IsAdminRole
from datetime import datetime, time
from django.utils import timezone
from .serializers import ChatRequestSerializer
from .groq_client import groq_chat_json
from .permissions import IsEmployeeRole
import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
User = get_user_model()
from django.db.models import Count
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdminRole
class AppointmentsByStatusStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        rows = (
            Appointment.objects.values("status")
            .annotate(total=Count("id"))
            .order_by("status")
        )
        return Response(rows)
User = get_user_model()
class TopUsersByAppointmentsStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        limit = int(request.query_params.get("limit", 5))
        rows = (
            Appointment.objects.filter(status="booked")
            .values("user__username")
            .annotate(total=Count("id"))
            .order_by("-total")[:limit]
        )
        return Response(rows)
class UsersByRoleStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        rows = (
            User.objects.values("role")
            .annotate(total=Count("id"))
            .order_by("role")
        )
        return Response(rows)
class AppointmentsByBranchStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        data = (
            Appointment.objects
            .values("branch__name")
            .annotate(total=Count("id"))
            .order_by("branch__name")
        )

        return Response(data)

class WeatherView(APIView):
    def get(self, request):
        city = request.query_params.get("city", "Belgrade")
        api_key = os.getenv("OPENWEATHER_API_KEY")

        if not api_key:
            return Response(
                {"error": "OPENWEATHER_API_KEY nije podešen"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "q": city,
            "appid": api_key,
            "units": "metric",
            "lang": "sr"
        }

        try:
            r = requests.get(url, params=params, timeout=10)
            r.raise_for_status()
            data = r.json()

            return Response({
                "city": data["name"],
                "temperature": data["main"]["temp"],
                "feels_like": data["main"]["feels_like"],
                "humidity": data["main"]["humidity"],
                "description": data["weather"][0]["description"],
                "wind": data["wind"]["speed"]
            })
        except requests.exceptions.RequestException:
            return Response(
                {"error": "Greška pri pozivu OpenWeather servisa"},
                status=status.HTTP_502_BAD_GATEWAY
            )


def home(request):
    return render(request, "home.html")


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"message": "User created", "user": UserSerializer(user).data},
            status=201
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class BranchListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = Branch.objects.all().order_by("city", "name")
        return Response(BranchSerializer(qs, many=True).data)


class AppointmentCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.is_staff:
            return Response(
                {"detail": "Zaposleni ne mogu rezervisati termine."},
                status=403
        )
        serializer = AppointmentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        appt = serializer.save()
        return Response(AppointmentSerializer(appt).data, status=status.HTTP_201_CREATED)


class MyAppointmentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Appointment.objects.filter(user=request.user).order_by("-start_time")
        return Response(AppointmentSerializer(qs, many=True).data)


class CancelAppointmentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        appt = get_object_or_404(Appointment, pk=pk)

        if appt.user_id != request.user.id:
            return Response({"detail": "Nemaš pravo da otkažeš ovaj termin."}, status=403)

        if appt.status == "canceled":
            return Response({"detail": "Termin je već otkazan."}, status=400)

        appt.status = "canceled"
        appt.save(update_fields=["status"])
        return Response({"message": "Termin otkazan."})


class AdminAllAppointmentsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = Appointment.objects.all().order_by("-start_time")
        return Response(AppointmentSerializer(qs, many=True).data)
    

class EmployeeAppointmentsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsEmployeeRole]

    def get(self, request):
        if not request.user.branch_id:
            return Response(
                {"detail": "Zaposleni nema dodeljenu filijalu."},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = Appointment.objects.filter(
            branch_id=request.user.branch_id,
            status="booked"
        ).order_by("start_time")

        return Response(AppointmentSerializer(qs, many=True).data)


class BranchSlotsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, branch_id: int):
        date_str = request.query_params.get("date")  
        if not date_str:
            return Response({"detail": "Query param 'date' je obavezan (YYYY-MM-DD)."}, status=400)

        branch = get_object_or_404(Branch, pk=branch_id)

        try:
            day = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"detail": "Pogrešan format datuma. Koristi YYYY-MM-DD."}, status=400)

        tz = timezone.get_current_timezone()

        start_dt = timezone.make_aware(datetime.combine(day, branch.open_time), tz)
        end_dt = timezone.make_aware(datetime.combine(day, branch.close_time), tz)

        slot_delta = timezone.timedelta(minutes=branch.slot_minutes)

        booked = set(
            Appointment.objects.filter(
                branch=branch,
                status="booked",
                start_time__gte=start_dt,
                start_time__lt=end_dt,
            ).values_list("start_time", flat=True)
        )

        slots = []
        cur = start_dt
        now = timezone.now()

        while cur < end_dt:
            if cur > now and cur not in booked:
                slots.append(cur.isoformat())
            cur += slot_delta

        return Response({
            "branch_id": branch.id,
            "date": date_str,
            "slot_minutes": branch.slot_minutes,
            "open_time": branch.open_time.strftime("%H:%M"),
            "close_time": branch.close_time.strftime("%H:%M"),
            "available_slots": slots
        })
    
def build_context() -> str:
    branches = Branch.objects.all().order_by("city", "name")[:10]
    branch_lines = [
        f"- {b.name} ({b.city}): {b.open_time.strftime('%H:%M')}–{b.close_time.strftime('%H:%M')}"
        for b in branches
    ]

    parts = []
    if branch_lines:
        parts.append("Filijale (top 10):\n" + "\n".join(branch_lines))
    try:
        faqs = FAQEntry.objects.filter(is_active=True).order_by("category")[:10]
        faq_lines = [f"- Q: {f.question} | A: {f.answer[:120]}..." for f in faqs]
        if faq_lines:
            parts.append("FAQ (top 10):\n" + "\n".join(faq_lines))
    except Exception:
        pass

    return "\n\n".join(parts)


class ChatView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = ChatRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        msg = ser.validated_data["message"]
        session_id = ser.validated_data.get("session_id") or "default"

        user_obj = request.user if request.user.is_authenticated else None

        ChatMessage.objects.create(
            user=user_obj,
            session_id=session_id,
            role="user",
            content=msg,
        )

        faq = match_faq(msg)
        if faq:
            ChatMessage.objects.create(
                user=user_obj,
                session_id=session_id,
                role="assistant",
                content=faq["reply"],
            )
            return Response({"intent": faq.get("intent", "faq"), "reply": faq["reply"], "link": ""})

        try:
            context = build_context()
            ai = groq_chat_json(msg, context=context)

            reply = ai.get("reply", "Nemam odgovor trenutno.")
            intent = ai.get("intent", "unknown")
            link = ai.get("link", "")

            ChatMessage.objects.create(
                user=user_obj,
                session_id=session_id,
                role="assistant",
                content=reply,
            )

            return Response({"intent": intent, "reply": reply, "link": link or ""})

        except Exception:
            fallback = "Mogu da pomognem sa informacijama o filijalama, terminima, dokumentima i uslugama banke."
            ChatMessage.objects.create(
                user=user_obj,
                session_id=session_id,
                role="assistant",
                content=fallback,
            )
            return Response({"intent": "fallback", "reply": fallback, "link": ""})

class ChatHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = ChatMessage.objects.filter(
            user=request.user
        ).order_by("created_at")

        data = [
            {
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at,
            }
            for m in qs
        ]

        return Response(data)

