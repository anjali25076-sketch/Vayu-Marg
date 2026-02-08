// Section Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Show corresponding section
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`${section}-section`).classList.add('active');
    });
});

// Initialize Map
let map, heatmap;
let currentLocation = { lat: 28.7041, lng: 77.1025 }; // Delhi center

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: currentLocation,
        zoom: 11,
        styles: [
            {
                featureType: 'all',
                elementType: 'geometry',
                stylers: [{ saturation: -20 }]
            }
        ]
    });
    
    // Add current location marker
    new google.maps.Marker({
        position: currentLocation,
        map: map,
        title: 'Your Location',
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#0EA5E9',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2
        }
    });
    
    loadAQIHeatmap();
    loadHotspots();
}

// Load AQI Heatmap
async function loadAQIHeatmap() {
    try {
        const response = await fetch('/api/aqi/heatmap');
        const data = await response.json();
        
        const heatmapData = data.map(point => ({
            location: new google.maps.LatLng(point.location.lat, point.location.lng),
            weight: point.weight
        }));
        
        heatmap = new google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map: map,
            radius: 50,
            opacity: 0.6
        });
        
        heatmap.set('gradient', [
            'rgba(16, 185, 129, 0)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(147, 51, 234, 0.8)',
            'rgba(127, 29, 29, 0.8)'
        ]);
    } catch (error) {
        console.error('Error loading heatmap:', error);
    }
}

// Load Hotspots
async function loadHotspots() {
    try {
        const response = await fetch('/api/hotspots/active');
        const hotspots = await response.json();
        
        hotspots.forEach(hotspot => {
            const marker = new google.maps.Marker({
                position: { lat: hotspot.lat, lng: hotspot.lng },
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 15,
                    fillColor: getAQIColor(hotspot.aqi),
                    fillOpacity: 0.9,
                    strokeColor: '#fff',
                    strokeWeight: 2
                }
            });
            
            const infowindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 10px;">
                        <h3 style="margin: 0 0 8px 0;">${hotspot.area_name}</h3>
                        <p style="margin: 0; font-weight: bold;">AQI: ${hotspot.aqi}</p>
                        <p style="margin: 4px 0 0 0; color: #666;">Severity: ${hotspot.severity}</p>
                    </div>
                `
            });
            
            marker.addListener('click', () => {
                infowindow.open(map, marker);
            });
        });
    } catch (error) {
        console.error('Error loading hotspots:', error);
    }
}

// Get Current AQI
async function updateCurrentAQI() {
    try {
        const response = await fetch('/api/aqi/current');
        const readings = await response.json();
        
        if (readings.length > 0) {
            const nearest = readings[0];
            document.querySelector('#currentAQI .value').textContent = Math.round(nearest.aqi);
        }
    } catch (error) {
        console.error('Error fetching current AQI:', error);
    }
}

// Helper Functions
function getAQIColor(aqi) {
    if (aqi <= 50) return '#10B981';
    if (aqi <= 100) return '#FBBF24';
    if (aqi <= 150) return '#FB923C';
    if (aqi <= 200) return '#EF4444';
    if (aqi <= 300) return '#9333EA';
    return '#7F1D1D';
}

function centerMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setCenter(pos);
            map.setZoom(13);
        });
    }
}

function toggleHeatmap() {
    if (heatmap.getMap()) {
        heatmap.setMap(null);
    } else {
        heatmap.setMap(map);
    }
}

// Green Route Finding
async function findGreenRoute() {
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    
    if (!destination) {
        alert('Please enter a destination');
        return;
    }
    
    try {
        const response = await fetch('/api/route/clean', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin, destination })
        });
        
        const data = await response.json();
        document.getElementById('routeComparison').style.display = 'block';
        
        // Initialize navigation map if not already done
        if (!window.navMap) {
            window.navMap = new google.maps.Map(document.getElementById('navigationMap'), {
                center: currentLocation,
                zoom: 12
            });
        }
    } catch (error) {
        console.error('Error finding route:', error);
    }
}

// Report Form Submission
document.getElementById('reportForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        report_type: document.getElementById('reportType').value,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        description: document.getElementById('reportDescription').value
    };
    
    try {
        const response = await fetch('/api/citizen/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            document.getElementById('reportForm').style.display = 'none';
            document.getElementById('reportSuccess').style.display = 'block';
            
            setTimeout(() => {
                document.getElementById('reportForm').style.display = 'block';
                document.getElementById('reportSuccess').style.display = 'none';
                document.getElementById('reportForm').reset();
            }, 3000);
        }
    } catch (error) {
        console.error('Error submitting report:', error);
    }
});

// Logout Function
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Initialize on page load
window.addEventListener('load', () => {
    updateCurrentAQI();
    setInterval(updateCurrentAQI, 60000); // Update every minute
});

// Mock Google Maps if API not loaded
if (typeof google === 'undefined') {
    window.initMap = function() {
        console.log('Google Maps API not loaded. Using mock map.');
        // Display mock map interface
    };
}