"""
DeepTrust AI — Flask Backend
Detects deepfakes using ViT model + MediaPipe face detection.
Records tamper-proof verification on Ethereum Sepolia testnet.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
import io
import mediapipe as mp
import hashlib

from deepfake_model import DeepfakeDetector

app = Flask(__name__)
CORS(app)

# ---- Load model once at startup ----
print("Initializing DeepTrust AI server...")
detector = DeepfakeDetector()

# ---- MediaPipe Face Detection (stable v0.10.14) ----
mp_face_detection = mp.solutions.face_detection
face_detection = mp_face_detection.FaceDetection(
    min_detection_confidence=0.75,
    model_selection=1   # 1 = full-range model (better for >2m distance & varied angles)
)

# ---- Blockchain Config — Ethereum Sepolia ----
# ⚠️  After deploying VerificationStore.sol on Remix, paste your contract address here:
RPC_URL          = "https://rpc.sepolia.org"
CHAIN_ID         = 11155111
CONTRACT_ADDRESS = "0x68B38890650B48EBe8E6E42886725433Eba2620a"   # ← UPDATE AFTER DEPLOY
EXPLORER_BASE    = "https://sepolia.etherscan.io"


@app.route("/")
def home():
    return jsonify({"status": "ok", "service": "DeepTrust AI", "version": "2.0"})


@app.route("/health")
def health():
    return jsonify({"status": "healthy", "model_loaded": True})


@app.route("/detect", methods=["POST"])
def detect():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded. Send a multipart/form-data POST with field 'image'."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    try:
        img_bytes = file.read()

        # ---- Open image ----
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_np  = np.array(pil_img)
        h, w    = img_np.shape[:2]

        # ---- Face detection ----
        detection_results = face_detection.process(img_np)
        if not detection_results.detections:
            return jsonify({"error": "No face detected in the image. Please upload a clear facial photo."}), 400

        # Pick highest-confidence detection
        detection = max(detection_results.detections, key=lambda d: d.score[0])
        bbox = detection.location_data.relative_bounding_box

        x  = int(bbox.xmin  * w)
        y  = int(bbox.ymin  * h)
        fw = int(bbox.width  * w)
        fh = int(bbox.height * h)

        # Add padding
        pad = int(0.05 * max(fw, fh))
        x  = max(0,     x  - pad)
        y  = max(0,     y  - pad)
        fw = min(w - x, fw + pad * 2)
        fh = min(h - y, fh + pad * 2)

        # Crop face
        face_crop = img_np[y : y + fh, x : x + fw]
        face_pil  = Image.fromarray(face_crop)

        # ---- Deepfake inference ----
        score = detector.predict(face_pil)

        # ---- Blockchain payload ----
        image_hash_hex = hashlib.sha256(img_bytes).hexdigest()
        scaled_score   = int(score * 10000)   # e.g. 0.8732 → 8732

        blockchain_data = {
            "image_hash":       image_hash_hex,
            "scaled_score":     scaled_score,
            "prediction":       "Deepfake" if score > 0.5 else "Real",
            "contract_address": CONTRACT_ADDRESS,
            "rpc_url":          RPC_URL,
            "chain_id":         CHAIN_ID,
            "explorer_base":    EXPLORER_BASE,
        }

        return jsonify({
            "deepfake_score": float(score),
            "prediction":     "Deepfake" if score > 0.5 else "Real",
            "face": {
                "x":    int(x),
                "y":    int(y),
                "w":    int(fw),
                "h":    int(fh),
                "imgW": w,
                "imgH": h,
            },
            "blockchain_data": blockchain_data,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("=" * 50)
    print("  DeepTrust AI Server — http://localhost:5000")
    print("=" * 50)
    app.run(debug=True, port=5000)
