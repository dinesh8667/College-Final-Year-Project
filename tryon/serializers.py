from django.contrib.auth.models import User
from rest_framework import serializers

class UserRegistrationSerializer(serializers.ModelSerializer):
    # This ensures the password is never sent back in an API response
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        # create_user() automatically hashes the password for us!
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user