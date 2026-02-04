from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MeView, ChatHistoryView, EmployeeAppointmentsView, WeatherView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from .views import (
    BranchListView,
    AppointmentCreateView,
    MyAppointmentsView,
    CancelAppointmentView,
    AdminAllAppointmentsView,
    BranchSlotsView,
    ChatView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeView.as_view(), name="me"),

    path("branches/", BranchListView.as_view(), name="branches"),
    path("appointments/", AppointmentCreateView.as_view(), name="appointments_create"),
    path("appointments/my/", MyAppointmentsView.as_view(), name="appointments_my"),
    path("appointments/<int:pk>/cancel/", CancelAppointmentView.as_view(), name="appointments_cancel"),

    path("admin/appointments/", AdminAllAppointmentsView.as_view(), name="admin_all_appointments"),
    path("branches/<int:branch_id>/slots/", BranchSlotsView.as_view(), name="branch_slots"),
    path("chat/", ChatView.as_view(), name="chat"),
    path("chat/history/", ChatHistoryView.as_view(), name="chat_history"),
    path("employee/appointments/", EmployeeAppointmentsView.as_view(), name="employee_appointments"),
    path("weather/", WeatherView.as_view(), name="weather"),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

