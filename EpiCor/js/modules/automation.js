// automation.js - Automated parts export functionality
const Automation = (() => {
    // State
    let isRunning = false;
    let isStopped = false;
    let collectedParts = [];
    let currentGroupIndex = 0;
    let allGroups = [];
    
    // Manufacturer name prefixes to filter
    const MANUFACTURER_PREFIXES = ['Advance/', 'Worldpac', 'OE+', 'Carquest/', 'AZ/'];
    
    // Programmatic fetch manufacturers (without UI updates)
    const fetchManufacturersForGroup = async (groupID) => {
        const baseURL = AppState.getAPIBaseURL();
        const token = AppState.getToken();
        const vehicleConfig = AppState.getVehicleConfig();
        
        if (!token || !vehicleConfig) {
            throw new Error('Not authenticated. Please login and decode VIN first.');
        }
        
        const url = `${baseURL}/api/parts/manufacturers?regionIDs=1&allManufacturers=true&includeOem=true&catalogGroupIDs=${groupID}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept-Language': 'en-US',
                'X-Vehicle-Configuration': vehicleConfig
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 401) {
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(`Manufacturers fetch failed: ${response.status} ${response.statusText}. ${errorText}`);
        }
        
        const manufacturersResponse = await response.json();
        return manufacturersResponse.data || [];
    };
    
    // Filter manufacturers by name prefixes
    const filterManufacturersByPrefix = (manufacturers) => {
        const filtered = [];
        const selectedBrands = [];
        
        manufacturers.forEach((manufacturer) => {
            if (!manufacturer.manufacturerName) {
                return;
            }
            
            const manufacturerName = manufacturer.manufacturerName;
            const matchesPrefix = MANUFACTURER_PREFIXES.some(prefix => 
                manufacturerName.startsWith(prefix)
            );
            
            if (matchesPrefix) {
                filtered.push(manufacturer);
                // Collect all brands from matching manufacturers
                manufacturer.brands.forEach((brand) => {
                    selectedBrands.push({
                        manufacturerID: parseInt(manufacturer.manufacturerID, 10),
                        manufacturerBrandID: parseInt(brand.brandID, 10)
                    });
                });
            }
        });
        
        return { filteredManufacturers: filtered, selectedBrands };
    };
    
    // Build CCL from selected brands
    const buildCCL = (selectedBrands) => {
        if (selectedBrands.length === 0) {
            return null;
        }
        
        return {
            cclID: 1,
            name: 'virtual CCL',
            cclDetails: selectedBrands
        };
    };
    
    // Programmatic fetch parts (without UI updates)
    const fetchPartsForGroup = async (groupID, ccl) => {
        if (!ccl || !ccl.cclDetails || ccl.cclDetails.length === 0) {
            return [];
        }
        
        const baseURL = AppState.getAPIBaseURL();
        const token = AppState.getToken();
        const vehicleConfig = AppState.getVehicleConfig();
        
        if (!token || !vehicleConfig) {
            throw new Error('Not authenticated. Please login and decode VIN first.');
        }
        
        const url = `${baseURL}/api/parts/get-part-fitments?regionID=1&catalogGroupIDs=${groupID}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Vehicle-Configuration': vehicleConfig,
                'Content-Type': 'application/json',
                'Accept-Language': 'en-US',
                'X-CCL': JSON.stringify(ccl)
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 401) {
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(`Parts fetch failed: ${response.status} ${response.statusText}. ${errorText}`);
        }
        
        const partsResponse = await response.json();
        
        // Handle different response structures
        let parts = [];
        if (partsResponse.data && Array.isArray(partsResponse.data)) {
            parts = partsResponse.data;
        } else if (Array.isArray(partsResponse)) {
            parts = partsResponse;
        }
        
        return parts;
    };
    
    // Extract required fields from parts
    const extractPartFields = (parts) => {
        return parts.map(part => ({
            partTypeTerminologyName: part.partType?.partTerminologyName || '',
            positionName: part.position?.position || '',
            partNumber: part.partNumber || '',
            manufacturerName: part.manufacturer?.name || part.manufacturerName || ''
        }));
    };
    
    // Process a single group
    const processGroup = async (group) => {
        // Check if stopped
        if (isStopped) {
            return { success: false, parts: [], message: 'Stopped by user' };
        }
        
        try {
            // Update progress
            updateProgress(currentGroupIndex + 1, allGroups.length, group.groupName, collectedParts.length);
            addLogMessage(`Processing group: ${group.groupName} (ID: ${group.groupID})`);
            
            // Fetch manufacturers
            addLogMessage(`Fetching manufacturers for group ${group.groupID}...`);
            const manufacturers = await fetchManufacturersForGroup(group.groupID);
            
            if (manufacturers.length === 0) {
                addLogMessage(`No manufacturers found for group ${group.groupName}`);
                return { success: true, parts: [], message: 'No manufacturers' };
            }
            
            // Filter manufacturers by prefix
            const { filteredManufacturers, selectedBrands } = filterManufacturersByPrefix(manufacturers);
            
            if (selectedBrands.length === 0) {
                addLogMessage(`No matching manufacturers found for group ${group.groupName}`);
                return { success: true, parts: [], message: 'No matching manufacturers' };
            }
            
            addLogMessage(`Found ${filteredManufacturers.length} matching manufacturer(s) with ${selectedBrands.length} brand(s)`);
            
            // Build CCL
            const ccl = buildCCL(selectedBrands);
            
            // Fetch parts
            addLogMessage(`Fetching parts for group ${group.groupName}...`);
            const parts = await fetchPartsForGroup(group.groupID, ccl);
            
            if (parts.length === 0) {
                addLogMessage(`No parts found for group ${group.groupName}`);
                return { success: true, parts: [], message: 'No parts' };
            }
            
            // Extract fields
            const extractedParts = extractPartFields(parts);
            addLogMessage(`Found ${parts.length} part(s) in group ${group.groupName}`);
            
            return { success: true, parts: extractedParts, message: 'Success' };
            
        } catch (error) {
            console.error(`Error processing group ${group.groupName}:`, error);
            addLogMessage(`Error processing group ${group.groupName}: ${error.message}`, 'error');
            return { success: false, parts: [], message: error.message };
        }
    };
    
    // Extract all groups from category tree
    const extractAllGroups = () => {
        const catalogData = AppState.getCatalogData();
        if (!catalogData || !catalogData.data) {
            throw new Error('Category tree data not available');
        }
        
        const groups = [];
        catalogData.data.forEach((category) => {
            if (category.groups && Array.isArray(category.groups)) {
                category.groups.forEach((group) => {
                    groups.push({
                        groupID: group.groupID,
                        groupName: group.groupName || `Group ${group.groupID}`,
                        categoryID: category.categoryID,
                        categoryName: category.categoryName
                    });
                });
            }
        });
        
        return groups;
    };
    
    // Process all groups
    const processAllGroups = async () => {
        try {
            // Extract all groups
            allGroups = extractAllGroups();
            
            if (allGroups.length === 0) {
                throw new Error('No groups found in category tree');
            }
            
            addLogMessage(`Found ${allGroups.length} group(s) to process`);
            updateProgress(0, allGroups.length, '', 0);
            
            // Reset collected parts
            collectedParts = [];
            currentGroupIndex = 0;
            
            // Process each group
            for (let i = 0; i < allGroups.length; i++) {
                // Check if stopped
                if (isStopped) {
                    addLogMessage('Export stopped by user', 'warning');
                    break;
                }
                
                currentGroupIndex = i;
                const group = allGroups[i];
                
                const result = await processGroup(group);
                
                if (result.success && result.parts.length > 0) {
                    collectedParts.push(...result.parts);
                    updateProgress(i + 1, allGroups.length, group.groupName, collectedParts.length);
                }
                
                // Small delay to prevent overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return collectedParts;
            
        } catch (error) {
            console.error('Error processing groups:', error);
            addLogMessage(`Error: ${error.message}`, 'error');
            throw error;
        }
    };
    
    // Generate CSV string
    const generateCSV = (parts) => {
        if (parts.length === 0) {
            return '';
        }
        
        // CSV escape function
        const escapeCSV = (value) => {
            if (value === null || value === undefined) {
                return '';
            }
            const str = String(value);
            // If contains comma, quote, or newline, wrap in quotes and escape quotes
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        };
        
        // Headers
        const headers = ['PartTypeTerminologyName', 'PositionName', 'PartNumber', 'ManufacturerName'];
        const csvRows = [headers.map(escapeCSV).join(',')];
        
        // Data rows
        parts.forEach(part => {
            const row = [
                part.partTypeTerminologyName,
                part.positionName,
                part.partNumber,
                part.manufacturerName
            ];
            csvRows.push(row.map(escapeCSV).join(','));
        });
        
        return csvRows.join('\n');
    };
    
    // Download CSV
    const downloadCSV = (csvString, filename) => {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    // Update progress modal
    const updateProgress = (current, total, groupName, partsCount) => {
        const currentGroupNumEl = document.getElementById('currentGroupNum');
        const totalGroupsEl = document.getElementById('totalGroups');
        const currentGroupNameEl = document.getElementById('currentGroupName');
        const totalPartsCollectedEl = document.getElementById('totalPartsCollected');
        const progressBarFillEl = document.getElementById('progressBarFill');
        
        if (currentGroupNumEl) currentGroupNumEl.textContent = current;
        if (totalGroupsEl) totalGroupsEl.textContent = total;
        if (currentGroupNameEl) {
            currentGroupNameEl.textContent = groupName || 'Initializing...';
        }
        if (totalPartsCollectedEl) totalPartsCollectedEl.textContent = partsCount;
        if (progressBarFillEl && total > 0) {
            const percentage = (current / total) * 100;
            progressBarFillEl.style.width = `${percentage}%`;
        }
    };
    
    // Add log message
    const addLogMessage = (message, type = 'info') => {
        const logEl = document.getElementById('progressLog');
        if (!logEl) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const color = type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#333';
        const logEntry = document.createElement('div');
        logEntry.style.color = color;
        logEntry.style.marginBottom = '5px';
        logEntry.innerHTML = `<span style="color: #666;">[${timestamp}]</span> ${Utils.escapeHtml(message)}`;
        
        logEl.appendChild(logEntry);
        // Auto-scroll to bottom
        logEl.scrollTop = logEl.scrollHeight;
        
        // Keep only last 50 log entries
        while (logEl.children.length > 50) {
            logEl.removeChild(logEl.firstChild);
        }
    };
    
    // Start automated export
    const startAutomatedExport = async () => {
        if (isRunning) {
            Utils.showStatus('⚠️ Export already in progress', 'warning');
            return;
        }
        
        // Validate prerequisites
        if (!AppState.getToken()) {
            Utils.showStatus('✗ Please login first', 'error');
            return;
        }
        
        if (!AppState.getVehicleConfig()) {
            Utils.showStatus('✗ Please decode VIN first', 'error');
            return;
        }
        
        const catalogData = AppState.getCatalogData();
        if (!catalogData) {
            Utils.showStatus('✗ Please load category tree first', 'error');
            return;
        }
        
        // Reset state
        isRunning = true;
        isStopped = false;
        collectedParts = [];
        currentGroupIndex = 0;
        allGroups = [];
        
        // Show progress modal
        UI.showProgressModal();
        
        // Clear log
        const logEl = document.getElementById('progressLog');
        if (logEl) logEl.innerHTML = '';
        
        // Disable close button, enable stop button
        const closeBtn = document.getElementById('closeProgressModalBtn');
        const stopBtn = document.getElementById('stopAutomationBtn');
        if (closeBtn) closeBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'block';
        
        addLogMessage('Starting automated export...', 'info');
        
        try {
            // Process all groups
            const parts = await processAllGroups();
            
            if (isStopped) {
                addLogMessage(`Export stopped. Collected ${parts.length} part(s) so far.`, 'warning');
                Utils.showStatus(`⚠️ Export stopped. Collected ${parts.length} part(s).`, 'warning');
            } else {
                addLogMessage(`Export complete! Collected ${parts.length} part(s) from ${allGroups.length} group(s).`, 'info');
                Utils.showStatus(`✓ Export complete! Collected ${parts.length} part(s).`, 'success');
            }
            
            // Generate and download CSV
            if (parts.length > 0) {
                addLogMessage('Generating CSV file...', 'info');
                const csvString = generateCSV(parts);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const filename = `parts-export-${timestamp}.csv`;
                downloadCSV(csvString, filename);
                addLogMessage(`CSV file downloaded: ${filename}`, 'info');
            } else {
                addLogMessage('No parts collected. CSV file not generated.', 'warning');
            }
            
        } catch (error) {
            console.error('Export error:', error);
            addLogMessage(`Export failed: ${error.message}`, 'error');
            Utils.showStatus(`✗ Export failed: ${error.message}`, 'error');
        } finally {
            // Re-enable close button, disable stop button
            if (closeBtn) closeBtn.style.display = 'block';
            if (stopBtn) stopBtn.style.display = 'none';
            isRunning = false;
        }
    };
    
    // Stop automation
    const stopAutomation = () => {
        if (!isRunning) {
            return;
        }
        
        isStopped = true;
        addLogMessage('Stop requested...', 'warning');
    };
    
    return {
        startAutomatedExport,
        stopAutomation
    };
})();
