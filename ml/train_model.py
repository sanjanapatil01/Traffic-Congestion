"""
Training script for Neural-Network based Traffic Congestion Classifier.
Generates a realistic 1000-row prototype dataset and trains an MLPClassifier (Multi-Layer Perceptron).
Outputs:
- ml/traffic_dataset_1000.csv
- ml/congestion_model.pkl
- ml/scaler.pkl
"""

import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score
import joblib

def generate_synthetic_dataset(num_samples=1000, random_seed=42):
    np.random.seed(random_seed)
    data = []
    
    # Generate balanced traffic distributions across LOW, MEDIUM, HIGH
    # LOW congestion: low vehicle counts, high movement speed, low occupancy
    # MEDIUM congestion: moderate vehicle counts, moderate movement speed, medium occupancy
    # HIGH congestion: high vehicle counts, low/crawl movement speed, high occupancy
    
    samples_per_class = num_samples // 3
    extra = num_samples - (samples_per_class * 3)
    
    # 1. LOW Congestion
    for _ in range(samples_per_class):
        cars = int(np.clip(np.random.normal(8, 4), 0, 18))
        motorcycles = int(np.clip(np.random.normal(5, 3), 0, 12))
        buses = int(np.clip(np.random.normal(1, 1), 0, 3))
        trucks = int(np.clip(np.random.normal(1, 1), 0, 3))
        total_vehicles = cars + motorcycles + buses + trucks
        
        # High movement (fluid flow: 70 - 160 px/sec)
        avg_movement = float(np.clip(np.random.normal(110, 25), 65, 180))
        # Low road occupancy (5% - 28%)
        road_occupancy = float(np.clip(np.random.normal(15, 6), 3, 28))
        
        data.append({
            'cars': cars,
            'motorcycles': motorcycles,
            'buses': buses,
            'trucks': trucks,
            'total_vehicles': total_vehicles,
            'average_movement': round(avg_movement, 2),
            'road_occupancy': round(road_occupancy, 2),
            'congestion_level': 'LOW'
        })
        
    # 2. MEDIUM Congestion
    for _ in range(samples_per_class):
        cars = int(np.clip(np.random.normal(20, 5), 12, 32))
        motorcycles = int(np.clip(np.random.normal(10, 4), 4, 18))
        buses = int(np.clip(np.random.normal(3, 1), 1, 6))
        trucks = int(np.clip(np.random.normal(3, 1), 1, 6))
        total_vehicles = cars + motorcycles + buses + trucks
        
        # Moderate movement (35 - 75 px/sec)
        avg_movement = float(np.clip(np.random.normal(50, 12), 25, 75))
        # Moderate road occupancy (28% - 58%)
        road_occupancy = float(np.clip(np.random.normal(42, 8), 28, 58))
        
        data.append({
            'cars': cars,
            'motorcycles': motorcycles,
            'buses': buses,
            'trucks': trucks,
            'total_vehicles': total_vehicles,
            'average_movement': round(avg_movement, 2),
            'road_occupancy': round(road_occupancy, 2),
            'congestion_level': 'MEDIUM'
        })
        
    # 3. HIGH Congestion
    for _ in range(samples_per_class + extra):
        cars = int(np.clip(np.random.normal(35, 7), 24, 60))
        motorcycles = int(np.clip(np.random.normal(16, 5), 8, 30))
        buses = int(np.clip(np.random.normal(5, 2), 2, 10))
        trucks = int(np.clip(np.random.normal(6, 2), 2, 12))
        total_vehicles = cars + motorcycles + buses + trucks
        
        # Slow / gridlock crawl movement (2 - 30 px/sec)
        avg_movement = float(np.clip(np.random.normal(16, 7), 2, 32))
        # High road occupancy (58% - 95%)
        road_occupancy = float(np.clip(np.random.normal(74, 9), 58, 96))
        
        data.append({
            'cars': cars,
            'motorcycles': motorcycles,
            'buses': buses,
            'trucks': trucks,
            'total_vehicles': total_vehicles,
            'average_movement': round(avg_movement, 2),
            'road_occupancy': round(road_occupancy, 2),
            'congestion_level': 'HIGH'
        })
        
    df = pd.DataFrame(data)
    # Shuffle dataset
    df = df.sample(frac=1.0, random_state=random_seed).reset_index(drop=True)
    return df

def train_and_export():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(current_dir, "traffic_dataset_1000.csv")
    model_path = os.path.join(current_dir, "congestion_model.pkl")
    scaler_path = os.path.join(current_dir, "scaler.pkl")
    
    print("Generating 1000-row prototype traffic dataset...")
    df = generate_synthetic_dataset(1000)
    df.to_csv(dataset_path, index=False)
    print(f"Saved dataset to {dataset_path}")
    
    feature_cols = ['cars', 'motorcycles', 'buses', 'trucks', 'total_vehicles', 'average_movement', 'road_occupancy']
    X = df[feature_cols]
    y = df['congestion_level']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print("Training Neural-Network MLPClassifier (hidden_layers=(64, 32), relu, adam)...")
    mlp = MLPClassifier(
        hidden_layer_sizes=(64, 32),
        activation='relu',
        solver='adam',
        max_iter=500,
        random_state=42,
        early_stopping=True
    )
    
    mlp.fit(X_train_scaled, y_train)
    
    y_pred = mlp.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nModel Accuracy on Test Set: {acc * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))
    
    joblib.dump(mlp, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"Exported trained model to: {model_path}")
    print(f"Exported fitted scaler to: {scaler_path}")

if __name__ == '__main__':
    train_and_export()
