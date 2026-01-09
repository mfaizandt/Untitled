// app.js - Main application orchestrator
const App = (() => {
    const initialize = () => {
        console.log('🚀 Initializing Parts Catalog Browser');
        
        // Load session from localStorage
        const session = AppState.loadSession();
        console.log('Session loaded:', session);
        
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
                    
                    // If we have vehicle config, we can proceed to tree view
                    if (session.hasVehicleConfig) {
                        // Automatically fetch category tree
                        API.fetchCategoryTree();
                        return;
                    }
                }
            }
            
            // If we have token but no vehicle config, show VIN form
            if (session.hasVehicleConfig) {
                // We have vehicle config, fetch tree
                API.fetchCategoryTree();
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
