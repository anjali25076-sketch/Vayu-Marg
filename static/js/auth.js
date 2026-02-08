// User Type Selection
let selectedUserType = 'citizen';

document.querySelectorAll('.user-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.user-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedUserType = btn.dataset.type;
    });
});

// Tab Switching
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update tab states
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update form visibility
        document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
        
        if (tabName === 'signin') {
            document.getElementById('signinForm').classList.remove('hidden');
        } else {
            document.getElementById('signupForm').classList.remove('hidden');
        }
    });
});

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Sign In Handler
document.getElementById('signinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                // Redirect based on user type
                if (data.user_type === 'citizen') {
                    window.location.href = '/dashboard/citizen';
                } else if (data.user_type === 'worker') {
                    window.location.href = '/dashboard/worker';
                } else if (data.user_type === 'official') {
                    window.location.href = '/dashboard/official';
                }
            }, 1000);
        } else {
            showNotification(data.error || 'Login failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
});

// Sign Up Handler
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;
    
    // Validation
    if (password !== passwordConfirm) {
        showNotification('Passwords do not match!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                email,
                password,
                user_type: selectedUserType
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Account created successfully! Please sign in.', 'success');
            
            // Switch to sign in tab after 2 seconds
            setTimeout(() => {
                document.querySelector('[data-tab="signin"]').click();
                document.getElementById('signin-email').value = email;
            }, 2000);
        } else {
            showNotification(data.error || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
});

// Google Sign In Handler
document.getElementById('googleSignIn').addEventListener('click', () => {
    showNotification('Google Sign-In coming soon! Use demo accounts for now.', 'info');
    // In production, this would trigger OAuth flow
    // window.location.href = '/auth/google?user_type=' + selectedUserType;
});

// Auto-fill demo credentials (for development)
window.fillDemoCredentials = function(type) {
    document.getElementById('signin-email').value = `${type}@demo.com`;
    document.getElementById('signin-password').value = 'demo123';
    
    // Select appropriate user type
    document.querySelectorAll('.user-type-btn').forEach(btn => {
        if (btn.dataset.type === type) {
            btn.click();
        }
    });
};

// Keyboard shortcuts for demo accounts (development helper)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        fillDemoCredentials('citizen');
    } else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        fillDemoCredentials('worker');
    } else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        fillDemoCredentials('official');
    }
});