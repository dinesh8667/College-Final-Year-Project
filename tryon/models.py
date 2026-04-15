# tryon/models.py
from django.db import models
from django.utils.timezone import now

class User(models.Model):
    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(max_length=100, unique=True)
    user_password = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=now)

    class Meta:
        db_table = 'users'

class Product(models.Model):
    product_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=50)
    price = models.FloatField()
    # Django handles image uploads automatically via ImageField
    raw_image = models.ImageField(upload_to='products/raw/') 
    raw_back_image = models.ImageField(upload_to='products/raw/', null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=now)

    class Meta:
        db_table = 'products'

class ProductImage(models.Model):
    image_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, related_name='ui_images', on_delete=models.CASCADE)
    image_path = models.ImageField(upload_to='products/ui/')
    view_type = models.CharField(max_length=20, default='ui') # Added based on your routes logic
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = 'product_images'

class ProductSize(models.Model):
    size_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, related_name='sizes', on_delete=models.CASCADE)
    size_label = models.CharField(max_length=10)
    length = models.FloatField(null=True, blank=True)
    chest = models.FloatField(null=True, blank=True)
    shoulder = models.FloatField(null=True, blank=True)
    waist = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'product_sizes'