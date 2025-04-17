import cv2 
import numpy as np 
 
def transform_perspective(image_bytes: bytes, points: list[list[int]]) -> bytes:
    img_array = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    pts1 = np.array(points, dtype="float32")
    
    width = int(max(np.linalg.norm(pts1[0] - pts1[1]), np.linalg.norm(pts1[2] - pts1[3])))
    height = int(max(np.linalg.norm(pts1[0] - pts1[3]), np.linalg.norm(pts1[1] - pts1[2])))
    
    pts2 = np.array([[0, 0], [width, 0], [width, height], [0, height]], dtype="float32")
    
    matrix = cv2.getPerspectiveTransform(pts1, pts2)
    result = cv2.warpPerspective(img, matrix, (width, height))

    _, buffer = cv2.imencode(".jpg", result)
    return buffer.tobytes()
