from django.contrib import admin
from .models import User, Branch, Appointment, FAQEntry, ChatMessage
from django import forms
from django.contrib import admin
from .models import User


class UserAdminForm(forms.ModelForm):
    """
    Ova forma radi 2 stvari:
    1) Validira pravila (role/branch/is_staff/is_superuser)
    2) Ako je password unesen kao "plain text" u adminu, pretvori ga u hash (set_password)
    """

    class Meta:
        model = User
        fields = "__all__"

    def clean(self):
        cleaned = super().clean()
        role = cleaned.get("role")
        branch = cleaned.get("branch")
        is_staff = cleaned.get("is_staff")
        is_superuser = cleaned.get("is_superuser")

        # SUPERUSER → admin
        if is_superuser:
            cleaned["role"] = "admin"
            cleaned["is_staff"] = True
            cleaned["branch"] = None
            return cleaned

        # EMPLOYEE → mora imati branch
        if role == "employee":
            cleaned["is_staff"] = True
            if not branch:
                raise forms.ValidationError("Zaposleni mora imati dodijeljenu filijalu/banku.")

        # USER → NE SMIJE imati branch
        if role == "user" and branch is not None:
            raise forms.ValidationError("Obični korisnik ne može imati dodijeljenu filijalu/banku.")

        # is_staff ne smije biti user
        if is_staff and role == "user":
            raise forms.ValidationError("Ako je is_staff=True, role mora biti employee ili admin.")

        return cleaned

    def save(self, commit=True):
        """
        Ako je password unesen kao običan tekst u adminu, hashuj ga.
        Ako je već hashovan, ne diraj.
        """
        user = super().save(commit=False)

        raw = user.password or ""
        # provjera: da li je već hash (pbkdf2_..., argon2..., bcrypt..., scrypt...)
        is_hashed = False
        try:
            identify_hasher(raw)
            is_hashed = True
        except Exception:
            is_hashed = False

        if raw and not is_hashed:
            user.set_password(raw)

        if commit:
            user.save()
            self.save_m2m()
        return user


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    form = UserAdminForm
    list_display = ("username", "email", "role", "branch", "is_staff", "is_superuser")
    list_filter = ("role", "branch", "is_staff", "is_superuser")
    search_fields = ("username", "email")

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "address", "open_time", "close_time", "slot_minutes")
    list_filter = ("city",)
    search_fields = ("name", "city", "address")


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "branch", "start_time", "status", "created_at")
    list_filter = ("status", "branch", "start_time")
    search_fields = ("user__username", "branch__name", "branch__address")
    ordering = ("-start_time",)


@admin.register(FAQEntry)
class FAQEntryAdmin(admin.ModelAdmin):
    list_display = ("intent", "question", "is_active", "updated_at")
    list_filter = ("intent", "is_active")
    search_fields = ("question", "answer")
    ordering = ("intent", "question")
    actions = ["activate_selected", "deactivate_selected"]

    def activate_selected(self, request, queryset):
        queryset.update(is_active=True)

    def deactivate_selected(self, request, queryset):
        queryset.update(is_active=False)

    activate_selected.short_description = "Activate selected FAQ entries"
    deactivate_selected.short_description = "Deactivate selected FAQ entries"


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "session_id", "role", "short_content")
    list_filter = ("role", "created_at")
    search_fields = ("content", "user__username", "session_id")
    ordering = ("-created_at",)

    def short_content(self, obj):
        return (obj.content[:80] + "...") if len(obj.content) > 80 else obj.content
