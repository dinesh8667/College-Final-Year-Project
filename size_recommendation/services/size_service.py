# size_recommendation/services/size_service.py

SIZE_CHARTS = {
    "shirt": [
        {"brand": 38, "label": "S", "shoulder": 43.18, "chest": 52.07, "length": 66.04},
        {"brand": 39, "label": "M", "shoulder": 45.72, "chest": 54.61, "length": 68.58},
        {"brand": 40, "label": "L", "shoulder": 48.26, "chest": 57.15, "length": 71.12},
        {"brand": 42, "label": "XL", "shoulder": 50.80, "chest": 59.69, "length": 73.66},
        {"brand": 44, "label": "XXL", "shoulder": 52.71, "chest": 64.14, "length": 75.57},
        {"brand": 46, "label": "XXXL", "shoulder": 54.61, "chest": 67.31, "length": 77.47}
    ],
    "tshirt": [
        {"brand": 38, "label": "S", "shoulder": 41.91, "chest": 50.17, "length": 68.58},
        {"brand": 39, "label": "M", "shoulder": 45.72, "chest": 52.71, "length": 71.12},
        {"brand": 40, "label": "L", "shoulder": 46.99, "chest": 55.25, "length": 73.66},
        {"brand": 42, "label": "XL", "shoulder": 49.53, "chest": 57.79, "length": 76.20},
        {"brand": 44, "label": "XXL", "shoulder": 52.07, "chest": 61.60, "length": 78.74}
    ],
    "pant": [
        {"brand": 28, "label": "XS", "waist": 71.12, "length": 114.30},
        {"brand": 30, "label": "M", "waist": 76.20, "length": 114.30},
        {"brand": 32, "label": "L", "waist": 81.28, "length": 114.30},
        {"brand": 36, "label": "XL", "waist": 91.44, "length": 114.30},
        {"brand": 38, "label": "XXL", "waist": 96.52, "length": 114.30},
        {"brand": 40, "label": "XXXL", "waist": 101.60, "length": 114.30}
    ]
}

def recommend_size(category, user_measurements, tolerance=2.0, fit_type="regular"):
    sizes = SIZE_CHARTS.get(category)
    if not sizes:
        return None

    best_size = None
    smallest_diff = float("inf")

    for size in sizes:
        fits = True
        for key in user_measurements:
            if key in size:
                garment_value = size[key]
                user_value = user_measurements[key]

                if key == "chest":
                    required_value = user_value + 0
                else:
                    required_value = user_value

                if garment_value + tolerance < required_value:
                    fits = False
                    break

        if fits:
            chest_diff = size["chest"] - (user_measurements["chest"] + 0)
            if 0 <= chest_diff < smallest_diff:
                smallest_diff = chest_diff
                best_size = size

    if not best_size:
        best_size = sizes[-1]
        smallest_diff = best_size["chest"] - (user_measurements["chest"] + 0)

    ideal_diff = 6  
    score = 100 - abs(smallest_diff - ideal_diff) * 5
    confidence = max(60, min(100, score))

    if 4 <= smallest_diff <= 8:
        fit_zone = "Perfect Fit"
    elif 2 <= smallest_diff < 4 or 8 < smallest_diff <= 12:
        fit_zone = "Comfortable Fit"
    else:
        fit_zone = "Relaxed Fit"

    return {
        "recommended_size": best_size["label"],
        "confidence": round(confidence, 1),
        "fit_zone": fit_zone
    }