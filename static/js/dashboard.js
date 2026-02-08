// General Dashboard Functions
// Used by worker and official dashboards

// Section Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        
        if (section) {
            // Update active nav item
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding section
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(`${section}-section`);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        }
    });
});

// Logout Function
async function logout() {
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login';
    }
}

// Update Dashboard Metrics
async function updateMetrics() {
    try {
        const response = await fetch('/api/metrics/government');
        const data = await response.json();
        
        // Update metric displays if they exist
        const elements = {
            'areas_purified': data.areas_purified,
            'water_saved': data.water_saved_percent,
            'response_time': data.response_time_minutes,
            'hotspots_detected': data.hotspots_detected,
            'hotspots_mitigated': data.hotspots_mitigated,
            'active_hotspots': data.active_hotspots,
            'total_dispatches': data.total_dispatches,
            'completed_dispatches': data.completed_dispatches
        };
        
        Object.keys(elements).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = elements[key];
            }
        });
    } catch (error) {
        console.error('Error updating metrics:', error);
    }
}

// Load Hotspots for Worker Dashboard
async function loadHotspots() {
    try {
        const response = await fetch('/api/hotspots/active');
        const hotspots = await response.json();
        
        const container = document.getElementById('hotspotsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        hotspots.forEach(hotspot => {
            const card = document.createElement('div');
            card.className = 'dispatch-card';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <h3>${hotspot.area_name || 'Unknown Location'}</h3>
                    <span class="priority-badge ${hotspot.severity === 'severe' ? 'priority-high' : 'priority-medium'}">
                        ${hotspot.severity.toUpperCase()}
                    </span>
                </div>
                <p><strong>AQI:</strong> ${hotspot.aqi} (${getSeverityLabel(hotspot.aqi)})</p>
                <p><strong>Detected:</strong> ${formatTime(hotspot.detected_at)}</p>
                <p><strong>Location:</strong> ${hotspot.lat.toFixed(4)}, ${hotspot.lng.toFixed(4)}</p>
                <div class="action-btns">
                    <button class="btn-accept" onclick="acceptDispatch(${hotspot.id})">Accept Dispatch</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading hotspots:', error);
    }
}

// Accept Dispatch (Worker)
async function acceptDispatch(hotspotId) {
    try {
        const response = await fetch('/api/tanker/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hotspot_id: hotspotId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Dispatch accepted! Navigate to hotspot location.', 'success');
            setTimeout(() => {
                loadHotspots(); // Refresh the list
            }, 1000);
        } else {
            showNotification(data.error || 'Failed to accept dispatch', 'error');
        }
    } catch (error) {
        console.error('Error accepting dispatch:', error);
        showNotification('Error accepting dispatch', 'error');
    }
}

// Complete Dispatch (Worker)
async function completeDispatch(dispatchId) {
    const areaCovered = prompt('Enter area covered (km²):');
    const waterUsed = prompt('Enter water used (liters):');
    
    if (!areaCovered || !waterUsed) return;
    
    try {
        const response = await fetch('/api/tanker/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dispatch_id: dispatchId,
                area_covered: parseFloat(areaCovered),
                water_used: parseInt(waterUsed)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Dispatch completed successfully!', 'success');
            setTimeout(() => {
                loadHotspots();
            }, 1000);
        } else {
            showNotification(data.error || 'Failed to complete dispatch', 'error');
        }
    } catch (error) {
        console.error('Error completing dispatch:', error);
        showNotification('Error completing dispatch', 'error');
    }
}

// Helper Functions
function getSeverityLabel(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            padding: 1rem 1.5rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            font-weight: 600;
            z-index: 10000;
            display: none;
        `;
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.display = 'block';
    
    if (type === 'success') {
        notification.style.borderLeft = '4px solid #10B981';
        notification.style.color = '#059669';
    } else if (type === 'error') {
        notification.style.borderLeft = '4px solid #EF4444';
        notification.style.color = '#DC2626';
    } else {
        notification.style.borderLeft = '4px solid #0EA5E9';
        notification.style.color = '#0284C7';
    }
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Auto-update metrics every 30 seconds
setInterval(updateMetrics, 30000);

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    updateMetrics();
    
    // Load hotspots if on worker dashboard
    if (document.getElementById('hotspotsList')) {
        loadHotspots();
        setInterval(loadHotspots, 60000); // Refresh every minute
    }
});