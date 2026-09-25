"""
Congestion Prediction Service using trained Neural Network (MLPClassifier).
Loads congestion_model.pkl and scaler.pkl to predict LOW, MEDIUM, or HIGH traffic congestion.
"""

import os
import joblib
import numpy as np
import warnings

# Suppress sklearn feature names warning when passing numpy array
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

FEATURE_COLS = ['cars', 'motorcycles', 'buses', 'trucks', 'total_vehicles', 'average_movement', 'road_occupancy']

class CongestionPredictor:
    def __init__(self, model_dir=None):
        if model_dir is None:
            model_dir = os.path.dirname(os.path.abspath(__file__))
            
        self.model_path = os.path.join(model_dir, "congestion_model.pkl")
        self.scaler_path = os.path.join(model_dir, "scaler.pkl")
        self.model = None
        self.scaler = None
        self.classes_ = ['HIGH', 'LOW', 'MEDIUM']
        self._load_model()

    def _load_model(self):
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
                if hasattr(self.model, 'classes_'):
                    self.classes_ = [str(c) for c in self.model.classes_]
                print(f"[CongestionPredictor] Loaded trained Neural Network from {self.model_path}")
            else:
                print(f"[CongestionPredictor] Warning: Model files not found at {self.model_path}. Fallback rule engine will be used.")
        except Exception as e:
            print(f"[CongestionPredictor] Error loading model: {e}. Fallback rule engine will be used.")
            self.model = None
            self.scaler = None

    def predict(self, features: dict) -> dict:
        """
        Takes dictionary containing:
        - cars, motorcycles, buses, trucks, total_vehicles, average_movement, road_occupancy
        Returns:
        {
            "congestion_level": "LOW" | "MEDIUM" | "HIGH",
            "confidence": float (0.0 to 1.0),
            "probabilities": {"LOW": float, "MEDIUM": float, "HIGH": float},
            "source": "NEURAL_NETWORK_MLP" | "HEURISTIC_RULE_FALLBACK"
        }
        """
        cars = int(features.get('cars', 0))
        motorcycles = int(features.get('motorcycles', 0))
        buses = int(features.get('buses', 0))
        trucks = int(features.get('trucks', 0))
        total_vehicles = int(features.get('total_vehicles', cars + motorcycles + buses + trucks))
        avg_movement = float(features.get('average_movement', 0.0))
        road_occupancy = float(features.get('road_occupancy', 0.0))

        if self.model is not None and self.scaler is not None:
            try:
                row = np.array([[cars, motorcycles, buses, trucks, total_vehicles, avg_movement, road_occupancy]])
                scaled_row = self.scaler.transform(row)
                pred_class = str(self.model.predict(scaled_row)[0])
                probs = self.model.predict_proba(scaled_row)[0]
                prob_dict = {str(cls): round(float(prob), 4) for cls, prob in zip(self.classes_, probs)}
                confidence = float(np.max(probs))

                return {
                    "congestion_level": pred_class,
                    "confidence": round(confidence, 4),
                    "probabilities": prob_dict,
                    "source": "NEURAL_NETWORK_MLP",
                    "features_used": {
                        "cars": cars,
                        "motorcycles": motorcycles,
                        "buses": buses,
                        "trucks": trucks,
                        "total_vehicles": total_vehicles,
                        "average_movement": round(avg_movement, 2),
                        "road_occupancy": round(road_occupancy, 2)
                    }
                }
            except Exception as e:
                print(f"[CongestionPredictor] Prediction error: {e}. Using rule fallback.")

        # Fallback heuristic rule engine if model is unavailable
        return self._rule_based_predict(total_vehicles, avg_movement, road_occupancy, cars, motorcycles, buses, trucks)

    def _rule_based_predict(self, total_vehicles, avg_movement, road_occupancy, cars, motorcycles, buses, trucks):
        if road_occupancy >= 58.0 or (total_vehicles >= 25 and avg_movement <= 30.0):
            level = "HIGH"
            confidence = 0.92
            probs = {"LOW": 0.03, "MEDIUM": 0.05, "HIGH": 0.92}
        elif road_occupancy >= 28.0 or total_vehicles >= 12 or avg_movement <= 60.0:
            level = "MEDIUM"
            confidence = 0.88
            probs = {"LOW": 0.07, "MEDIUM": 0.88, "HIGH": 0.05}
        else:
            level = "LOW"
            confidence = 0.95
            probs = {"LOW": 0.95, "MEDIUM": 0.04, "HIGH": 0.01}

        return {
            "congestion_level": level,
            "confidence": confidence,
            "probabilities": probs,
            "source": "HEURISTIC_RULE_FALLBACK",
            "features_used": {
                "cars": cars,
                "motorcycles": motorcycles,
                "buses": buses,
                "trucks": trucks,
                "total_vehicles": total_vehicles,
                "average_movement": round(avg_movement, 2),
                "road_occupancy": round(road_occupancy, 2)
            }
        }

# Global singleton
predictor = CongestionPredictor()
