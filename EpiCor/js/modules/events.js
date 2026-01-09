// events.js - Event handlers and user interactions
const Events = (() => {
    // Part Detail Modal handlers
    const setupPartDetailHandlers = () => {
        // Close modal buttons
        const closeModalBtn = document.getElementById('closePartDetailModal');
        const closeModalBtn2 = document.getElementById('closePartDetailModalBtn');
        const modal = document.getElementById('partDetailModal');
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                UI.hidePartDetailModal();
            });
        }
        
        if (closeModalBtn2) {
            closeModalBtn2.addEventListener('click', () => {
                UI.hidePartDetailModal();
            });
        }
        
        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    UI.hidePartDetailModal();
                }
            });
        }
        
        // Download part details button
        const downloadBtn = document.getElementById('downloadPartDetailBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                Utils.downloadPartDetails();
            });
        }
        
        // View Detail button handlers (delegated event handling)
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('view-detail-btn') && !e.target.disabled) {
                const partDataStr = e.target.getAttribute('data-part-data');
                if (!partDataStr) return;
                
                try {
                    const partData = JSON.parse(partDataStr.replace(/&quot;/g, '"'));
                    
                    if (!partData.partNumber) {
                        Utils.showStatus('⚠️ Part number is required', 'warning');
                        return;
                    }
                    
                    // Show modal with loading state
                    UI.showPartDetailModal();
                    const contentEl = document.getElementById('partDetailContent');
                    if (contentEl) {
                        contentEl.innerHTML = `
                            <div style="text-align: center; padding: 20px;">
                                <div class="spinner"></div>
                                <p>Loading part details...</p>
                            </div>
                        `;
                    }
                    
                    // Hide download button while loading
                    const downloadBtn = document.getElementById('downloadPartDetailBtn');
                    if (downloadBtn) {
                        downloadBtn.style.display = 'none';
                    }
                    
                    Utils.showStatus('🔄 Fetching part details...', 'warning');
                    
                    // Fetch part details
                    const partDetailsResponse = await API.fetchPartDetails(
                        partData.partNumber,
                        partData.manufacturerID,
                        partData.lineCode,
                        partData.catalogObjectID
                    );
                    
                    // Render part details
                    UI.renderPartDetails(partDetailsResponse);
                    
                    Utils.showStatus('✓ Part details loaded successfully', 'success');
                    
                } catch (error) {
                    console.error('Error fetching part details:', error);
                    const contentEl = document.getElementById('partDetailContent');
                    if (contentEl) {
                        contentEl.innerHTML = `
                            <div style="text-align: center; padding: 20px; color: #dc3545;">
                                <p><strong>Error loading part details</strong></p>
                                <p>${Utils.escapeHtml(error.message || 'Unknown error occurred')}</p>
                            </div>
                        `;
                    }
                    Utils.showStatus('✗ Failed to load part details: ' + (error.message || 'Unknown error'), 'error');
                }
            }
        });
    };
    
    const setupEventHandlers = () => {
        // Setup part detail handlers first
        setupPartDetailHandlers();
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    API.logout();
                    logoutBtn.style.display = 'none';
                }
            });
        }
        
        // Show/hide logout button based on session
        const updateLogoutButton = () => {
            if (logoutBtn) {
                const hasToken = AppState.getToken();
                logoutBtn.style.display = hasToken ? 'block' : 'none';
            }
        };
        
        // Check for session on load
        setTimeout(updateLogoutButton, 100);
        
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value.trim();
                
                if (!username || !password) {
                    Utils.showStatus('⚠️ Please enter both username and password', 'warning');
                    return;
                }
                
                API.loginUser(username, password).then(() => {
                    updateLogoutButton();
                }).catch(() => {
                    // Error already handled in loginUser
                });
            });
        }
        
        // Login form - Enter key
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (usernameInput) {
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') loginBtn.click();
            });
        }
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') loginBtn.click();
            });
        }
        
        // Decode VIN button
        const decodeVinBtn = document.getElementById('decodeVinBtn');
        if (decodeVinBtn) {
            decodeVinBtn.addEventListener('click', () => {
                const vin = document.getElementById('vin').value.trim();
                
                if (!vin) {
                    Utils.showStatus('⚠️ Please enter a VIN', 'warning');
                    return;
                }
                
                if (vin.length !== 17) {
                    Utils.showStatus('⚠️ VIN must be 17 characters long', 'warning');
                    return;
                }
                
                API.decodeVin(vin);
            });
        }
        
        // VIN form - Enter key
        const vinInput = document.getElementById('vin');
        if (vinInput) {
            vinInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') decodeVinBtn.click();
            });
        }
        
        // Catalog Tree Navigation
        const nextToManufacturersBtn = document.getElementById('nextToManufacturersBtn');
        if (nextToManufacturersBtn) {
            nextToManufacturersBtn.addEventListener('click', () => {
                if (AppState.getSelectedCatalogObjects().length === 0 && AppState.getSelectedGroups().length === 0) {
                    Utils.showStatus('⚠️ Please select at least one catalog object or group', 'warning');
                    return;
                }
                AppState.setAutoAdvanceFlag(true);
                const catalogObjectIDs = AppState.getSelectedCatalogObjects().map(obj => obj.catalogObjectID);
                const catalogGroupIDs = AppState.getSelectedGroups().map(grp => grp.groupID);
                API.fetchManufacturers(catalogObjectIDs, catalogGroupIDs);
            });
        }
        
        // Back to Tree button
        const backToTreeBtn = document.getElementById('backToTreeBtn');
        if (backToTreeBtn) {
            backToTreeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                UI.showTreeView();
            });
        }
        
        // Breadcrumb links
        const breadcrumbTree = document.getElementById('breadcrumbTree');
        if (breadcrumbTree) {
            breadcrumbTree.addEventListener('click', (e) => {
                e.preventDefault();
                UI.showTreeView();
            });
        }
        
        // Back to VIN from various screens
        const backToVinBtn = document.getElementById('backToVinBtn');
        if (backToVinBtn) {
            backToVinBtn.addEventListener('click', () => {
                UI.showVinForm();
            });
        }
        
        const breadcrumbVinFromManufacturers = document.getElementById('breadcrumbVinFromManufacturers');
        if (breadcrumbVinFromManufacturers) {
            breadcrumbVinFromManufacturers.addEventListener('click', (e) => {
                e.preventDefault();
                UI.showVinForm();
            });
        }
        
        const breadcrumbVinFromParts = document.getElementById('breadcrumbVinFromParts');
        if (breadcrumbVinFromParts) {
            breadcrumbVinFromParts.addEventListener('click', (e) => {
                e.preventDefault();
                UI.showVinForm();
            });
        }
        
        // Manufacturer Selection
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                UI.selectAllBrands();
            });
        }
        
        const deselectAllBtn = document.getElementById('deselectAllBtn');
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                UI.deselectAllBrands();
            });
        }
        
        const viewPartsBtn = document.getElementById('viewPartsBtn');
        if (viewPartsBtn) {
            viewPartsBtn.addEventListener('click', () => {
                if (AppState.getSelectedBrands().size === 0) {
                    Utils.showStatus('⚠️ Please select at least one brand', 'warning');
                    return;
                }
                API.fetchParts();
            });
        }
        
        const backToManufacturersBtn = document.getElementById('backToManufacturersBtn');
        if (backToManufacturersBtn) {
            backToManufacturersBtn.addEventListener('click', () => {
                UI.showManufacturerSelection();
            });
        }
        
        const breadcrumbTreeFromParts = document.getElementById('breadcrumbTreeFromParts');
        if (breadcrumbTreeFromParts) {
            breadcrumbTreeFromParts.addEventListener('click', (e) => {
                e.preventDefault();
                UI.showTreeView();
            });
        }
        
        const breadcrumbManufacturers = document.getElementById('breadcrumbManufacturers');
        if (breadcrumbManufacturers) {
            breadcrumbManufacturers.addEventListener('click', (e) => {
                e.preventDefault();
                UI.showManufacturerSelection();
            });
        }
        
        const breadcrumbVin = document.getElementById('breadcrumbVin');
        if (breadcrumbVin) {
            breadcrumbVin.addEventListener('click', (e) => {
                e.preventDefault();
                UI.showVinForm();
            });
        }
        
        // Manufacturer search
        const manufacturerSearch = document.getElementById('manufacturerSearch');
        if (manufacturerSearch) {
            manufacturerSearch.addEventListener('input', function() {
                filterManufacturers(this.value.toLowerCase().trim());
            });
        }
        
        // Tree controls
        const expandAllBtn = document.getElementById('expandAllBtn');
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => {
                Tree.expandAll();
            });
        }
        
        const collapseAllBtn = document.getElementById('collapseAllBtn');
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => {
                Tree.collapseAll();
            });
        }
        
        // Tree search with debouncing
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.addEventListener('keyup', function() {
                const searchTerm = this.value.toLowerCase().trim();
                
                // Clear previous timeout
                if (AppState.searchTimeout) {
                    clearTimeout(AppState.searchTimeout);
                }
                
                // If search term is empty, clear search
                if (!searchTerm) {
                    const treeInstance = AppState.getTreeInstance();
                    if (treeInstance) {
                        Tree.clearSearch();
                        AppState.searchActive = false;
                        // Re-enable animations after search clears
                        const treeElement = $('#tree');
                        if (treeElement.jstree) {
                            treeElement.jstree('set_animation', 200);
                        }
                    }
                    document.getElementById('searchLoading').style.display = 'none';
                    return;
                }
                
                // Show loading indicator
                document.getElementById('searchLoading').style.display = 'inline-block';
                AppState.searchActive = true;
                // Disable animations while searching
                const treeElement = $('#tree');
                if (treeElement.jstree) {
                    treeElement.jstree('set_animation', 0);
                }
                
                // Debounce the search - wait 500ms after user stops typing
                AppState.searchTimeout = setTimeout(() => {
                    performSearch(searchTerm);
                    document.getElementById('searchLoading').style.display = 'none';
                }, 500);
            });
        }
    };
    
    const filterManufacturers = (searchTerm) => {
        if (!searchTerm) {
            UI.renderManufacturers();
            return;
        }
        
        const filtered = AppState.getAllBrands().filter(brand =>
            brand.brandName.toLowerCase().includes(searchTerm) ||
            brand.manufacturerName.toLowerCase().includes(searchTerm)
        );
        
        UI.renderManufacturers(filtered);
    };
    
    const performSearch = (searchTerm) => {
        Tree.search(searchTerm);
    };
    
    return {
        setupEventHandlers
    };
})();
