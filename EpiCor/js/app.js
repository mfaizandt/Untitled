// app.js - Main application orchestrator
const App = (() => {
    const initialize = () => {
        console.log('🚀 Initializing Parts Catalog Browser');
        
        // Load session from localStorage
        const session = AppState.loadSession();
        console.log('Session loaded:', session);
        
        // Setup simple collapsible for Progress Summary
        const progressSummary = document.getElementById('progressSummary');
        const progressHeader = document.querySelector('.progress-summary-header');
        const progressSections = document.querySelector('.progress-sections');
        const toggleIcon = document.querySelector('.toggle-icon');
        
        if (progressHeader && progressSections) {
            progressHeader.style.cursor = 'pointer';
            progressSections.style.display = 'none'; // Hide by default
            if (toggleIcon) toggleIcon.classList.add('collapsed');
            
            progressHeader.addEventListener('click', function() {
                if (progressSections.style.display === 'none') {
                    progressSections.style.display = 'flex';
                    if (toggleIcon) toggleIcon.classList.remove('collapsed');
                } else {
                    progressSections.style.display = 'none';
                    if (toggleIcon) toggleIcon.classList.add('collapsed');
                }
            });
        }
        
        // Setup all event handlers
        Events.setupEventHandlers();
        
        // Check if we have a valid session
        if (session.hasToken) {
            console.log('✓ Found existing session, restoring...');
            
            // Show logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
            }
            
            // Restore VIN decode response if available
            if (session.hasVINResponse) {
                const vinDecodeResponse = AppState.getVINDecodeResponse();
                if (vinDecodeResponse && vinDecodeResponse.data && vinDecodeResponse.data.length > 0) {
                    AppState.setAPIResponse('vinDecode', vinDecodeResponse);
                    // Update progress summary after a short delay to ensure DOM is ready
                    setTimeout(() => {
                        UI.updateProgressSummary();
                    }, 100);
                    
                    // Token validation: silently validate token with stored VIN
                    // This catches stale tokens before user tries to perform actions
                    if (session.hasVehicleConfig) {
                        const storedVin = vinDecodeResponse.data[0].vin;
                        if (storedVin) {
                            console.log('🔐 Validating token with stored VIN...');
                            API.validateTokenViaVinDecode(storedVin).then((isValid) => {
                                if (isValid) {
                                    console.log('✓ Token is valid');
                                    UI.showVinNavigation();
                                } else {
                                    console.warn('✗ Token validation failed (401)');
                                    AppState.clearSession();
                                    Utils.showStatus('✗ Session expired. Please login again.', 'error');
                                    UI.showLoginForm();
                                }
                            }).catch((error) => {
                                console.error('Token validation error:', error);
                                // On network error, allow user to continue with existing session
                                // (they'll get a proper error if token is actually stale)
                                UI.showVinNavigation();
                            });
                            return;
                        }
                    }
                }
            }
            
            // If we have token but no vehicle config, show VIN form
            if (session.hasVehicleConfig) {
                // We have vehicle config, show VIN navigation
                UI.showVinNavigation();
            } else {
                // Show VIN form to continue
                UI.showVinForm();
                Utils.showStatus('✓ Session restored. Please enter VIN to continue.', 'success');
            }
        } else {
            // No session found, show login form
            UI.showLoginForm();
        }
        
        console.log('✓ Application initialized successfully');
    };
    
    return {
        initialize
    };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.initialize();
});
