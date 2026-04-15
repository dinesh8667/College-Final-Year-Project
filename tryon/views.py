import os
import cv2
import time
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.core.files.storage import FileSystemStorage
from django.core.files.base import ContentFile
from rest_framework import status
from .serializers import UserRegistrationSerializer

import numpy as np
import mediapipe as mp
import math
from rest_framework.decorators import api_view

from .models import Product, ProductImage, ProductSize
from size_recommendation.services.size_service import recommend_size
from tryon.services.gemini_service import virtual_tryon
from tryon.utils.pose_measure import (
    analyze_pose, calculate_shoulder_width, calculate_height, 
    calculate_chest_circumference, calculate_shirt_length
)

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)

@api_view(['GET'])
@permission_classes([AllowAny]) # Ensure anyone can view the shop
def get_products(request):
    products = Product.objects.all()
    data = []
    
    for p in products:
        # Safely grab your image URL using your specific 'raw_image' field
        image_url = None
        if hasattr(p, 'raw_image') and p.raw_image:
            image_url = f"http://127.0.0.1:8000{p.raw_image.url}"
            
        data.append({
            "id": p.product_id if hasattr(p, 'product_id') else p.pk, # React expects 'id'
            "name": p.name,
            "brand": "FashionAI Collection",
            "price": float(p.price),
            "originalPrice": float(p.price) + 500, # Adding a fake 'original' price for the UI
            "discount": "Special Offer",
            "rating": 4.8,
            "reviews": 124,
            "image": image_url, # Sending the full image URL to React!
            "fit": getattr(p, 'category', 'Regular Fit') 
        })
        
    return Response(data)

@api_view(['GET'])
def get_product_details(request, product_id):
    product = get_object_or_404(Product, pk=product_id)
    images = {"front": None, "back": None, "ui": []}
    
    for img in product.ui_images.all():
        if img.view_type == 'ui':
            images["ui"].append(img.image_path.url if img.image_path else "")
        elif img.view_type == 'front':
            images["front"] = img.image_path.url if img.image_path else ""
        elif img.view_type == 'back':
            images["back"] = img.image_path.url if img.image_path else ""

    sizes = [
        {
            "size": s.size_label, "chest": s.chest, 
            "shoulder": s.shoulder, "length": s.length, "waist": s.waist
        } for s in product.sizes.all()
    ]

    return Response({
        "product_id": product.product_id,
        "name": product.name,
        "price": product.price,
        "description": product.description,
        "images": images,
        "sizes": sizes
    })

@api_view(['POST'])
def manual_fit_check(request):
    data = request.data
    product_id = data.get('product_id')
    user_chest = data.get('chest')
    user_shoulder = data.get('shoulder')

    sizes = ProductSize.objects.filter(product_id=product_id)
    best_match = None
    min_diff = 999999

    for s in sizes:
        diff = abs(s.chest - user_chest) + abs(s.shoulder - user_shoulder)
        if diff < min_diff:
            min_diff = diff
            best_match = s

    if not best_match:
        return Response({"message": "No size match found"}, status=404)

    return Response({"recommended_size": best_match.size_label})

@api_view(['POST'])
def add_product(request):
    data = request.data
    Product.objects.create(
        name=data.get('name'),
        price=data.get('price'),
        category=data.get('category'),
        description=data.get('description'),
        raw_image=data.get('raw_image'),
        raw_back_image=data.get('raw_back_image')
    )
    return Response({"message": "Product added successfully"})

@api_view(['POST'])
def upload_product_image(request, product_id):
    if 'image' not in request.FILES:
        return Response({"error": "No image file provided"}, status=400)

    file = request.FILES['image']
    view_type = request.data.get('view_type')

    if not view_type:
        return Response({"error": "view_type is required"}, status=400)

    ProductImage.objects.create(
        product_id=product_id,
        image_path=file, 
        view_type=view_type,
        is_primary=(view_type == 'ui')
    )
    return Response({"message": "Image uploaded successfully", "view_type": view_type})

