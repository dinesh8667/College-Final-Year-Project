from django.urls import path
from . import views
# NEW: Import the JWT login views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('products/', views.get_products, name='get_products'),
    path('products/<int:product_id>/', views.get_product_details, name='get_product_details'),
    path('manual-fit-check/', views.manual_fit_check, name='manual_fit_check'),
    path('admin/add-product/', views.add_product, name='add_product'),
    path('admin/upload-product-image/<int:product_id>/', views.upload_product_image, name='upload_product_image'),
    path('measure-from-image/', views.measure_from_image, name='measure_from_image'),
    path('generate-try-on/', views.generate_tryon, name='generate_tryon'),
    
    # Authentication
    path('register/', views.register_user, name='register_user'),
    
    # NEW: The Login Endpoints
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

#http://127.0.0.1:8000/api//
#http://127.0.0.1:8000/admin/
#python manage.py createsuperuser