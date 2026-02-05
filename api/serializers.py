from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import Branch, Appointment

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role")
        read_only_fields = ("id",)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("username", "email", "password", "password2")  

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Lozinke se ne poklapaju."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.role = "user"  
        user.set_password(password)
        user.save()
        return user


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ("id", "name", "address", "city", "open_time", "close_time", "slot_minutes")

class AppointmentSerializer(serializers.ModelSerializer):
    branch = BranchSerializer(read_only=True)
    branch_id = serializers.IntegerField(write_only=True)

    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Appointment
        fields = ("id", "branch", "branch_id", "user_username", "start_time", "status", "created_at")
        read_only_fields = ("id", "status", "created_at", "branch", "user_username")

    def validate_start_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Ne možeš zakazati termin u prošlosti.")
        return value

    def validate(self, attrs):
        branch_id = attrs.get("branch_id")
        start_time = attrs.get("start_time")
        request = self.context["request"]

        try:
            branch = Branch.objects.get(id=branch_id)
        except Branch.DoesNotExist:
            raise serializers.ValidationError({"branch_id": "Filijala ne postoji."})

        st_local = timezone.localtime(start_time)
        start_t = st_local.time()

        if not (branch.open_time <= start_t < branch.close_time):
            raise serializers.ValidationError({"start_time": "Termin mora biti u okviru radnog vremena filijale."})

        if st_local.second != 0 or st_local.microsecond != 0:
            raise serializers.ValidationError({"start_time": "Vreme mora biti na tačan minut (bez sekundi)."})
        if (st_local.minute % branch.slot_minutes) != 0:
            raise serializers.ValidationError({"start_time": f"Termin mora biti poravnat na slot od {branch.slot_minutes} min."})

        exists = Appointment.objects.filter(
            branch=branch,
            start_time=start_time,
            status="booked"
        ).exists()
        if exists:
            raise serializers.ValidationError({"start_time": "Termin je već zauzet."})

        attrs["branch"] = branch
        attrs["user"] = request.user
        return attrs

    def create(self, validated_data):
        branch = validated_data.pop("branch")
        user = validated_data.pop("user")
        validated_data.pop("branch_id", None)
        return Appointment.objects.create(branch=branch, user=user, **validated_data)

    
class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
    session_id = serializers.CharField(max_length=64, required=False, allow_blank=True, default="")