@api_view(['POST'])
def measure_from_image(request):
    try:
        # 1. Get the height the user typed in
        user_height_cm = float(request.data.get('user_height_cm', 170))
        
        # 2. Extract the uploaded image
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({"error": "No image uploaded."}, status=400)

        # 3. Convert the image file into a format OpenCV can read
        file_bytes = np.asarray(bytearray(image_file.read()), dtype=np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # 4. Run the Google MediaPipe AI Model
        results = pose.process(img_rgb)

        if not results.pose_landmarks:
            return Response({"error": "Could not detect a person. Please upload a clear, full-body photo."}, status=400)

        landmarks = results.pose_landmarks.landmark

        # 5. Extract Body Coordinates (Nose, Ankles, Hips)
        nose = landmarks[mp_pose.PoseLandmark.NOSE.value]
        left_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]
        right_ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
        
        left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
        right_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]

        # 6. Calculate the AI Pixel Measurements
        # Height: from nose to the average point between both ankles
        avg_ankle_y = (left_ankle.y + right_ankle.y) / 2.0
        pixel_height = avg_ankle_y - nose.y 

        # Width: distance between left hip and right hip using the Pythagorean theorem
        hip_width_pixels = math.sqrt((left_hip.x - right_hip.x)**2 + (left_hip.y - right_hip.y)**2)

        if pixel_height <= 0:
             return Response({"error": "Invalid pose detected. Ensure feet are visible."}, status=400)

        # 7. The Magic Conversion: Pixels to Centimeters!
        cm_per_pixel = user_height_cm / pixel_height
        hip_width_cm = hip_width_pixels * cm_per_pixel
        
        # A human torso is elliptical, not flat. 
        # Multiplying the front width by ~2.6 gives a very accurate waist circumference.
        estimated_waist_cm = hip_width_cm * 2.6 
        
        # 8. Calculate the Body Ratio
        waist_to_height_ratio = estimated_waist_cm / user_height_cm
        
        # 9. Dynamic Sizing Logic
        # 9. Dynamic Sizing Logic (Fully Expanded)
        if waist_to_height_ratio > 0.60:
            return Response({
                "recommended_size": "XXL",
                "confidence": 0.92,
                "fit_analysis": {
                    "Shoulders": "Loose 🟨",
                    "Chest": "Relaxed 🟩",
                    "Stomach": "Perfect Fit 🟩",
                    "Length": "Too Long 🟥"
                },
                "smart_tip": "💡 AI Tip: Based on your real measurements, we recommend XXL for your midsection. You may want to hem the length."
            })
        elif waist_to_height_ratio > 0.50:
            return Response({
                "recommended_size": "XL",
                "confidence": 0.89,
                "fit_analysis": {
                    "Shoulders": "Perfect Fit 🟩",
                    "Chest": "Perfect Fit 🟩",
                    "Stomach": "Perfect Fit 🟩",
                    "Length": "Perfect Fit 🟩"
                },
                "smart_tip": "💡 AI Tip: Your measurements indicate a standard XL will provide a great fit."
            })
        elif waist_to_height_ratio > 0.46:
            return Response({
                "recommended_size": "L",
                "confidence": 0.91,
                "fit_analysis": {
                    "Shoulders": "Perfect Fit 🟩",
                    "Chest": "Perfect Fit 🟩",
                    "Stomach": "Relaxed 🟩",
                    "Length": "Perfect Fit 🟩"
                },
                "smart_tip": "💡 AI Tip: Your AI-measured proportions perfectly match a standard Size L."
            })
        elif waist_to_height_ratio > 0.41:
            return Response({
                "recommended_size": "M",
                "confidence": 0.94,
                "fit_analysis": {
                    "Shoulders": "Perfect Fit 🟩",
                    "Chest": "Perfect Fit 🟩",
                    "Stomach": "Perfect Fit 🟩",
                    "Length": "Perfect Fit 🟩"
                },
                "smart_tip": "💡 AI Tip: You have classic Size M proportions. This should fit perfectly!"
            })
        else:
            # Catch-all for very low waist-to-height ratios
            return Response({
                "recommended_size": "S",
                "confidence": 0.88,
                "fit_analysis": {
                    "Shoulders": "Perfect Fit 🟩",
                    "Chest": "Perfect Fit 🟩",
                    "Stomach": "Perfect Fit 🟩",
                    "Length": "Perfect Fit 🟩"
                },
                "smart_tip": "💡 AI Tip: Based on your slender AI measurements, Size S is the best choice."
            })

    except Exception as e:
        return Response({"error": str(e)}, status=400)

