import cv2
import mediapipe as mp

# Initialize MediaPipe Pose AI
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)

def analyze_pose(image_path):
    """Reads the image and extracts the 33 body landmarks."""
    image = cv2.imread(image_path)
    if image is None:
        return None
    
    # MediaPipe requires RGB images
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = pose.process(image_rgb)
    
    if results.pose_landmarks:
        return results.pose_landmarks.landmark
    return None

def calculate_shoulder_width(landmarks, image_width):
    """Calculates pixel distance between left and right shoulders."""
    left_shoulder = landmarks[11]
    right_shoulder = landmarks[12]
    
    # Calculate the horizontal distance in pixels
    shoulder_width_px = abs(left_shoulder.x - right_shoulder.x) * image_width
    return shoulder_width_px

def calculate_height(landmarks, image_height):
    """Calculates full body height in pixels from nose to ankles."""
    nose = landmarks[0]
    left_ankle = landmarks[27]
    right_ankle = landmarks[28]
    
    # Average the ankle Y coordinates to get the floor level
    avg_ankle_y = (left_ankle.y + right_ankle.y) / 2.0
    
    # Calculate distance and add ~12% to account for the top of the head and feet
    pixel_height = abs(avg_ankle_y - nose.y) * image_height * 1.12
    return pixel_height

def calculate_shirt_length(landmarks, image_height):
    """Calculates pixel distance from mid-shoulder to mid-hip."""
    left_shoulder = landmarks[11]
    right_shoulder = landmarks[12]
    left_hip = landmarks[23]
    right_hip = landmarks[24]
    
    mid_shoulder_y = (left_shoulder.y + right_shoulder.y) / 2.0
    mid_hip_y = (left_hip.y + right_hip.y) / 2.0
    
    shirt_length_px = abs(mid_hip_y - mid_shoulder_y) * image_height
    return shirt_length_px

def calculate_chest_circumference(image):
    """Estimates the chest width based on shoulder proportions."""
    # Process the image again to get dimensions and landmarks safely
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = pose.process(image_rgb)
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]
        
        image_width = image.shape[1]
        
        # Chest width is generally slightly wider than direct shoulder-to-shoulder points
        # We multiply by 1.15 to estimate the 2D chest width
        chest_width_px = abs(left_shoulder.x - right_shoulder.x) * image_width * 1.15
        return chest_width_px
    return 0