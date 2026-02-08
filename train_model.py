import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import pickle
import os

def generate_synthetic_aqi_data(n_samples=10000):
    """
    Generate synthetic training data for AQI prediction model
    Features: traffic_density, NO2, temperature, humidity, wind_speed, hour_of_day, is_weekend
    """
    np.random.seed(42)
    
    # Generate features
    traffic_density = np.random.uniform(0, 100, n_samples)  # 0-100 scale
    no2_levels = np.random.uniform(20, 200, n_samples)  # μg/m³
    temperature = np.random.uniform(5, 45, n_samples)  # °C
    humidity = np.random.uniform(20, 90, n_samples)  # %
    wind_speed = np.random.uniform(0, 20, n_samples)  # km/h
    hour_of_day = np.random.randint(0, 24, n_samples)
    is_weekend = np.random.randint(0, 2, n_samples)
    
    # Generate AQI with realistic correlations
    # Higher traffic, NO2 -> higher AQI
    # Higher wind speed -> lower AQI
    # Morning/evening rush hours -> higher AQI
    
    base_aqi = (
        traffic_density * 2.5 +
        no2_levels * 1.2 +
        temperature * 0.5 -
        wind_speed * 10 -
        humidity * 0.3
    )
    
    # Add rush hour effects
    rush_hour_effect = np.where(
        (hour_of_day >= 7) & (hour_of_day <= 10) | (hour_of_day >= 17) & (hour_of_day <= 20),
        50,
        0
    )
    
    # Add weekend effect (lower on weekends)
    weekend_effect = np.where(is_weekend == 1, -30, 0)
    
    # Calculate final AQI with noise
    aqi = base_aqi + rush_hour_effect + weekend_effect + np.random.normal(0, 20, n_samples)
    aqi = np.clip(aqi, 0, 500)  # AQI ranges from 0-500
    
    # Generate PM2.5 and PM10 based on AQI
    pm25 = aqi * 0.6 + np.random.normal(0, 10, n_samples)
    pm10 = aqi * 0.8 + np.random.normal(0, 15, n_samples)
    
    # Create DataFrame
    df = pd.DataFrame({
        'traffic_density': traffic_density,
        'no2_levels': no2_levels,
        'temperature': temperature,
        'humidity': humidity,
        'wind_speed': wind_speed,
        'hour_of_day': hour_of_day,
        'is_weekend': is_weekend,
        'aqi': aqi,
        'pm25': pm25,
        'pm10': pm10
    })
    
    return df

def train_aqi_prediction_model():
    """
    Train Random Forest model for AQI prediction
    """
    print("Generating synthetic training data...")
    df = generate_synthetic_aqi_data(10000)
    
    # Features for prediction
    feature_cols = ['traffic_density', 'no2_levels', 'temperature', 'humidity', 
                   'wind_speed', 'hour_of_day', 'is_weekend']
    
    X = df[feature_cols]
    y = df['aqi']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest model
    print("Training Random Forest model...")
    rf_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    rf_model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    train_score = rf_model.score(X_train_scaled, y_train)
    test_score = rf_model.score(X_test_scaled, y_test)
    
    print(f"Training R² Score: {train_score:.4f}")
    print(f"Testing R² Score: {test_score:.4f}")
    
    # Save model and scaler
    os.makedirs('models', exist_ok=True)
    with open('models/aqi_model.pkl', 'wb') as f:
        pickle.dump(rf_model, f)
    
    with open('models/scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    
    print("Model saved successfully!")
    
    return rf_model, scaler, test_score

def train_hotspot_classifier():
    """
    Train Gradient Boosting classifier for hotspot detection
    """
    print("\nTraining hotspot classifier...")
    df = generate_synthetic_aqi_data(10000)
    
    # Create hotspot labels (AQI > 300 = hotspot)
    df['is_hotspot'] = (df['aqi'] > 300).astype(int)
    
    feature_cols = ['traffic_density', 'no2_levels', 'temperature', 'humidity', 
                   'wind_speed', 'hour_of_day', 'is_weekend']
    
    X = df[feature_cols]
    y = df['is_hotspot']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train Gradient Boosting classifier
    gb_model = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )
    
    gb_model.fit(X_train, y_train)
    
    # Evaluate
    train_score = gb_model.score(X_train, y_train)
    test_score = gb_model.score(X_test, y_test)
    
    print(f"Hotspot Classifier Training Accuracy: {train_score:.4f}")
    print(f"Hotspot Classifier Testing Accuracy: {test_score:.4f}")
    
    # Save model
    with open('models/hotspot_classifier.pkl', 'wb') as f:
        pickle.dump(gb_model, f)
    
    print("Hotspot classifier saved!")
    
    return gb_model, test_score

