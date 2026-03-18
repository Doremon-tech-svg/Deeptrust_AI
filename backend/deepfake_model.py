from transformers import pipeline
from PIL import Image


class DeepfakeDetector:
    def __init__(self):
        print("Loading Deep-Fake-Detector-v2 (ViT model)...")
        self.pipe = pipeline(
            "image-classification",
            model="prithivMLmods/Deep-Fake-Detector-v2-Model",
            device="cpu"
        )
        print("✅ Deepfake model loaded!")

    def predict(self, pil_image: Image.Image) -> float:
        """
        Returns a float in [0, 1] representing deepfake probability.
        > 0.5 = Deepfake, <= 0.5 = Real
        """
        results = self.pipe(pil_image)
        for r in results:
            label = r['label'].lower()
            score = r['score']
            if "deepfake" in label or "fake" in label:
                return float(score)
            if "real" in label:
                return float(1 - score)
        # Fallback: return first result score
        return float(results[0]['score'])
