from google import genai
from google.genai import types

# 🔑 Configure client (Make sure this is your active API key)
client = genai.Client(api_key="AIzaSyDNQvfkXW37G8tm3srdtRxhVCUaCqiVfWM")

def load_image(path):
    with open(path, "rb") as f:
        return f.read()

def virtual_tryon(user_image_path, shirt_image_path):
    try:
        user_img = load_image(user_image_path)
        shirt_img = load_image(shirt_image_path)

        response = client.models.generate_content(
            model="gemini-2.5-flash-image", 
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                "Replace only the specified garment on the person with the clothing from the reference image. If replacing the upper garment, keep the original lower garment unchanged. If replacing the lower garment, keep the original upper garment unchanged. Preserve the person face, identity, hairstyle, body proportions, pose, skin tone, background, lighting, and camera angle exactly as in the base image. The new garment must match the reference exactly in color, design, fabric texture, fit, stitching, logo placement, and style. Ensure realistic fit according to the body shape and posture. Apply natural fabric folds, wrinkles, stretching, gravity effects, and accurate shadow blending. Remove only the targeted garment and blend the new clothing seamlessly without distortion, blur, floating fabric, or unnatural edges. Maintain photorealism, high resolution, realistic lighting, and natural proportions. And remove the complete specific area of garment already this persion is wearing. Give me image in same aspect ratio of person image i uploaded"
                            )
                        },
                        {"inline_data": {"mime_type": "image/jpg", "data": user_img}},
                        {"inline_data": {"mime_type": "image/jpg", "data": shirt_img}}
                    ]
                }
            ],
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"]
            )
        )

        if not response.candidates:
            return None, "No candidates returned."

        for part in response.candidates[0].content.parts:
            if part.inline_data:
                # THIS IS THE MAGIC FIX: We return the data back to Django!
                return part.inline_data.data, None

        return None, "No image returned. Model may have returned only text."

    except Exception as e:
        return None, str(e)