def predict_aqi(traffic_density, no2_levels, temperature, humidity, 
                wind_speed, hour_of_day, is_weekend):
    """
    Predict AQI for given conditions
    """
    # Load model and scaler
    with open('models/aqi_model.pkl', 'rb') as f:
        model = pickle.load(f)
    
    with open('models/scaler.pkl', 'rb') as f:
        scaler = pickle.load(f)
    
    # Prepare input
    features = np.array([[traffic_density, no2_levels, temperature, humidity, 
                         wind_speed, hour_of_day, is_weekend]])
    
    features_scaled = scaler.transform(features)
    
    # Predict
    aqi_pred = model.predict(features_scaled)[0]
    
    return max(0, min(500, aqi_pred))  # Clip to valid AQI range

def predict_hotspot_grid(grid_size=50):
    """
    Generate predicted AQI values for a grid covering Delhi
    Delhi bounds: approximately 28.4-28.9 N, 76.8-77.3 E
    """
    # Load models
    with open('models/aqi_model.pkl', 'rb') as f:
        model = pickle.load(f)
    
    with open('models/scaler.pkl', 'rb') as f:
        scaler = pickle.load(f)
    
    # Generate grid
    lat_range = np.linspace(28.4, 28.9, grid_size)
    lng_range = np.linspace(76.8, 77.3, grid_size)
    
    predictions = []
    
    # Current conditions (these would come from live APIs in production)
    current_hour = 9  # Morning rush hour
    is_weekend = 0
    
    for lat in lat_range:
        for lng in lng_range:
            # Simulate varying conditions across Delhi
            traffic_density = np.random.uniform(40, 90)
            no2_levels = np.random.uniform(80, 180)
            temperature = 25
            humidity = 60
            wind_speed = np.random.uniform(5, 15)
            
            features = np.array([[traffic_density, no2_levels, temperature, 
                                humidity, wind_speed, current_hour, is_weekend]])
            
            features_scaled = scaler.transform(features)
            aqi_pred = model.predict(features_scaled)[0]
            
            predictions.append({
                'lat': lat,
                'lng': lng,
                'aqi': max(0, min(500, aqi_pred))
            })
    
    return predictions

if __name__ == '__main__':
    # Train models
    print("=" * 60)
    print("VAYU-MARG AI/ML MODEL TRAINING")
    print("=" * 60)
    
    aqi_model, scaler, aqi_score = train_aqi_prediction_model()
    hotspot_model, hotspot_score = train_hotspot_classifier()
    
    print("\n" + "=" * 60)
    print("MODEL TRAINING COMPLETE")
    print("=" * 60)
    print(f"AQI Prediction Model R² Score: {aqi_score:.4f}")
    print(f"Hotspot Classifier Accuracy: {hotspot_score:.4f}")
    print("\nModels saved in 'models/' directory")
    
    # Test prediction
    print("\n" + "=" * 60)
    print("SAMPLE PREDICTION")
    print("=" * 60)
    test_aqi = predict_aqi(
        traffic_density=75,
        no2_levels=150,
        temperature=30,
        humidity=65,
        wind_speed=8,
        hour_of_day=9,
        is_weekend=0
    )
    print(f"Predicted AQI for rush hour conditions: {test_aqi:.1f}")