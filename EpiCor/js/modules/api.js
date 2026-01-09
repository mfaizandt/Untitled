// api.js - API communication module
const API = (() => {
    const loginUser = async (username, password) => {
        try {
            Utils.showStatus('🔄 Logging in...', 'warning');
            const loginBtn = document.getElementById('loginBtn');
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
            
            const baseURL = AppState.getAPIBaseURL();
            const response = await fetch(`${baseURL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'x-application-key': ''
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    invalidateOldestToken: false,
                    epnSellerID: ''
                })
            });
            
            if (!response.ok) {
                // Clear any existing session on login failure
                AppState.clearSession();
                throw new Error(`Login failed: ${response.statusText}`);
            }
            
            const loginResponse = await response.json();
            AppState.setToken(loginResponse.accessToken);
            
            Utils.showStatus('✓ Login successful!', 'success');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
            
            // Show logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
            }
            
            // Session is now saved automatically via setToken
            setTimeout(() => {
                UI.showVinForm();
            }, 1000);
            
            return Promise.resolve(true);
            
        } catch (error) {
            console.error('Login error:', error);
            const loginBtn = document.getElementById('loginBtn');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
            Utils.showStatus('✗ Login failed: ' + (error.message || 'Please check your credentials and try again.'), 'error');
        }
    };
    
    const decodeVin = async (vin) => {
        if (!AppState.getToken()) {
            Utils.showStatus('✗ Please login first', 'error');
            return;
        }
        
        try {
            Utils.showStatus('🔄 Decoding VIN...', 'warning');
            const decodeBtn = document.getElementById('decodeVinBtn');
            decodeBtn.disabled = true;
            decodeBtn.textContent = 'Decoding...';
            
            const baseURL = AppState.getAPIBaseURL();
            const response = await fetch(`${baseURL}/api/vin/decode-vin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${AppState.getToken()}`
                },
                body: JSON.stringify({ vins: [vin] })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                // If token is invalid (401), clear session
                if (response.status === 401) {
                    AppState.clearSession();
                    Utils.showStatus('✗ Session expired. Please login again.', 'error');
                    setTimeout(() => {
                        UI.showLoginForm();
                    }, 2000);
                }
                throw new Error(`VIN decode failed: ${response.status} ${response.statusText}. ${errorText}`);
            }
            
            const decodeResponse = await response.json();
            
            if (decodeResponse.data && decodeResponse.data.length > 0) {
                const vehicleConfiguration = decodeResponse.data[0].vehicleConfiguration;
                
                if (!vehicleConfiguration) {
                    throw new Error('Vehicle configuration not found in VIN decode response');
                }
                
                AppState.setVINDecodeResponse(decodeResponse);
                AppState.setAPIResponse('vinDecode', decodeResponse);
                AppState.setVehicleConfig(vehicleConfiguration);
                // Session is now saved automatically via setVINDecodeResponse and setVehicleConfig
                
                // Update progress summary to show vehicle info
                UI.updateProgressSummary();
                
                Utils.showStatus('✓ VIN decoded successfully!', 'success');
                decodeBtn.disabled = false;
                decodeBtn.textContent = 'Decode VIN';
                
                setTimeout(() => {
                    API.fetchCategoryTree();
                }, 1000);
            } else {
                throw new Error('No vehicle data returned from VIN decode');
            }
            
        } catch (error) {
            console.error('VIN decode error:', error);
            const decodeBtn = document.getElementById('decodeVinBtn');
            decodeBtn.disabled = false;
            decodeBtn.textContent = 'Decode VIN';
            Utils.showStatus('✗ VIN decode failed: ' + (error.message || 'Please check the VIN and try again.'), 'error');
        }
    };
    
    const fetchCategoryTree = async () => {
        if (!AppState.getToken() || !AppState.getVehicleConfig()) {
            Utils.showStatus('✗ Please login and decode VIN first', 'error');
            return;
        }
        
        try {
            Utils.showStatus('🔄 Loading category tree...', 'warning');
            
            const baseURL = AppState.getAPIBaseURL();
            const response = await fetch(`${baseURL}/api/parts/category-tree`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${AppState.getToken()}`,
                    'X-Vehicle-Configuration': AppState.getVehicleConfig()
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                // If token is invalid (401), clear session
                if (response.status === 401) {
                    AppState.clearSession();
                    Utils.showStatus('✗ Session expired. Please login again.', 'error');
                    setTimeout(() => {
                        UI.showLoginForm();
                    }, 2000);
                }
                throw new Error(`Category tree fetch failed: ${response.status} ${response.statusText}. ${errorText}`);
            }
            
            const categoryTree = await response.json();
            AppState.setCatalogData(categoryTree);
            AppState.setAPIResponse('categoryTree', categoryTree);
            
            Tree.buildTree(categoryTree);
            UI.updateProgressSummary();
            UI.showTreeView();
            
        } catch (error) {
            console.error('Category tree error:', error);
            Utils.showStatus('✗ Failed to load category tree: ' + (error.message || 'Please try again.'), 'error');
        }
    };
    
    const fetchManufacturers = async (catalogObjectIDs, catalogGroupIDs) => {
        if (!AppState.getToken() || !AppState.getVehicleConfig()) {
            Utils.showStatus('✗ Please login and decode VIN first', 'error');
            return;
        }
        
        const objIds = Array.isArray(catalogObjectIDs) ? catalogObjectIDs : (catalogObjectIDs ? [catalogObjectIDs] : []);
        const grpIds = Array.isArray(catalogGroupIDs) ? catalogGroupIDs : (catalogGroupIDs ? [catalogGroupIDs] : []);
        
        if (objIds.length === 0 && grpIds.length === 0) {
            Utils.showStatus('⚠️ Please select at least one catalog object or group', 'warning');
            return;
        }
        
        try {
            UI.showManufacturerSelection();
            Utils.setDisplay('manufacturerLoading', 'block');
            Utils.setDisplay('manufacturerContent', 'none');
            
            const baseURL = AppState.getAPIBaseURL();
            let url = `${baseURL}/api/parts/manufacturers?regionIDs=1&allManufacturers=true&includeOem=true`;
            
            if (objIds.length > 0) {
                url += `&catalogObjectIDs=${objIds.join(',')}`;
            }
            if (grpIds.length > 0) {
                url += `&catalogGroupIDs=${grpIds.join(',')}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${AppState.getToken()}`,
                    'Accept-Language': 'en-US',
                    'X-Vehicle-Configuration': AppState.getVehicleConfig()
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                // If token is invalid (401), clear session
                if (response.status === 401) {
                    AppState.clearSession();
                    Utils.showStatus('✗ Session expired. Please login again.', 'error');
                    setTimeout(() => {
                        UI.showLoginForm();
                    }, 2000);
                }
                throw new Error(`Manufacturers fetch failed: ${response.status} ${response.statusText}. ${errorText}`);
            }
            
            const manufacturersResponse = await response.json();
            AppState.setManufacturers(manufacturersResponse.data);
            AppState.setAPIResponse('manufacturers', manufacturersResponse);
            
            // Build brands list with manufacturer info
            const allBrands = [];
            const selectedBrands = new Set();
            
            manufacturersResponse.data.forEach((manufacturer) => {
                manufacturer.brands.forEach((brand) => {
                    // Ensure brandID is stored as a number for consistency
                    const brandID = parseInt(brand.brandID, 10);
                    const manufacturerID = parseInt(manufacturer.manufacturerID, 10);
                    
                    allBrands.push({
                        manufacturerID: manufacturerID,
                        manufacturerName: manufacturer.manufacturerName,
                        brandID: brandID,
                        brandName: brand.brandName
                    });
                    // Store as number to match UI selections
                    selectedBrands.add(brandID);
                });
            });
            
            AppState.setAllBrands(allBrands);
            AppState.setSelectedBrands(selectedBrands);
            
            UI.renderManufacturers();
            UI.updateSelectedCount();
            UI.updateProgressSummary();
            
            Utils.setDisplay('manufacturerLoading', 'none');
            Utils.setDisplay('manufacturerContent', 'block');
            Utils.showStatus('✓ Manufacturers loaded successfully!', 'success');
            
            if (AppState.getAutoAdvanceFlag()) {
                AppState.setAutoAdvanceFlag(false);
                setTimeout(() => {
                    API.fetchParts();
                }, 500);
            }
            
        } catch (error) {
            console.error('Manufacturers error:', error);
            Utils.setDisplay('manufacturerLoading', 'none');
            Utils.showStatus('✗ Failed to load manufacturers: ' + (error.message || 'Please try again.'), 'error');
        }
    };
    
    const fetchParts = async () => {
        if (!AppState.getToken() || !AppState.getVehicleConfig()) {
            Utils.showStatus('✗ Please login and decode VIN first', 'error');
            return;
        }
        
        const catalogObjectIDs = AppState.getSelectedCatalogObjects().length > 0 
            ? AppState.getSelectedCatalogObjects().map(obj => obj.catalogObjectID)
            : [];
        const catalogGroupIDs = AppState.getSelectedGroups().length > 0 
            ? AppState.getSelectedGroups().map(grp => grp.groupID)
            : [];
        
        if (catalogObjectIDs.length === 0 && catalogGroupIDs.length === 0) {
            Utils.showStatus('⚠️ Please select at least one catalog object or group', 'warning');
            return;
        }
        
        if (AppState.getSelectedBrands().size === 0) {
            Utils.showStatus('⚠️ Please select at least one brand', 'warning');
            return;
        }
        
        try {
            UI.showPartsView();
            const partsLoadingEl = document.getElementById('partsLoading');
            const partsContentEl = document.getElementById('partsView').querySelector('#partsContent');
            if (partsLoadingEl) partsLoadingEl.style.display = 'block';
            if (partsContentEl) partsContentEl.style.display = 'none';
            
            // Build CCL object from selected manufacturers/brands
            const cclDetails = [];
            const selectedBrandsArray = Array.from(AppState.getSelectedBrands());
            
            // Ensure brand IDs are compared as numbers
            const selectedBrandsSet = new Set(selectedBrandsArray.map(id => parseInt(id, 10)));
            
            AppState.getAllBrands().forEach((brand) => {
                const brandID = parseInt(brand.brandID, 10);
                if (selectedBrandsSet.has(brandID)) {
                    cclDetails.push({
                        manufacturerID: parseInt(brand.manufacturerID, 10),
                        manufacturerBrandID: brandID
                    });
                }
            });
            
            if (cclDetails.length === 0) {
                throw new Error('No brands selected for CCL. Please select at least one brand.');
            }
            
            const ccl = {
                cclID: 1,
                name: 'virtual CCL',
                cclDetails: cclDetails
            };
            
            console.log('Fetching parts with:', {
                catalogObjectIDs,
                catalogGroupIDs,
                selectedBrandsCount: selectedBrandsArray.length,
                cclDetailsCount: cclDetails.length,
                ccl: ccl
            });
            
            const baseURL = AppState.getAPIBaseURL();
            let url = `${baseURL}/api/parts/get-part-fitments?regionID=1`;
            
            if (catalogObjectIDs.length > 0) {
                url += `&catalogObjectIDs=${catalogObjectIDs.join(',')}`;
            }
            if (catalogGroupIDs.length > 0) {
                url += `&catalogGroupIDs=${catalogGroupIDs.join(',')}`;
            }
            
            console.log('Parts API URL:', url);
            console.log('Parts API CCL:', JSON.stringify(ccl));
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${AppState.getToken()}`,
                    'X-Vehicle-Configuration': AppState.getVehicleConfig(),
                    'Content-Type': 'application/json',
                    'Accept-Language': 'en-US',
                    'X-CCL': JSON.stringify(ccl)
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                // If token is invalid (401), clear session
                if (response.status === 401) {
                    AppState.clearSession();
                    Utils.showStatus('✗ Session expired. Please login again.', 'error');
                    setTimeout(() => {
                        UI.showLoginForm();
                    }, 2000);
                }
                console.error('Parts API Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText: errorText,
                    url: url,
                    headers: {
                        'Authorization': 'Bearer ***',
                        'X-Vehicle-Configuration': AppState.getVehicleConfig(),
                        'X-CCL': JSON.stringify(ccl)
                    }
                });
                throw new Error(`Parts fetch failed: ${response.status} ${response.statusText}. ${errorText}`);
            }
            
            const partsResponse = await response.json();
            
            console.log('Parts API response:', partsResponse);
            
            // Handle different response structures
            let parts = [];
            if (partsResponse.data && Array.isArray(partsResponse.data)) {
                parts = partsResponse.data;
            } else if (Array.isArray(partsResponse)) {
                parts = partsResponse;
            } else {
                console.warn('Unexpected parts response structure:', partsResponse);
            }
            
            console.log('Parts array after processing:', parts);
            console.log('Parts count:', parts.length);
            
            AppState.setParts(parts);
            AppState.setAPIResponse('parts', partsResponse);
            
            UI.renderParts();
            UI.updateProgressSummary();
            
            if (partsLoadingEl) partsLoadingEl.style.display = 'none';
            if (partsContentEl) partsContentEl.style.display = 'block';
            Utils.showStatus(`✓ Loaded ${parts.length} parts successfully!`, 'success');
            
        } catch (error) {
            console.error('Parts error:', error);
            const partsLoadingEl = document.getElementById('partsLoading');
            if (partsLoadingEl) partsLoadingEl.style.display = 'none';
            Utils.showStatus('✗ Failed to load parts: ' + (error.message || 'Please try again.'), 'error');
        }
    };
    
    const logout = () => {
        AppState.clearSession();
        
        // Hide logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
        
        UI.showLoginForm();
        Utils.showStatus('✓ Logged out successfully', 'success');
    };
    
    const fetchPartDetails = async (partNumber, manufacturerID, lineCode, catalogObjectID) => {
        try {
            const baseURL = AppState.getAPIBaseURL();
            const token = AppState.getToken();
            const vehicleConfig = AppState.getVehicleConfig();
            
            if (!token) {
                throw new Error('Not authenticated. Please login first.');
            }
            
            if (!partNumber) {
                throw new Error('Part number is required');
            }
            
            // Build query parameters
            const params = new URLSearchParams();
            params.append('partNumber', partNumber);
            if (manufacturerID) params.append('manufacturerID', manufacturerID);
            if (lineCode) params.append('lineCode', lineCode);
            if (catalogObjectID) params.append('catalogObjectID', catalogObjectID);
            
            // Build headers
            const headers = {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-application-key': ''
            };
            
            // Add X-Vehicle-Configuration header if available
            if (vehicleConfig) {
                try {
                    headers['X-Vehicle-Configuration'] = JSON.stringify({
                        vcdb: {
                            vehicle: {
                                baseVehicle: {
                                    baseVehicleID: vehicleConfig.baseVehicleID || vehicleConfig.baseVehicle?.baseVehicleID
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.warn('Could not set X-Vehicle-Configuration header:', e);
                }
            }
            
            // Add X-CCL-ID if we have selected brands
            const selectedBrands = AppState.getSelectedBrands();
            if (selectedBrands.size > 0) {
                // Use first selected brand's CCL if available
                // For now, we'll skip this as it requires CCL ID which we don't have
            }
            
            const url = `${baseURL}/api/parts/detail?${params.toString()}`;
            console.log('Fetching part details from:', url);
            console.log('Headers:', { ...headers, Authorization: 'Bearer ***' });
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });
            
            if (response.status === 401) {
                AppState.clearSession();
                UI.showLoginForm();
                throw new Error('Session expired. Please login again.');
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Part details fetch failed: ${response.status} ${response.statusText}. ${errorText}`);
            }
            
            const partDetailsResponse = await response.json();
            AppState.setAPIResponse('partDetails', partDetailsResponse);
            
            return partDetailsResponse;
            
        } catch (error) {
            console.error('Part details error:', error);
            throw error;
        }
    };
    
    return {
        loginUser,
        decodeVin,
        fetchCategoryTree,
        fetchManufacturers,
        fetchParts,
        logout,
        fetchPartDetails
    };
})();