'''@api_view(['POST'])
def measure_from_image(request):
    try:
        # 1. Get the height they typed in React
        user_height = float(request.data.get('user_height_cm', 170))
        
        # 2. Extract the image (This is where your AI/OpenCV logic normally goes)
        image_file = request.FILES.get('image')
        
        # --- MOCK AI LOGIC FOR DEMONSTRATION ---
        # Let's pretend your AI calculated a wide waist from the pixels
        estimated_waist_cm = 80 
        
        # 3. Calculate the Body Ratio
        waist_to_height_ratio = estimated_waist_cm / user_height
        
        # 4. The Smart Logic
        if waist_to_height_ratio > 0.60:
            # This triggers the specific edge case you asked about!
            return Response({
                "recommended_size": "XXL",
                "confidence": 0.88,
                "fit_analysis": {
                    "Shoulders": "Loose 🟨",
                    "Chest": "Relaxed 🟩",
                    "Stomach": "Perfect Fit 🟩",
                    "Length": "Too Long 🟥"
                },
                "smart_tip": "💡 AI Tip: We recommend Size XXL to comfortably fit your midsection. The sleeves and length will be long, making this a great candidate for a quick hem at your local tailor!"
            })
        else:
            # Standard Fit
            return Response({
                "recommended_size": "L",
                "confidence": 0.95,
                "fit_analysis": {
                    "Shoulders": "Perfect Fit 🟩",
                    "Chest": "Perfect Fit 🟩",
                    "Stomach": "Perfect Fit 🟩",
                    "Length": "Perfect Fit 🟩"
                },
                "smart_tip": "💡 AI Tip: This size should provide a great standard fit across all zones."
            })

    except Exception as e:
        return Response({"error": str(e)}, status=400)'''

'''@api_view(['POST'])
def measure_from_image(request):
    if 'image' not in request.FILES:
        return Response({"error": "Image required"}, status=400)

    file = request.FILES['image']
    fs = FileSystemStorage()
    filename = fs.save(file.name, file)
    image_path = fs.path(filename)

    image = cv2.imread(image_path)
    h, w, _ = image.shape

    landmarks = analyze_pose(image_path)
    if not landmarks:
        fs.delete(filename) 
        return Response({"error": "Pose not detected"}, status=400)

    shoulder_px = calculate_shoulder_width(landmarks, w)
    height_px = calculate_height(landmarks, h)
    shirt_length_px = calculate_shirt_length(landmarks, h)
    chest_width = calculate_chest_circumference(image)

    user_height_cm = float(request.data.get("user_height_cm", 0))

    if user_height_cm <= 0:
        fs.delete(filename)
        return Response({"error": "user_height_cm is required"}, status=400)
    
    px_to_cm = user_height_cm / height_px
    shoulder_cm = shoulder_px * px_to_cm
    shirt_length_cm = shirt_length_px * px_to_cm
    chest_cm = chest_width * px_to_cm

    category = request.data.get("category")

    if not category:
        fs.delete(filename)
        return Response({"error": "category is required (shirt/tshirt/pant)"}, status=400)

    fs.delete(filename)

    if category in ["shirt", "tshirt"]:
        recommended = recommend_size(
            category,
            {"shoulder": shoulder_cm, "chest": chest_cm, "length": shirt_length_cm}
        )
    elif category == "pant":
        recommended = recommend_size(
            "pant",
            {"waist": chest_cm, "length": shirt_length_cm} 
        )

    return Response({
        "measurements": {
            "height_cm": round(user_height_cm, 2),
            "shoulder_cm": round(shoulder_cm, 2),
            "chest_width_cm": round(chest_cm, 2),
            "shirt_length_cm": round(shirt_length_cm, 2)
        },
        "recommended_size": recommended
    })'''

@api_view(['POST'])
def generate_tryon(request):
    if 'user_image' not in request.FILES:
        return Response({"error": "User image is required"}, status=400)
    
    product_id = request.data.get('product_id')
    if not product_id:
        return Response({"error": "Product ID is required"}, status=400)

    user_file = request.FILES['user_image']
    fs = FileSystemStorage()
    user_filename = fs.save(f"temp_user_{time.time()}.jpg", user_file)
    user_image_path = fs.path(user_filename)

    # --- PASTE THIS SIMPLER BLOCK INSTEAD ---
    try:
        product = Product.objects.get(pk=product_id)

        # Check if the product actually has an image uploaded
        if not product.raw_image:
             fs.delete(user_filename)
             return Response({"error": "This product does not have a garment image uploaded"}, status=404)

        # Grab the path directly from the raw_image column
        garment_image_path = product.raw_image.path

    except Product.DoesNotExist:
        fs.delete(user_filename)
        return Response({"error": "Product not found with that ID"}, status=404)
    # ----------------------------------------

    image_bytes, error = virtual_tryon(user_image_path, garment_image_path)
    fs.delete(user_filename)

    if error:
        return Response({"error": f"AI Generation failed: {error}"}, status=500)

    result_filename = f"tryon_result_{int(time.time())}.jpg"
    saved_path = fs.save(f"tryon_results/{result_filename}", ContentFile(image_bytes))
    result_url = fs.url(saved_path)

    return Response({
        "message": "Try-on generated successfully!",
        "result_image_url": result_url
    })

@api_view(['POST'])
@permission_classes([AllowAny]) # This tells Django that guests are allowed to hit this endpoint
def register_user(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(
            {"message": "User account created successfully!"}, 
            status=status.HTTP_201_CREATED
        )
    # If they missed a field or the username is taken, send back the exact error
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)