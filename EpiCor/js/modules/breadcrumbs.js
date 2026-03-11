const Breadcrumbs = (() => {
    // Navigation path definitions
    const paths = {
        catalogPath: ['VIN', 'Catalog Tree', 'Manufacturers', 'Parts'],
        searchPath: ['VIN', 'Search Parts', 'Manufacturers', 'Parts'],
        laborPath: ['VIN', 'Catalog Tree', 'Select Data Type', 'Labor Operations'],
        laborProviderPath: ['VIN', 'Catalog Tree', 'Select Data Type', 'Select API Provider']
    };

    // Current breadcrumb state
    const state = {
        currentPath: [],
        activeStep: null,
        routingChoice: null // 'catalog', 'search', or null
    };

    /**
     * Initialize breadcrumbs for a specific view/path
     * @param {string} path - Path key: 'catalogPath', 'searchPath', 'laborPath', etc.
     * @param {string} activeStep - The current active step in the breadcrumb
     */
    const initBreadcrumbs = (path, activeStep) => {
        if (paths[path]) {
            state.currentPath = [...paths[path]];
            state.activeStep = activeStep;
            
            // Track routing choice from path name
            if (path.includes('search')) {
                state.routingChoice = 'search';
            } else if (path.includes('catalog')) {
                state.routingChoice = 'catalog';
            }
        }
    };

    /**
     * Update the active step in the current breadcrumb path
     * @param {string} stepName - Name of the active step
     */
    const updateActiveStep = (stepName) => {
        if (state.currentPath.includes(stepName)) {
            state.activeStep = stepName;
        }
    };

    /**
     * Get the parent step (for back navigation)
     * Restricted: can only go back one step, not jump to arbitrary steps
     * @returns {string|null} Parent step name or null if at root (VIN)
     */
    const getParentStep = () => {
        const currentIndex = state.currentPath.indexOf(state.activeStep);
        
        // If at VIN (first step), no parent
        if (currentIndex <= 0) {
            return null;
        }
        
        // Return immediate parent
        return state.currentPath[currentIndex - 1];
    };

    /**
     * Check if a step can be navigated to via breadcrumb click
     * Restricted navigation: only allow navigation to parent step or VIN
     * @param {string} stepName - Step to check
     * @returns {boolean} True if step can be navigated to
     */
    const isNavigableStep = (stepName) => {
        // Can always navigate to VIN
        if (stepName === 'VIN') {
            return true;
        }
        
        // Can navigate to parent step only
        const parentStep = getParentStep();
        return stepName === parentStep;
    };

    /**
     * Render breadcrumb HTML with proper structure and navigation restrictions
     * @returns {string} HTML string for breadcrumb
     */
    const renderBreadcrumbs = () => {
        if (!state.currentPath || state.currentPath.length === 0) {
            return '';
        }

        let html = '<div class="breadcrumb">';
        
        state.currentPath.forEach((step, index) => {
            const isActive = step === state.activeStep;
            const isNavigable = isNavigableStep(step);
            
            html += '<span class="breadcrumb-item ' + (isActive ? 'active' : '') + '">';
            
            if (isActive) {
                // Current active step - not clickable
                html += '<span>' + step + '</span>';
            } else if (isNavigable) {
                // Parent step or VIN - clickable
                html += '<a href="#" class="breadcrumb-link" data-step="' + step + '">' + step + '</a>';
            } else {
                // Disabled step - show but not clickable
                html += '<span style="color: #adb5bd; cursor: not-allowed;">' + step + '</span>';
            }
            
            html += '</span>';
            
            // Add separator between items (except after last item)
            if (index < state.currentPath.length - 1) {
                html += '<span class="breadcrumb-separator">›</span>';
            }
        });
        
        html += '</div>';
        return html;
    };

    /**
     * Set up breadcrumb click handlers in a container
     * @param {string|HTMLElement} containerSelector - Container ID or element
     * @param {Function} navigationCallback - Callback(stepName) when breadcrumb clicked
     */
    const setupClickHandlers = (containerSelector, navigationCallback) => {
        let container;
        
        if (typeof containerSelector === 'string') {
            container = document.getElementById(containerSelector);
        } else {
            container = containerSelector;
        }
        
        if (!container) {
            console.warn('Breadcrumb container not found:', containerSelector);
            return;
        }
        
        // Find all breadcrumb links in container
        const links = container.querySelectorAll('.breadcrumb-link');
        
        links.forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const stepName = link.getAttribute('data-step');
                
                if (stepName && isNavigableStep(stepName)) {
                    navigationCallback(stepName);
                }
            });
        });
    };

    /**
     * Get the routing choice (catalog or search path)
     * @returns {string|null} 'catalog', 'search', or null
     */
    const getRoutingChoice = () => {
        return state.routingChoice;
    };

    /**
     * Get current path array
     * @returns {array} Current breadcrumb path
     */
    const getCurrentPath = () => {
        return [...state.currentPath];
    };

    /**
     * Get active step
     * @returns {string|null} Currently active step
     */
    const getActiveStep = () => {
        return state.activeStep;
    };

    /**
     * Reset breadcrumbs (e.g., on logout)
     */
    const reset = () => {
        state.currentPath = [];
        state.activeStep = null;
        state.routingChoice = null;
    };

    return {
        initBreadcrumbs,
        updateActiveStep,
        getParentStep,
        isNavigableStep,
        renderBreadcrumbs,
        setupClickHandlers,
        getRoutingChoice,
        getCurrentPath,
        getActiveStep,
        reset
    };
})();
