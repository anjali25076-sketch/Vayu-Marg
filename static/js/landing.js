// Initialize GSAP
gsap.registerPlugin(ScrollTrigger);

// Air Particles Animation
function createAirParticles() {
    const container = document.getElementById('airParticles');
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = Math.random() * 6 + 2 + 'px';
        particle.style.height = particle.style.width;
        particle.style.borderRadius = '50%';
        particle.style.background = `radial-gradient(circle, rgba(14, 165, 233, ${Math.random() * 0.3 + 0.1}), transparent)`;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        
        container.appendChild(particle);
        
        // Animate particle
        gsap.to(particle, {
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
            duration: Math.random() * 10 + 10,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });
        
        gsap.to(particle, {
            opacity: Math.random() * 0.5 + 0.3,
            duration: Math.random() * 3 + 2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });
    }
}

// AQI Grid Visualization
function createAQIGrid() {
    const grid = document.getElementById('aqiGrid');
    if (!grid) return;
    
    const gridSize = 16;
    const totalCells = gridSize * gridSize;
    
    for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        cell.style.borderRadius = '2px';
        cell.style.transition = 'all 0.5s ease';
        
        // Generate dynamic AQI value
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const centerDist = Math.sqrt(
            Math.pow(row - gridSize/2, 2) + 
            Math.pow(col - gridSize/2, 2)
        );
        
        const aqi = Math.floor(100 + centerDist * 15 + Math.random() * 50);
        const color = getAQIColor(aqi);
        
        cell.style.background = color;
        cell.style.opacity = '0';
        
        grid.appendChild(cell);
        
        // Staggered reveal animation
        gsap.to(cell, {
            opacity: 1,
            duration: 0.5,
            delay: i * 0.005,
            ease: 'power2.out'
        });
        
        // Continuous animation
        animateCell(cell, i);
    }
}

function getAQIColor(aqi) {
    if (aqi <= 50) return 'rgba(16, 185, 129, 0.8)'; // Good - Green
    if (aqi <= 100) return 'rgba(251, 191, 36, 0.8)'; // Moderate - Yellow
    if (aqi <= 150) return 'rgba(251, 146, 60, 0.8)'; // Unhealthy for Sensitive - Orange
    if (aqi <= 200) return 'rgba(239, 68, 68, 0.8)'; // Unhealthy - Red
    if (aqi <= 300) return 'rgba(147, 51, 234, 0.8)'; // Very Unhealthy - Purple
    return 'rgba(127, 29, 29, 0.8)'; // Hazardous - Maroon
}

function animateCell(cell, index) {
    const duration = Math.random() * 3 + 2;
    const delay = Math.random() * 2;
    
    gsap.to(cell, {
        opacity: Math.random() * 0.4 + 0.6,
        scale: Math.random() * 0.2 + 0.9,
        duration: duration,
        delay: delay,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });
}

// Feature Cards Scroll Animation
function animateFeatures() {
    const cards = document.querySelectorAll('.feature-card');
    
    cards.forEach((card, index) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: 'top 80%',
                end: 'bottom 20%',
                toggleActions: 'play none none reverse'
            },
            y: 100,
            opacity: 0,
            duration: 0.8,
            delay: index * 0.2,
            ease: 'power3.out'
        });
    });
}

// Impact Metrics Animation
function animateMetrics() {
    const metrics = document.querySelectorAll('.metric-value');
    
    metrics.forEach(metric => {
        const finalValue = metric.textContent;
        metric.textContent = '0';
        
        gsap.to(metric, {
            scrollTrigger: {
                trigger: metric,
                start: 'top 80%',
            },
            textContent: finalValue,
            duration: 2,
            ease: 'power2.out',
            snap: { textContent: 1 },
            onUpdate: function() {
                if (finalValue.includes('%')) {
                    metric.textContent = Math.round(parseFloat(metric.textContent)) + '%';
                } else if (finalValue.includes('M')) {
                    metric.textContent = Math.round(parseFloat(metric.textContent)) + 'M+';
                } else if (finalValue.includes('km')) {
                    metric.textContent = Math.round(parseFloat(metric.textContent)) + 'km';
                } else {
                    metric.textContent = Math.round(parseFloat(metric.textContent)) + '/7';
                }
            }
        });
    });
}

// Stat Cards Animation
function animateStats() {
    const stats = document.querySelectorAll('.stat-value');
    
    stats.forEach(stat => {
        const finalValue = stat.textContent;
        const numValue = parseInt(finalValue);
        stat.textContent = '0%';
        
        gsap.to(stat, {
            scrollTrigger: {
                trigger: stat,
                start: 'top 90%',
            },
            textContent: numValue,
            duration: 2,
            ease: 'power2.out',
            snap: { textContent: 1 },
            onUpdate: function() {
                stat.textContent = Math.round(parseFloat(stat.textContent)) + '%';
            }
        });
    });
}

// Pipeline Animation
function animatePipeline() {
    const stages = document.querySelectorAll('.pipeline-stage');
    const arrows = document.querySelectorAll('.pipeline-arrow');
    
    stages.forEach((stage, index) => {
        gsap.from(stage, {
            scrollTrigger: {
                trigger: stage,
                start: 'top 80%',
            },
            scale: 0.8,
            opacity: 0,
            duration: 0.6,
            delay: index * 0.15,
            ease: 'back.out(1.4)'
        });
    });
    
    arrows.forEach((arrow, index) => {
        gsap.from(arrow, {
            scrollTrigger: {
                trigger: arrow,
                start: 'top 80%',
            },
            x: -20,
            opacity: 0,
            duration: 0.4,
            delay: index * 0.15 + 0.3,
            ease: 'power2.out'
        });
    });
}

// Air Quality Viz Rotation
function animateAirQualityViz() {
    const layers = document.querySelectorAll('.viz-layer');
    
    layers.forEach((layer, index) => {
        gsap.to(layer, {
            rotation: 360,
            duration: 20 + index * 5,
            repeat: -1,
            ease: 'linear'
        });
    });
}

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            gsap.to(window, {
                duration: 1,
                scrollTo: {
                    y: target,
                    offsetY: 100
                },
                ease: 'power3.inOut'
            });
        }
    });
});

// Mouse Move Parallax Effect
document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth - 0.5;
    const mouseY = e.clientY / window.innerHeight - 0.5;
    
    gsap.to('.hero-visual', {
        x: mouseX * 30,
        y: mouseY * 30,
        duration: 0.5,
        ease: 'power2.out'
    });
    
    gsap.to('.air-quality-viz', {
        x: mouseX * -20,
        y: mouseY * -20,
        duration: 0.5,
        ease: 'power2.out'
    });
});

// Initialize all animations on page load
window.addEventListener('DOMContentLoaded', () => {
    createAirParticles();
    createAQIGrid();
    animateFeatures();
    animateMetrics();
    animateStats();
    animatePipeline();
    animateAirQualityViz();
    
    // Animate hero elements
    gsap.from('.hero-badge', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: 'power3.out'
    });
    
    // Navbar scroll effect
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        const nav = document.querySelector('.nav');
        
        if (currentScroll > 100) {
            nav.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        } else {
            nav.style.boxShadow = 'none';
        }
        
        lastScroll = currentScroll;
    });
});

// Preload optimization
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});