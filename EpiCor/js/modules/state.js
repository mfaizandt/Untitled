// state.js - Global application state management
const AppState = (() => {
    const state = {
        // API Configuration
        API_BASE_URL: 'https://pilot.epicor-auto-catalog.cloud',
        accessToken: null,
        vehicleConfig: null,
        
        // Catalog Data
        catalogData: null,
        treeInstance: null,
        
        // Search state
        searchTimeout: null,
        isSearching: false,
        searchActive: false,
        
        // Catalog Selection
        selectedCatalogObjects: [],
        selectedGroups: [],
        selectedCatalogObjectID: null,
        selectedCatalogObjectName: null,
        selectedCategory: null,
        selectedGroup: null,
        
        // Manufacturer state
        manufacturers: [],
        allBrands: [],
        selectedBrands: new Set(),
        
        // Parts
        parts: [],
        
        // Progress tracking
        vinDecodeResponse: null,
        autoAdvanceToPartsScreen: false,
        apiResponses: {
            vinDecode: null,
            categoryTree: null,
            manufacturers: null,
            parts: null
        }
    };
    
    // Getter methods
    const getters = {
        getAPIBaseURL: () => state.API_BASE_URL,
        getToken: () => state.accessToken,
        getVehicleConfig: () => state.vehicleConfig,
        getCatalogData: () => state.catalogData,
        getTreeInstance: () => state.treeInstance,
        getSelectedCatalogObjects: () => state.selectedCatalogObjects,
        getSelectedGroups: () => state.selectedGroups,
        getManufacturers: () => state.manufacturers,
        getAllBrands: () => state.allBrands,
        getSelectedBrands: () => state.selectedBrands,
        getParts: () => state.parts,
        getVINDecodeResponse: () => state.vinDecodeResponse,
        getAPIResponses: () => state.apiResponses,
        getAutoAdvanceFlag: () => state.autoAdvanceToPartsScreen
    };
    
    // Setter methods
    const setters = {
        setToken: (token) => {
            state.accessToken = token;
            if (token) {
                try {
                    localStorage.setItem('epicor_accessToken', token);
                } catch (e) {
                    console.warn('Failed to save token to localStorage:', e);
                }
            } else {
                try {
                    localStorage.removeItem('epicor_accessToken');
                } catch (e) {
                    console.warn('Failed to remove token from localStorage:', e);
                }
            }
        },
        setVehicleConfig: (config) => {
            state.vehicleConfig = config;
            if (config) {
                try {
                    localStorage.setItem('epicor_vehicleConfig', config);
                } catch (e) {
                    console.warn('Failed to save vehicle config to localStorage:', e);
                }
            } else {
                try {
                    localStorage.removeItem('epicor_vehicleConfig');
                } catch (e) {
                    console.warn('Failed to remove vehicle config from localStorage:', e);
                }
            }
        },
        setCatalogData: (data) => state.catalogData = data,
        setTreeInstance: (instance) => state.treeInstance = instance,
        setSelectedCatalogObjects: (objs) => state.selectedCatalogObjects = objs,
        setSelectedGroups: (grps) => state.selectedGroups = grps,
        setManufacturers: (mfrs) => state.manufacturers = mfrs,
        setAllBrands: (brands) => state.allBrands = brands,
        setSelectedBrands: (brands) => state.selectedBrands = brands,
        setParts: (parts) => state.parts = parts,
        setVINDecodeResponse: (response) => {
            state.vinDecodeResponse = response;
            if (response) {
                try {
                    localStorage.setItem('epicor_vinDecodeResponse', JSON.stringify(response));
                } catch (e) {
                    console.warn('Failed to save VIN decode response to localStorage:', e);
                }
            } else {
                try {
                    localStorage.removeItem('epicor_vinDecodeResponse');
                } catch (e) {
                    console.warn('Failed to remove VIN decode response from localStorage:', e);
                }
            }
        },
        setAutoAdvanceFlag: (flag) => state.autoAdvanceToPartsScreen = flag,
        setCatalogObjectName: (name) => state.selectedCatalogObjectName = name,
        clearSelectedBrands: () => state.selectedBrands.clear(),
        addSelectedBrand: (brandId) => state.selectedBrands.add(brandId),
        removeSelectedBrand: (brandId) => state.selectedBrands.delete(brandId),
        setAPIResponse: (type, response) => state.apiResponses[type] = response,
        resetState: () => {
            state.selectedCatalogObjects = [];
            state.selectedGroups = [];
            state.selectedCatalogObjectID = null;
            state.selectedBrands.clear();
            state.parts = [];
            state.manufacturersMap = null;
        },
        // Load session from localStorage
        loadSession: () => {
            try {
                const token = localStorage.getItem('epicor_accessToken');
                const vehicleConfig = localStorage.getItem('epicor_vehicleConfig');
                const vinDecodeResponse = localStorage.getItem('epicor_vinDecodeResponse');
                
                if (token) {
                    state.accessToken = token;
                }
                if (vehicleConfig) {
                    state.vehicleConfig = vehicleConfig;
                }
                if (vinDecodeResponse) {
                    try {
                        state.vinDecodeResponse = JSON.parse(vinDecodeResponse);
                        state.apiResponses.vinDecode = state.vinDecodeResponse;
                    } catch (e) {
                        console.warn('Failed to parse VIN decode response from localStorage:', e);
                    }
                }
                
                return {
                    hasToken: !!token,
                    hasVehicleConfig: !!vehicleConfig,
                    hasVINResponse: !!vinDecodeResponse
                };
            } catch (e) {
                console.warn('Failed to load session from localStorage:', e);
                return { hasToken: false, hasVehicleConfig: false, hasVINResponse: false };
            }
        },
        // Clear session (logout)
        clearSession: () => {
            try {
                localStorage.removeItem('epicor_accessToken');
                localStorage.removeItem('epicor_vehicleConfig');
                localStorage.removeItem('epicor_vinDecodeResponse');
            } catch (e) {
                console.warn('Failed to clear session from localStorage:', e);
            }
            state.accessToken = null;
            state.vehicleConfig = null;
            state.vinDecodeResponse = null;
            state.apiResponses.vinDecode = null;
        }
    };
    
    // Expose search state directly for easy access
    return { 
        ...getters, 
        ...setters,
        get searchActive() { return state.searchActive; },
        set searchActive(value) { state.searchActive = value; },
        get searchTimeout() { return state.searchTimeout; },
        set searchTimeout(value) { state.searchTimeout = value; }
    };
})();
