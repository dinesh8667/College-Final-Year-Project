from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('tryon.urls')), # Your existing API routes
    
    # --- New Authentication Endpoints ---
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'), # This is the LOGIN endpoint
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]