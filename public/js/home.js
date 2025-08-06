// I'm Running Live - Homepage JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Update last updated timestamp
    updateLastUpdated();

    // Add smooth scrolling for any future navigation
    addSmoothScrolling();

    // Add interactive animations
    addScrollAnimations();

    // Check API status
    checkAPIStatus();

    // Add some interactive features
    addInteractiveFeatures();
});

// Update the last updated timestamp
function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        };
        lastUpdatedElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Add smooth scrolling behavior
function addSmoothScrolling() {
    // Add smooth scrolling to any anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Add scroll animations
function addScrollAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Add fade-in animation to sections
    document.querySelectorAll('.step, .feature, .use-case').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(element);
    });
}

// Check API status
async function checkAPIStatus() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();

        // Update status indicator if API is healthy
        if (data.status === 'OK') {
            updateStatusIndicator('online', `Platform Online (${Math.floor(data.uptime)}s uptime)`);
        } else {
            updateStatusIndicator('warning', 'Platform Running (Limited)');
        }
    } catch (error) {
        console.log('API status check failed:', error);
        updateStatusIndicator('offline', 'Platform Offline');
    }
}

// Update status indicator
function updateStatusIndicator(status, message) {
    const statusElement = document.querySelector('.status');
    const statusDot = document.querySelector('.status-dot');
    const statusSpan = statusElement.querySelector('span');

    // Remove existing status classes
    statusElement.classList.remove('status-online', 'status-warning', 'status-offline');
    statusDot.classList.remove('status-online', 'status-warning', 'status-offline');

    // Add new status class
    statusElement.classList.add(`status-${status}`);
    statusDot.classList.add(`status-${status}`);

    // Update message
    if (statusSpan) {
        statusSpan.textContent = message;
    }
}

// Add interactive features
function addInteractiveFeatures() {
    // Add hover effects to feature cards
    document.querySelectorAll('.feature').forEach(feature => {
        feature.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });

        feature.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(-3px) scale(1)';
        });
    });

    // Add click animation to step cards
    document.querySelectorAll('.step').forEach(step => {
        step.addEventListener('click', function() {
            // Add a subtle click animation
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'translateY(-5px) scale(1)';
            }, 150);
        });
    });

    // Add dynamic counter animation (simulate live stats)
    animateCounters();
}

// Animate counters (simulated live stats)
function animateCounters() {
    // Simulate some live platform stats
    const stats = {
        activeRunners: Math.floor(Math.random() * 50) + 20,
        totalMessages: Math.floor(Math.random() * 1000) + 500,
        totalDistance: Math.floor(Math.random() * 5000) + 2000
    };

// You can add these stats to the page later if needed
    console.log('Platform Stats:', stats);
}

// Add console easter egg
console.log(`
🏃‍♂️ I'm Running Live Platform
============================
Platform Status: Online
API Version: 1.0.0
Developer Mode: Enabled

Want to integrate with our API?
Check out: /api/test
Documentation: Coming Soon!

Run live, connect live! 🚀
`);

// Add keyboard shortcuts for developers
document.addEventListener('keydown', function(e) {
    // Ctrl+Shift+D for developer info
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        showDeveloperInfo();
    }
});

function showDeveloperInfo() {
    const devInfo = `
🚀 I'm Running Live - Developer Info
=====================================

API Endpoints:
- GET  /api/health - Health check
- GET  /api/test - Test connection
- GET  /api/runner/:id/activity/:activity - Runner data
- POST /api/runner/:id/activity/:activity/messages - Send message

Current Platform Status: ${document.querySelector('.status span').textContent}
Page Load Time: ${performance.now().toFixed(2)}ms

For integration questions, check our GitHub!
   `;

    alert(devInfo);
}

// Add service worker registration for future PWA features
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Service worker registration will be added here later
        console.log('🔧 Service Worker support detected - PWA features coming soon!');
    });
}

// Performance monitoring
window.addEventListener('load', function() {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    console.log(`📊 Page loaded in ${loadTime}ms`);

    // Track performance (you can send this to analytics later)
    if (loadTime > 3000) {
        console.warn('⚠️ Slow page load detected');
    }
});

// Add error handling
window.addEventListener('error', function(e) {
    console.error('🚨 JavaScript Error:', e.error);
    // You can send error reports to your monitoring service here
});

// Add unhandled promise rejection handling
window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 Unhandled Promise Rejection:', e.reason);
});

// Add CSS for dynamic status classes
const dynamicStyles = `
<style>
.status-online {
   background: #d4edda !important;
   color: #155724 !important;
}

.status-warning {
   background: #fff3cd !important;
   color: #856404 !important;
}

.status-offline {
   background: #f8d7da !important;
   color: #721c24 !important;
}

.status-dot.status-online {
   background: #28a745 !important;
}

.status-dot.status-warning {
   background: #ffc107 !important;
}

.status-dot.status-offline {
   background: #dc3545 !important;
}
</style>
`;

// Inject dynamic styles
document.head.insertAdjacentHTML('beforeend', dynamicStyles);