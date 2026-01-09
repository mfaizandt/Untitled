// utils.js - Utility functions
const Utils = (() => {
    const escapeHtml = (text) => {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    };
    
    const showStatus = (message, type) => {
        const statusEl = document.getElementById('statusMessage');
        statusEl.textContent = message;
        statusEl.classList.add('show');
        
        if (type === 'success') {
            statusEl.style.background = '#d4edda';
            statusEl.style.borderColor = '#28a745';
            statusEl.style.color = '#155724';
        } else if (type === 'warning') {
            statusEl.style.background = '#fff3cd';
            statusEl.style.borderColor = '#ffc107';
            statusEl.style.color = '#856404';
        } else if (type === 'error') {
            statusEl.style.background = '#f8d7da';
            statusEl.style.borderColor = '#f5c6cb';
            statusEl.style.color = '#721c24';
        }
        
        if (type === 'success') {
            setTimeout(() => statusEl.classList.remove('show'), 3000);
        }
    };
    
    const downloadJSON = (data, filename) => {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            showStatus('Failed to download file', 'error');
        }
    };
    
    const formatTimestamp = () => {
        return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    };
    
    const hideElement = (id) => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    };
    
    const showElement = (id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    };
    
    const setDisplay = (id, display) => {
        const el = document.getElementById(id);
        if (el) el.style.display = display;
    };
    
    // Download Functions for each response type
    const downloadVinResponse = () => {
        const apiResponses = AppState.getAPIResponses();
        if (apiResponses.vinDecode) {
            const timestamp = formatTimestamp();
            downloadJSON(apiResponses.vinDecode, `vin-decode-${timestamp}.json`);
        } else {
            showStatus('⚠️ No VIN decode response available to download', 'warning');
        }
    };
    
    const downloadCategoryTree = () => {
        const apiResponses = AppState.getAPIResponses();
        if (apiResponses.categoryTree) {
            const timestamp = formatTimestamp();
            downloadJSON(apiResponses.categoryTree, `category-tree-${timestamp}.json`);
        } else {
            showStatus('⚠️ No category tree available to download', 'warning');
        }
    };
    
    const downloadManufacturers = () => {
        const apiResponses = AppState.getAPIResponses();
        if (apiResponses.manufacturers) {
            const timestamp = formatTimestamp();
            downloadJSON(apiResponses.manufacturers, `manufacturers-${timestamp}.json`);
        } else {
            showStatus('⚠️ No manufacturers data available to download', 'warning');
        }
    };
    
    const downloadParts = () => {
        const apiResponses = AppState.getAPIResponses();
        if (apiResponses.parts) {
            const timestamp = formatTimestamp();
            downloadJSON(apiResponses.parts, `parts-${timestamp}.json`);
        } else {
            showStatus('⚠️ No parts data available to download', 'warning');
        }
    };
    
    const downloadPartDetails = () => {
        const apiResponses = AppState.getAPIResponses();
        if (apiResponses.partDetails) {
            const timestamp = formatTimestamp();
            downloadJSON(apiResponses.partDetails, `part-details-${timestamp}.json`);
        } else {
            showStatus('⚠️ No part details available to download', 'warning');
        }
    };
    
    return {
        escapeHtml,
        showStatus,
        downloadJSON,
        formatTimestamp,
        hideElement,
        showElement,
        setDisplay,
        downloadVinResponse,
        downloadCategoryTree,
        downloadManufacturers,
        downloadParts,
        downloadPartDetails
    };
})();

// Make download functions globally accessible for onclick handlers
window.downloadVinResponse = () => Utils.downloadVinResponse();
window.downloadCategoryTree = () => Utils.downloadCategoryTree();
window.downloadManufacturers = () => Utils.downloadManufacturers();
window.downloadParts = () => Utils.downloadParts();
