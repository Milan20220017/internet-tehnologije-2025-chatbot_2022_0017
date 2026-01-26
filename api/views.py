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
User = get_user_model()


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


class BranchSlotsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, branch_id: int):
        date_str = request.query_params.get("date")  # YYYY-MM-DD
        if not date_str:
            return Response({"detail": "Query param 'date' je obavezan (YYYY-MM-DD)."}, status=400)

        branch = get_object_or_404(Branch, pk=branch_id)

        try:
            day = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"detail": "Pogrešan format datuma. Koristi YYYY-MM-DD."}, status=400)

        # napravi sve slotove za taj dan u okviru radnog vremena
        tz = timezone.get_current_timezone()

        start_dt = timezone.make_aware(datetime.combine(day, branch.open_time), tz)
        end_dt = timezone.make_aware(datetime.combine(day, branch.close_time), tz)

        slot_delta = timezone.timedelta(minutes=branch.slot_minutes)

        # zauzeti slotovi (samo booked)
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
            # ne nudimo prošle slotove
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

    # FAQ je opcionalno (samo ako postoji model/tabela)
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

        # 1️⃣ FAQ layer
        faq = match_faq(msg)
        if faq:
            ChatMessage.objects.create(
                user=request.user if request.user.is_authenticated else None,
                session_id=session_id,
                role="user",
                content=msg,
            )
            ChatMessage.objects.create(
                user=request.user if request.user.is_authenticated else None,
                session_id=session_id,
                role="assistant",
                content=faq["reply"],
            )

            return Response({
                "intent": "faq",
                "reply": faq["reply"]
            })

        # 2️⃣ AI fallback (Groq)
        context = build_context()
        ai = groq_chat_json(msg, context=context)

        reply = ai.get("reply", "Nemam odgovor trenutno.")
        intent = ai.get("intent", "unknown")
        link = ai.get("link", "")

        ChatMessage.objects.create(
            user=request.user if request.user.is_authenticated else None,
            session_id=session_id,
            role="user",
            content=msg,
        )
        ChatMessage.objects.create(
            user=request.user if request.user.is_authenticated else None,
            session_id=session_id,
            role="assistant",
            content=reply,
        )

        return Response({
            "intent": intent,
            "reply": reply,
            "link": link or ""
        })




        # 2️⃣ AI fallback
        context = build_context()
        ai = groq_chat_json(msg, context=context)

        reply = ai.get("reply", "Nemam odgovor trenutno.")
        intent = ai.get("intent", "unknown")
        link = ai.get("link", "")

        ChatMessage.objects.create(
            user=request.user if request.user.is_authenticated else None,
            session_id=session_id,
            role="user",
            content=msg,
        )
        ChatMessage.objects.create(
            user=request.user if request.user.is_authenticated else None,
            session_id=session_id,
            role="assistant",
            content=reply,
        )

        return Response({
            "intent": intent,
            "reply": reply,
            "link": link or ""
        })

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

