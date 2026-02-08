from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import secrets
import numpy as np
import pickle
import os
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(16)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///vayu_marg.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200))
    name = db.Column(db.String(100), nullable=False)
    user_type = db.Column(db.String(20), nullable=False)  # 'citizen', 'worker', 'official'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    google_id = db.Column(db.String(100), unique=True, nullable=True)

class AQIReading(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    aqi_value = db.Column(db.Integer, nullable=False)
    pm25 = db.Column(db.Float)
    pm10 = db.Column(db.Float)
    no2 = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    source = db.Column(db.String(50))  # 'predicted', 'sensor', 'satellite'

class Hotspot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    aqi_value = db.Column(db.Integer, nullable=False)
    severity = db.Column(db.String(20))  # 'high', 'very_high', 'severe'
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    area_name = db.Column(db.String(100))

class WaterTankerDispatch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    hotspot_id = db.Column(db.Integer, db.ForeignKey('hotspot.id'))
    worker_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    status = db.Column(db.String(20))  # 'dispatched', 'en_route', 'completed'
    dispatched_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    area_covered_km2 = db.Column(db.Float)
    water_used_liters = db.Column(db.Integer)

class GovernmentMetrics(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    areas_purified = db.Column(db.Integer, default=0)
    water_saved_percent = db.Column(db.Float, default=0)
    response_time_minutes = db.Column(db.Integer, default=0)
    hotspots_detected = db.Column(db.Integer, default=0)
    hotspots_mitigated = db.Column(db.Integer, default=0)

class CitizenReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    report_type = db.Column(db.String(50))  # 'burning', 'dust', 'smoke', 'construction'
    description = db.Column(db.Text)
    reported_at = db.Column(db.DateTime, default=datetime.utcnow)
    verified = db.Column(db.Boolean, default=False)

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def user_type_required(user_type):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_type' not in session or session['user_type'] != user_type:
                return jsonify({'error': 'Unauthorized'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Routes
@app.route('/')
def index():
    return render_template('landing.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    user = User(
        email=data['email'],
        name=data['name'],
        user_type=data['user_type'],
        password_hash=generate_password_hash(data['password'])
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'Registration successful'}), 201

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        session['user_id'] = user.id
        session['user_type'] = user.user_type
        session['user_name'] = user.name
        return jsonify({
            'message': 'Login successful',
            'user_type': user.user_type,
            'name': user.name
        }), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'}), 200

@app.route('/dashboard/citizen')
@login_required
def citizen_dashboard():
    if session.get('user_type') != 'citizen':
        return redirect(url_for('login'))
    return render_template('citizen_dashboard.html')

@app.route('/dashboard/worker')
@login_required
def worker_dashboard():
    if session.get('user_type') != 'worker':
        return redirect(url_for('login'))
    return render_template('worker_dashboard.html')

@app.route('/dashboard/official')
@login_required
def official_dashboard():
    if session.get('user_type') != 'official':
        return redirect(url_for('login'))
    return render_template('official_dashboard.html')

# API Endpoints for AQI Data
@app.route('/api/aqi/current')
def get_current_aqi():
    # Get latest readings from database
    readings = AQIReading.query.filter(
        AQIReading.timestamp >= datetime.utcnow() - timedelta(minutes=15)
    ).all()
    
    return jsonify([{
        'lat': r.latitude,
        'lng': r.longitude,
        'aqi': r.aqi_value,
        'pm25': r.pm25,
        'pm10': r.pm10,
        'timestamp': r.timestamp.isoformat()
    } for r in readings])

@app.route('/api/aqi/heatmap')
def get_aqi_heatmap():
    # Generate heatmap data (500m x 500m grid for Delhi)
    # Delhi bounds: approximately 28.4-28.9 N, 76.8-77.3 E
    
    readings = AQIReading.query.filter(
        AQIReading.timestamp >= datetime.utcnow() - timedelta(minutes=15)
    ).all()
    
    heatmap_data = []
    for r in readings:
        heatmap_data.append({
            'location': {'lat': r.latitude, 'lng': r.longitude},
            'weight': r.aqi_value
        })
    
    return jsonify(heatmap_data)

@app.route('/api/hotspots/active')
def get_active_hotspots():
    hotspots = Hotspot.query.filter_by(is_active=True).all()
    
    return jsonify([{
        'id': h.id,
        'lat': h.latitude,
        'lng': h.longitude,
        'aqi': h.aqi_value,
        'severity': h.severity,
        'area_name': h.area_name,
        'detected_at': h.detected_at.isoformat()
    } for h in hotspots])

@app.route('/api/route/clean', methods=['POST'])
def get_clean_route():
    data = request.json
    origin = data['origin']
    destination = data['destination']
    
    # This will be implemented with Google Maps API
    # For now, return mock data
    return jsonify({
        'routes': [
            {
                'type': 'clean',
                'distance': '12.5 km',
                'duration': '28 min',
                'aqi_avg': 156,
                'pm25_reduction': 38,
                'waypoints': []
            },
            {
                'type': 'fastest',
                'distance': '10.2 km',
                'duration': '22 min',
                'aqi_avg': 287,
                'pm25_reduction': 0,
                'waypoints': []
            }
        ]
    })

@app.route('/api/tanker/dispatch', methods=['POST'])
def dispatch_tanker():
    data = request.json
    hotspot_id = data['hotspot_id']
    
    dispatch = WaterTankerDispatch(
        hotspot_id=hotspot_id,
        worker_id=session.get('user_id'),
        status='dispatched'
    )
    
    db.session.add(dispatch)
    db.session.commit()
    
    return jsonify({
        'message': 'Tanker dispatched successfully',
        'dispatch_id': dispatch.id
    }), 201

@app.route('/api/tanker/complete', methods=['POST'])
def complete_dispatch():
    data = request.json
    dispatch = WaterTankerDispatch.query.get(data['dispatch_id'])
    
    if dispatch:
        dispatch.status = 'completed'
        dispatch.completed_at = datetime.utcnow()
        dispatch.area_covered_km2 = data.get('area_covered', 0)
        dispatch.water_used_liters = data.get('water_used', 0)
        
        # Update hotspot status
        hotspot = Hotspot.query.get(dispatch.hotspot_id)
        if hotspot:
            hotspot.is_active = False
        
        db.session.commit()
        
        return jsonify({'message': 'Dispatch completed'}), 200
    
    return jsonify({'error': 'Dispatch not found'}), 404

@app.route('/api/metrics/government')
@login_required
def get_government_metrics():
    today = datetime.utcnow().date()
    metrics = GovernmentMetrics.query.filter_by(date=today).first()
    
    if not metrics:
        metrics = GovernmentMetrics(date=today)
        db.session.add(metrics)
        db.session.commit()
    
    total_dispatches = WaterTankerDispatch.query.count()
    completed_dispatches = WaterTankerDispatch.query.filter_by(status='completed').count()
    active_hotspots = Hotspot.query.filter_by(is_active=True).count()
    
    return jsonify({
        'areas_purified': metrics.areas_purified,
        'water_saved_percent': metrics.water_saved_percent,
        'response_time_minutes': metrics.response_time_minutes,
        'hotspots_detected': metrics.hotspots_detected,
        'hotspots_mitigated': metrics.hotspots_mitigated,
        'total_dispatches': total_dispatches,
        'completed_dispatches': completed_dispatches,
        'active_hotspots': active_hotspots
    })

@app.route('/api/citizen/report', methods=['POST'])
@login_required
def submit_citizen_report():
    data = request.json
    
    report = CitizenReport(
        user_id=session.get('user_id'),
        latitude=data['latitude'],
        longitude=data['longitude'],
        report_type=data['report_type'],
        description=data.get('description', '')
    )
    
    db.session.add(report)
    db.session.commit()
    
    return jsonify({
        'message': 'Report submitted successfully',
        'report_id': report.id
    }), 201

# Initialize database
def init_db():
    with app.app_context():
        db.create_all()
        
        # Create sample data if database is empty
        if User.query.count() == 0:
            # Create sample users
            users = [
                User(email='citizen@demo.com', name='Demo Citizen', user_type='citizen',
                     password_hash=generate_password_hash('demo123')),
                User(email='worker@demo.com', name='Demo Worker', user_type='worker',
                     password_hash=generate_password_hash('demo123')),
                User(email='official@demo.com', name='Demo Official', user_type='official',
                     password_hash=generate_password_hash('demo123'))
            ]
            db.session.add_all(users)
            
            # Create sample AQI readings for Delhi
            sample_readings = []
            for _ in range(50):
                lat = np.random.uniform(28.4, 28.9)
                lng = np.random.uniform(76.8, 77.3)
                aqi = int(np.random.uniform(50, 450))
                
                reading = AQIReading(
                    latitude=lat,
                    longitude=lng,
                    aqi_value=aqi,
                    pm25=aqi * 0.6,
                    pm10=aqi * 0.8,
                    no2=aqi * 0.4,
                    source='predicted'
                )
                sample_readings.append(reading)
            
            db.session.add_all(sample_readings)
            
            # Create sample hotspots
            hotspot_areas = [
                {'name': 'Anand Vihar', 'lat': 28.6469, 'lng': 77.3158, 'aqi': 450},
                {'name': 'Dwarka', 'lat': 28.5921, 'lng': 77.0460, 'aqi': 380},
                {'name': 'Rohini', 'lat': 28.7495, 'lng': 77.0736, 'aqi': 420},
                {'name': 'Connaught Place', 'lat': 28.6315, 'lng': 77.2167, 'aqi': 280},
                {'name': 'Nehru Place', 'lat': 28.5494, 'lng': 77.2501, 'aqi': 350}
            ]
            
            for area in hotspot_areas:
                severity = 'severe' if area['aqi'] > 400 else 'very_high' if area['aqi'] > 300 else 'high'
                hotspot = Hotspot(
                    latitude=area['lat'],
                    longitude=area['lng'],
                    aqi_value=area['aqi'],
                    severity=severity,
                    area_name=area['name'],
                    is_active=True
                )
                db.session.add(hotspot)
            
            # Create sample metrics
            today_metrics = GovernmentMetrics(
                date=datetime.utcnow().date(),
                areas_purified=23,
                water_saved_percent=40.5,
                response_time_minutes=12,
                hotspots_detected=45,
                hotspots_mitigated=32
            )
            db.session.add(today_metrics)
            
            db.session.commit()
            print("Database initialized with sample data!")

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)