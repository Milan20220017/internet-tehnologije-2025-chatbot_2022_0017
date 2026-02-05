from datetime import datetime, timedelta, time as dtime

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework.test import APIClient

from .models import Branch, Appointment

User = get_user_model()


def make_future_slot(branch: Branch, days_ahead: int = 1, hour: int = 10, minute: int = 0):
    """
    Kreira timezone-aware datetime u budućnosti, poravnat na slot (npr. 30 min),
    unutar radnog vremena filijale.
    """
    tz = timezone.get_current_timezone()
    day = (timezone.localdate() + timedelta(days=days_ahead))
    naive = datetime.combine(day, dtime(hour, minute))
    return timezone.make_aware(naive, tz)


class BasicTest(TestCase):
    def test_project_runs(self):
        self.assertTrue(True)


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_and_login_returns_tokens(self):
        r = self.client.post(
            "/api/auth/register/",
            {
                "username": "testuser",
                "email": "test@example.com",
                "password": "Testpass123!",
                "password2": "Testpass123!",
            },
            format="json",
        )
        self.assertIn(r.status_code, [200, 201])

        r = self.client.post(
            "/api/auth/login/",
            {"username": "testuser", "password": "Testpass123!"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data)
        self.assertIn("refresh", r.data)

    def test_me_requires_auth(self):
        r = self.client.get("/api/auth/me/")
        self.assertEqual(r.status_code, 401)


class BranchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(
            name="Banka Centar",
            address="Ulica 1",
            city="Belgrade",
            open_time=dtime(8, 0),
            close_time=dtime(16, 0),
            slot_minutes=30,
        )

    def test_branches_list_public(self):
        r = self.client.get("/api/branches/")
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.data, list)
        self.assertGreaterEqual(len(r.data), 1)


class AppointmentFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.branch = Branch.objects.create(
            name="Banka Novi Beograd",
            address="Bul 1",
            city="Belgrade",
            open_time=dtime(8, 0),
            close_time=dtime(16, 0),
            slot_minutes=30,
        )

        self.user = User.objects.create_user(
            username="milan",
            email="milan@example.com",
            password="Testpass123!",
            role="user",
        )

        self.employee = User.objects.create_user(
            username="emp1",
            email="emp1@example.com",
            password="Testpass123!",
            role="employee",
            branch=self.branch,
        )

    def auth_as(self, user: User):
        self.client.force_authenticate(user=user)

    def test_slots_endpoint_returns_available_slots_future_day(self):
        future_day = (timezone.localdate() + timedelta(days=1)).strftime("%Y-%m-%d")
        r = self.client.get(f"/api/branches/{self.branch.id}/slots/?date={future_day}")
        self.assertEqual(r.status_code, 200)
        self.assertIn("available_slots", r.data)
        self.assertIsInstance(r.data["available_slots"], list)

    def test_user_can_create_appointment(self):
        self.auth_as(self.user)
        start_time = make_future_slot(self.branch, days_ahead=1, hour=10, minute=0)

        r = self.client.post(
            "/api/appointments/",
            {"branch_id": self.branch.id, "start_time": start_time.isoformat()},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["status"], "booked")
        self.assertEqual(r.data["user_username"], self.user.username)

    def test_cannot_book_same_slot_twice(self):
        self.auth_as(self.user)
        start_time = make_future_slot(self.branch, days_ahead=1, hour=10, minute=0)

        r1 = self.client.post(
            "/api/appointments/",
            {"branch_id": self.branch.id, "start_time": start_time.isoformat()},
            format="json",
        )
        self.assertEqual(r1.status_code, 201)

        r2 = self.client.post(
            "/api/appointments/",
            {"branch_id": self.branch.id, "start_time": start_time.isoformat()},
            format="json",
        )
        self.assertEqual(r2.status_code, 400)

    def test_employee_cannot_create_appointment(self):
        self.auth_as(self.employee)
        start_time = make_future_slot(self.branch, days_ahead=1, hour=11, minute=0)

        r = self.client.post(
            "/api/appointments/",
            {"branch_id": self.branch.id, "start_time": start_time.isoformat()},
            format="json",
        )
        self.assertEqual(r.status_code, 403)

    def test_my_appointments_only_returns_own(self):
        self.auth_as(self.user)
        start_time = make_future_slot(self.branch, days_ahead=1, hour=12, minute=0)
        self.client.post(
            "/api/appointments/",
            {"branch_id": self.branch.id, "start_time": start_time.isoformat()},
            format="json",
        )

        r = self.client.get("/api/appointments/my/")
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.data, list)
        self.assertGreaterEqual(len(r.data), 1)
        for item in r.data:
            self.assertEqual(item["user_username"], self.user.username)

    def test_idor_cancel_only_owner_can_cancel(self):
        self.auth_as(self.user)
        start_time = make_future_slot(self.branch, days_ahead=1, hour=13, minute=0)
        r_create = self.client.post(
            "/api/appointments/",
            {"branch_id": self.branch.id, "start_time": start_time.isoformat()},
            format="json",
        )
        self.assertEqual(r_create.status_code, 201)
        appt_id = r_create.data["id"]

        other = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="Testpass123!",
            role="user",
        )
        self.auth_as(other)
        r_cancel = self.client.post(f"/api/appointments/{appt_id}/cancel/", format="json")
        self.assertEqual(r_cancel.status_code, 403)

        self.auth_as(self.user)
        r_cancel2 = self.client.post(f"/api/appointments/{appt_id}/cancel/", format="json")
        self.assertEqual(r_cancel2.status_code, 200)
        self.assertIn("message", r_cancel2.data)
