// ui.js - UI rendering and view management
const UI = (() => {
    // View Management
    const showLoginForm = () => {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('vinForm').classList.add('hidden');
        document.getElementById('treeView').classList.add('hidden');
        document.getElementById('tree').style.display = 'none';
        document.querySelector('.controls').style.display = 'none';
    };
    
    const showVinForm = () => {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('vinForm').classList.remove('hidden');
        document.getElementById('treeView').classList.add('hidden');
        document.getElementById('tree').style.display = 'none';
        document.getElementById('manufacturerSelection').classList.add('hidden');
        document.getElementById('partsView').classList.add('hidden');
        document.querySelector('.controls').style.display = 'none';
    };
    
    const showTreeView = () => {
        console.log('showTreeView called');
        // Hide all other views
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('vinForm').classList.add('hidden');
        document.getElementById('manufacturerSelection').classList.add('hidden');
        document.getElementById('manufacturerSelection').style.display = 'none';
        document.getElementById('partsView').classList.add('hidden');
        
        // Show tree view wrapper and tree - remove hidden class and ensure display
        document.getElementById('treeView').classList.remove('hidden');
        document.getElementById('treeView').style.display = 'block';
        document.getElementById('tree').classList.remove('hidden');
        document.getElementById('tree').style.display = 'block';
        document.querySelector('.controls').style.display = 'flex';
        
        // Log for debugging
        const treeInstance = AppState.getTreeInstance();
        console.log('showTreeView - manufacturerSelection hidden:', document.getElementById('manufacturerSelection').classList.contains('hidden'));
        console.log('showTreeView - treeView visible:', document.getElementById('treeView').style.display !== 'none');
        console.log('showTreeView - tree visible:', document.getElementById('tree').style.display !== 'none');
        console.log('showTreeView - treeInstance exists:', !!treeInstance);
        
        // Restore selected catalog objects in the tree
        if (treeInstance) {
            try {
                // Deselect all first
                treeInstance.deselect_all();
                
                // Select all previously selected catalog objects
                const selectedCatalogObjects = AppState.getSelectedCatalogObjects();
                if (selectedCatalogObjects.length > 0) {
                    selectedCatalogObjects.forEach((obj) => {
                        const nodeId = 'item_' + obj.catalogObjectID;
                        try {
                            treeInstance.select_node(nodeId);
                        } catch (e) {
                            console.log('Could not select node:', nodeId, e);
                        }
                    });
                    
                    // Update UI
                    const countEl = document.getElementById('selectedCatalogCount');
                    if (countEl) {
                        countEl.textContent = `${selectedCatalogObjects.length} catalog object${selectedCatalogObjects.length !== 1 ? 's' : ''} selected`;
                    }
                    const nextBtn = document.getElementById('nextToManufacturersBtn');
                    if (nextBtn) nextBtn.style.display = 'block';
                    const infoEl = document.getElementById('catalogSelectionInfo');
                    if (infoEl) {
                        infoEl.style.display = 'block';
                        infoEl.style.background = '#e8f5e9';
                        infoEl.style.borderLeftColor = '#4CAF50';
                    }
                    if (countEl) countEl.style.color = '#2e7d32';
                } else if (AppState.selectedCatalogObjectID) {
                    // Fallback for backward compatibility
                    const nodeId = 'item_' + AppState.selectedCatalogObjectID;
                    try {
                        treeInstance.select_node(nodeId);
                    } catch (e) {
                        console.log('Could not select node:', e);
                    }
                }
            } catch (e) {
                console.log('Error restoring tree selection:', e);
            }
        }
    };
    
    const showManufacturerSelection = () => {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('vinForm').classList.add('hidden');
        document.getElementById('treeView').classList.add('hidden');
        document.getElementById('treeView').style.display = 'none';
        document.getElementById('tree').classList.add('hidden');
        document.getElementById('tree').style.display = 'none';
        document.querySelector('.controls').style.display = 'none';
        document.getElementById('manufacturerSelection').classList.remove('hidden');
        document.getElementById('manufacturerSelection').style.display = 'block';
        document.getElementById('partsView').classList.add('hidden');
        
        if (AppState.getManufacturers().length > 0) {
            Utils.setDisplay('manufacturerLoading', 'none');
            Utils.setDisplay('manufacturerContent', 'block');
            renderManufacturers();
            updateSelectedCount();
            if (AppState.selectedCatalogObjectName) {
                const breadcrumbEl = document.getElementById('manufacturerBreadcrumb');
                if (breadcrumbEl) {
                    breadcrumbEl.innerHTML = `<span class="breadcrumb-item">${Utils.escapeHtml(AppState.selectedCatalogObjectName)}</span>`;
                }
            }
        }
    };
    
    const showPartsView = () => {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('vinForm').classList.add('hidden');
        document.getElementById('treeView').classList.add('hidden');
        document.getElementById('tree').style.display = 'none';
        document.querySelector('.controls').style.display = 'none';
        document.getElementById('manufacturerSelection').classList.add('hidden');
        document.getElementById('partsView').classList.remove('hidden');
        document.getElementById('partsView').style.display = 'block';
        
        if (AppState.getParts().length > 0) {
            Utils.setDisplay('partsLoading', 'none');
            Utils.setDisplay('partsContent', 'block');
            renderParts();
            if (AppState.selectedCatalogObjectName) {
                const breadcrumbEl = document.getElementById('partsBreadcrumb');
                if (breadcrumbEl) {
                    breadcrumbEl.innerHTML = `<span class="breadcrumb-item">${Utils.escapeHtml(AppState.selectedCatalogObjectName)}</span>`;
                }
            }
        }
    };
    
    // Manufacturer Selection
    const renderManufacturers = (filteredBrands) => {
        const manufacturerList = document.getElementById('manufacturerList');
        if (!manufacturerList) {
            console.error('manufacturerList element not found');
            return;
        }
        
        const brandsToRender = filteredBrands || AppState.getAllBrands();
        const manufacturers = AppState.getManufacturers();
        
        console.log('Rendering manufacturers:', {
            brandsToRenderCount: brandsToRender.length,
            manufacturersCount: manufacturers.length,
            brandsToRender: brandsToRender.slice(0, 3),
            manufacturers: manufacturers.slice(0, 3)
        });
        
        if (!brandsToRender || brandsToRender.length === 0) {
            manufacturerList.innerHTML = '<p style="padding: 20px; text-align: center; color: #6c757d;">No brands available</p>';
            return;
        }
        
        // Group by manufacturer
        const manufacturerMap = new Map();
        
        brandsToRender.forEach((brand) => {
            const brandManufacturerID = parseInt(brand.manufacturerID, 10);
            
            if (!manufacturerMap.has(brandManufacturerID)) {
                // Properly lookup manufacturer from manufacturers array (handle type mismatch)
                const manufacturer = manufacturers.find((m) => {
                    const mfrID = parseInt(m.manufacturerID, 10);
                    return mfrID === brandManufacturerID;
                });
                
                // If manufacturer not found, create a fallback entry
                if (manufacturer) {
                    manufacturerMap.set(brandManufacturerID, {
                        manufacturer: manufacturer,
                        brands: []
                    });
                } else {
                    // Fallback: use manufacturer info from brand data
                    manufacturerMap.set(brandManufacturerID, {
                        manufacturer: {
                            manufacturerID: brandManufacturerID,
                            manufacturerName: brand.manufacturerName || `Manufacturer ${brandManufacturerID}`
                        },
                        brands: []
                    });
                }
            }
            const entry = manufacturerMap.get(brandManufacturerID);
            if (entry) {
                entry.brands.push(brand);
            }
        });
        
        if (manufacturerMap.size === 0) {
            manufacturerList.innerHTML = '<p style="padding: 20px; text-align: center; color: #6c757d;">No manufacturers found</p>';
            return;
        }
        
        let html = '';
        manufacturerMap.forEach(({ manufacturer, brands }) => {
            const manufacturerKey = `mfr-${manufacturer.manufacturerID}`;
            const selectedCount = brands.filter(b => {
                const brandID = parseInt(b.brandID, 10);
                return AppState.getSelectedBrands().has(brandID);
            }).length;
            const totalCount = brands.length;
            const isAllSelected = selectedCount === totalCount;
            const isExpanded = !filteredBrands; // Expanded by default when not filtering
            
            html += `
                <div class="manufacturer-tree-item">
                    <div class="manufacturer-header" data-manufacturer-id="${manufacturer.manufacturerID}">
                        <button class="tree-toggle" data-target="${manufacturerKey}" aria-expanded="${isExpanded}">
                            <span class="tree-icon">${isExpanded ? '▼' : '▶'}</span>
                        </button>
                        <label class="manufacturer-checkbox-label">
                            <input 
                                type="checkbox" 
                                class="manufacturer-checkbox"
                                data-manufacturer-id="${manufacturer.manufacturerID}"
                                ${isAllSelected ? 'checked' : ''}
                            />
                            <span class="manufacturer-name">${Utils.escapeHtml(manufacturer.manufacturerName)}</span>
                        </label>
                        <span class="brand-count">${selectedCount}/${totalCount} brands</span>
                    </div>
                    <div class="brands-container ${isExpanded ? 'expanded' : ''}" id="${manufacturerKey}">
                        <div class="brands-list">
                            ${brands.map((brand) => {
                                const brandID = parseInt(brand.brandID, 10);
                                return `
                                <div class="brand-item">
                                    <label>
                                        <input 
                                            type="checkbox" 
                                            class="brand-checkbox"
                                            data-brand-id="${brandID}"
                                            data-manufacturer-id="${brand.manufacturerID}"
                                            ${AppState.getSelectedBrands().has(brandID) ? 'checked' : ''}
                                        />
                                        <span class="brand-name">${Utils.escapeHtml(brand.brandName)}</span>
                                    </label>
                                </div>
                            `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        
        manufacturerList.innerHTML = html;
        attachManufacturerHandlers();
    };
    
    const attachManufacturerHandlers = () => {
        // Tree toggle handlers
        document.querySelectorAll('.tree-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const target = this.dataset.target;
                const container = document.getElementById(target);
                const isExpanded = container.classList.contains('expanded');
                
                container.classList.toggle('expanded');
                this.querySelector('.tree-icon').textContent = isExpanded ? '▶' : '▼';
                this.setAttribute('aria-expanded', !isExpanded);
            });
        });
        
        // Manufacturer checkbox handlers
        document.querySelectorAll('.manufacturer-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const manufacturerID = parseInt(this.dataset.manufacturerId);
                const isChecked = this.checked;
                const brandCheckboxes = document.querySelectorAll(`.brand-checkbox[data-manufacturer-id="${manufacturerID}"]`);
                
                brandCheckboxes.forEach(cb => {
                    const brandID = parseInt(cb.dataset.brandId);
                    cb.checked = isChecked;
                    if (isChecked) {
                        AppState.addSelectedBrand(brandID);
                    } else {
                        AppState.removeSelectedBrand(brandID);
                    }
                });
                
                updateManufacturerCheckbox(manufacturerID);
                updateSelectedCount();
            });
        });
        
        // Brand checkbox handlers
        document.querySelectorAll('.brand-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const brandID = parseInt(this.dataset.brandId);
                const manufacturerID = parseInt(this.dataset.manufacturerId);
                
                if (this.checked) {
                    AppState.addSelectedBrand(brandID);
                } else {
                    AppState.removeSelectedBrand(brandID);
                }
                
                updateManufacturerCheckbox(manufacturerID);
                updateSelectedCount();
            });
        });
    };
    
    const updateManufacturerCheckbox = (manufacturerID) => {
        const brandCheckboxes = document.querySelectorAll(`.brand-checkbox[data-manufacturer-id="${manufacturerID}"]`);
        const selectedCount = Array.from(brandCheckboxes).filter(cb => cb.checked).length;
        const totalCount = brandCheckboxes.length;
        const manufacturerCheckbox = document.querySelector(`.manufacturer-checkbox[data-manufacturer-id="${manufacturerID}"]`);
        
        if (manufacturerCheckbox) {
            manufacturerCheckbox.checked = selectedCount === totalCount;
            const header = manufacturerCheckbox.closest('.manufacturer-header');
            if (header) {
                const countEl = header.querySelector('.brand-count');
                if (countEl) {
                    countEl.textContent = `${selectedCount}/${totalCount} brands`;
                }
            }
        }
    };
    
    const updateSelectedCount = () => {
        const countEl = document.getElementById('selectedCount');
        if (countEl) {
            const count = AppState.getSelectedBrands().size;
            countEl.textContent = `${count} brand${count !== 1 ? 's' : ''} selected`;
        }
        updateProgressSummary();
    };
    
    const selectAllBrands = () => {
        AppState.getAllBrands().forEach((brand) => {
            AppState.addSelectedBrand(brand.brandID);
        });
        document.querySelectorAll('.brand-checkbox').forEach(cb => cb.checked = true);
        document.querySelectorAll('.manufacturer-checkbox').forEach(cb => cb.checked = true);
        updateSelectedCount();
        // Update all manufacturer checkboxes
        AppState.getAllBrands().forEach((brand) => {
            updateManufacturerCheckbox(brand.manufacturerID);
        });
    };
    
    const deselectAllBrands = () => {
        AppState.clearSelectedBrands();
        document.querySelectorAll('.brand-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.manufacturer-checkbox').forEach(cb => cb.checked = false);
        updateSelectedCount();
        // Update all manufacturer checkboxes
        AppState.getAllBrands().forEach((brand) => {
            updateManufacturerCheckbox(brand.manufacturerID);
        });
    };
    
    // Parts Display
    const renderParts = () => {
        const partsList = document.getElementById('partsList');
        const parts = AppState.getParts();
        
        console.log('=== RENDERING PARTS ===');
        console.log('Parts variable:', parts);
        console.log('Parts type:', typeof parts);
        console.log('Is array:', Array.isArray(parts));
        console.log('Parts length:', parts ? parts.length : 'null/undefined');
        
        if (!parts) {
            console.error('Parts is null or undefined!');
            partsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #dc3545;">Error: Parts data is not available. Check console for details.</p>';
            return;
        }
        
        if (!Array.isArray(parts)) {
            console.error('Parts is not an array! Type:', typeof parts, 'Value:', parts);
            partsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #dc3545;">Error: Parts data is not in the expected format. Check console for details.</p>';
            return;
        }
        
        if (parts.length === 0) {
            console.log('Parts array is empty');
            partsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #6c757d;">No parts found for the selected manufacturers.</p>';
            return;
        }
        
        console.log('Rendering', parts.length, 'parts');
        
        let html = `
            <table class="parts-table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Part Number</th>
                        <th>Part Name</th>
                        <th>Manufacturer</th>
                        <th>Brand</th>
                        <th>Year Range</th>
                        <th>Qty</th>
                        <th>Condition</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        parts.forEach((part, index) => {
            try {
                const imageUrl = part.partContents && Array.isArray(part.partContents) && part.partContents.length > 0 ? part.partContents[0].url : '';
                const imageHtml = imageUrl ? `<img src="${Utils.escapeHtml(imageUrl)}" alt="Part image" class="part-image" onerror="this.style.display='none'" />` : '-';
                
                // Safely access nested properties with fallbacks
                const partNumber = part.partNumber || part.partnumber || '-';
                const partName = part.catalogObject?.catalogObjectName || part.catalogObjectName || part.name || '-';
                const manufacturerName = part.manufacturer?.name || part.manufacturerName || '-';
                const brandName = part.manufacturer?.brand?.name || part.brandName || part.brand?.name || '-';
                const fromYear = part.fromYear || part.fromyear || '';
                const toYear = part.toYear || part.toyear || '';
                const yearRange = fromYear ? `${fromYear} - ${toYear}` : '-';
                const qty = part.qty || part.quantity || part.qtyRequired || '-';
                const condition = part.condition || part.partCondition || '-';
                
                html += `
                    <tr>
                        <td>${imageHtml}</td>
                        <td><span class="part-number">${Utils.escapeHtml(String(partNumber))}</span></td>
                        <td>${Utils.escapeHtml(String(partName))}</td>
                        <td><span class="part-manufacturer">${Utils.escapeHtml(String(manufacturerName))}</span></td>
                        <td>${Utils.escapeHtml(String(brandName))}</td>
                        <td>${Utils.escapeHtml(yearRange)}</td>
                        <td>${Utils.escapeHtml(String(qty))}</td>
                        <td>${Utils.escapeHtml(String(condition))}</td>
                    </tr>
                `;
            } catch (error) {
                console.error('Error rendering part at index', index, ':', error, part);
                // Render a row with error info for debugging
                html += `
                    <tr style="background: #fff3cd;">
                        <td colspan="8" style="color: #856404; padding: 10px;">
                            Error rendering part (check console for details). Part keys: ${Object.keys(part || {}).join(', ')}
                        </td>
                    </tr>
                `;
            }
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        partsList.innerHTML = html;
    };
    
    // Progress Summary
    const updateProgressSummary = () => {
        // Show progress summary if any data is available
        const progressSummary = document.getElementById('progressSummary');
        if (!progressSummary) {
            console.warn('progressSummary element not found');
            return;
        }
        
        const vinDecodeResponse = AppState.getVINDecodeResponse();
        const selectedCatalogObjects = AppState.getSelectedCatalogObjects();
        const selectedCategory = AppState.selectedCategory;
        const apiResponses = AppState.getAPIResponses();
        const hasAnyData = vinDecodeResponse || selectedCatalogObjects.length > 0 || selectedCategory || apiResponses.manufacturers || apiResponses.parts;
        
        console.log('updateProgressSummary called:', {
            hasAnyData,
            hasVINResponse: !!vinDecodeResponse,
            selectedCatalogObjectsCount: selectedCatalogObjects.length,
            hasManufacturers: !!apiResponses.manufacturers,
            hasParts: !!apiResponses.parts
        });
        
        if (hasAnyData) {
            progressSummary.classList.remove('hidden');
            console.log('Progress summary shown');
        } else {
            progressSummary.classList.add('hidden');
            console.log('No data, hiding progress summary');
            return;
        }
        
        // Update Vehicle Information Section
        updateVehicleInfoSection();
        
        // Update Catalog Selection Section
        updateCatalogSelectionSection();
        
        // Update Manufacturer Selection Section
        updateManufacturerSelectionSection();
        
        // Update Parts Section
        updatePartsSection();
    };
    
    const updateVehicleInfoSection = () => {
        const section = document.getElementById('vehicleInfoSection');
        const contentEl = document.getElementById('vehicleInfoContent');
        const vinDecodeResponse = AppState.getVINDecodeResponse();
        
        if (!section) {
            console.warn('vehicleInfoSection element not found');
            return;
        }
        
        if (vinDecodeResponse && vinDecodeResponse.data && vinDecodeResponse.data.length > 0) {
            const vehicleData = vinDecodeResponse.data[0];
            let vehicleHtml = '';
            
            console.log('Updating vehicle info section with data:', vehicleData);
            console.log('Available vehicle data keys:', Object.keys(vehicleData));
            
            // Display only meaningful vehicle fields in a clean format
            const vehicleFields = [
                { key: 'year', label: 'Year' },
                { key: 'make', label: 'Make' },
                { key: 'model', label: 'Model' },
                { key: 'trim', label: 'Trim' },
                { key: 'bodyType', label: 'Body Type' },
                { key: 'bodyStyle', label: 'Body Style' },
                { key: 'engine', label: 'Engine' },
                { key: 'engineSize', label: 'Engine Size' },
                { key: 'engineType', label: 'Engine Type' },
                { key: 'transmission', label: 'Transmission' },
                { key: 'driveType', label: 'Drive Type' },
                { key: 'fuelType', label: 'Fuel Type' }
            ];
            
            let fieldsFound = 0;
            vehicleFields.forEach((field) => {
                const value = vehicleData[field.key];
                if (value !== null && value !== undefined && value !== '') {
                    fieldsFound++;
                    // Handle nested objects (like engine)
                    let displayValue = value;
                    if (typeof value === 'object' && !Array.isArray(value)) {
                        if (value.name) {
                            displayValue = value.name;
                        } else if (value.description) {
                            displayValue = value.description;
                        } else if (value.value) {
                            displayValue = value.value;
                        } else {
                            const nonEmptyValues = Object.values(value).filter(v => v !== null && v !== undefined && v !== '');
                            if (nonEmptyValues.length > 0) {
                                displayValue = nonEmptyValues.join(', ');
                            } else {
                                return; // Skip empty objects
                            }
                        }
                    }
                    vehicleHtml += `
                        <div class="progress-item">
                            <span class="progress-label">${Utils.escapeHtml(field.label)}:</span>
                            <span class="progress-value">${Utils.escapeHtml(String(displayValue))}</span>
                        </div>
                    `;
                }
            });
            
            // Also show VIN if available (always show VIN first)
            if (vehicleData.vin) {
                vehicleHtml = `
                    <div class="progress-item">
                        <span class="progress-label">VIN:</span>
                        <span class="progress-value">${Utils.escapeHtml(vehicleData.vin)}</span>
                    </div>
                ` + vehicleHtml;
            }
            
            // If no standard fields were found, try to show any available data
            if (fieldsFound === 0 && vehicleHtml === '') {
                console.log('No standard fields found, showing all available data');
                // Show vehicleConfiguration as a fallback
                if (vehicleData.vehicleConfiguration) {
                    vehicleHtml = `
                        <div class="progress-item">
                            <span class="progress-label">Vehicle Configuration:</span>
                            <span class="progress-value" style="font-size: 11px; word-break: break-all;">${Utils.escapeHtml(String(vehicleData.vehicleConfiguration).substring(0, 100))}${vehicleData.vehicleConfiguration.length > 100 ? '...' : ''}</span>
                        </div>
                    `;
                }
                
                // Show VIN if available
                if (vehicleData.vin) {
                    vehicleHtml += `
                        <div class="progress-item">
                            <span class="progress-label">VIN:</span>
                            <span class="progress-value">${Utils.escapeHtml(vehicleData.vin)}</span>
                        </div>
                    `;
                }
                
                // If still no HTML, show all top-level non-object fields
                if (vehicleHtml === '') {
                    Object.keys(vehicleData).forEach((key) => {
                        const value = vehicleData[key];
                        // Skip objects, arrays, and vehicleConfiguration (too long)
                        if (key !== 'vehicleConfiguration' && typeof value !== 'object' && !Array.isArray(value) && value !== null && value !== undefined && value !== '') {
                            vehicleHtml += `
                                <div class="progress-item">
                                    <span class="progress-label">${Utils.escapeHtml(key)}:</span>
                                    <span class="progress-value">${Utils.escapeHtml(String(value))}</span>
                                </div>
                            `;
                        }
                    });
                }
            }
            
            if (contentEl) {
                if (vehicleHtml) {
                    contentEl.innerHTML = vehicleHtml;
                    console.log('Vehicle info HTML set, length:', vehicleHtml.length);
                } else {
                    // Show a message if no data available
                    contentEl.innerHTML = '<div class="progress-item"><span class="progress-value">No vehicle information available</span></div>';
                    console.warn('No vehicle HTML generated, vehicleData:', vehicleData);
                }
            } else {
                console.warn('vehicleInfoContent element not found');
            }
            
            // Always show section if we have VIN response, even if no fields
            section.classList.remove('hidden');
            console.log('Vehicle info section shown, fieldsFound:', fieldsFound, 'hasContent:', vehicleHtml !== '');
        } else {
            section.classList.add('hidden');
            console.log('No vehicle data, hiding vehicle info section');
        }
    };
    
    const updateCatalogSelectionSection = () => {
        const section = document.getElementById('catalogSelectionSection');
        const contentEl = document.getElementById('catalogSelectionContent');
        const selectedCatalogObjects = AppState.getSelectedCatalogObjects();
        const selectedCategory = AppState.selectedCategory;
        const selectedGroup = AppState.selectedGroup;
        const selectedCatalogObjectID = AppState.selectedCatalogObjectID;
        const selectedCatalogObjectName = AppState.selectedCatalogObjectName;
        
        if (selectedCatalogObjects.length > 0) {
            let catalogHtml = '';
            
            catalogHtml += `
                <div class="progress-item">
                    <span class="progress-label">Selected:</span>
                    <span class="progress-value">${selectedCatalogObjects.length} catalog object${selectedCatalogObjects.length !== 1 ? 's' : ''}</span>
                </div>
            `;
            
            // Show catalog objects grouped by category/group
            const groupedByCategory = new Map();
            selectedCatalogObjects.forEach((obj) => {
                if (obj.category && obj.group) {
                    const key = `${obj.category.categoryID}-${obj.group.groupID}`;
                    if (!groupedByCategory.has(key)) {
                        groupedByCategory.set(key, {
                            category: obj.category,
                            group: obj.group,
                            catalogObjects: []
                        });
                    }
                    groupedByCategory.get(key).catalogObjects.push(obj);
                }
            });
            
            // Display grouped catalog objects
            groupedByCategory.forEach((groupData) => {
                catalogHtml += `
                    <div class="progress-item" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e9ecef;">
                        <span class="progress-label" style="font-weight: 600; color: #667eea;">${Utils.escapeHtml(groupData.category.categoryName)} / ${Utils.escapeHtml(groupData.group.groupName)}:</span>
                        <span class="progress-value">${groupData.catalogObjects.length} object${groupData.catalogObjects.length !== 1 ? 's' : ''}</span>
                    </div>
                `;
                
                // Show catalog object names (limit to first 3 per group)
                const objectNames = groupData.catalogObjects
                    .slice(0, 3)
                    .map(obj => obj.catalogObjectName)
                    .join(', ');
                const moreText = groupData.catalogObjects.length > 3 
                    ? ` +${groupData.catalogObjects.length - 3} more` 
                    : '';
                
                if (objectNames) {
                    catalogHtml += `
                        <div class="progress-item" style="padding-left: 15px; font-size: 12px;">
                            <span class="progress-value">${Utils.escapeHtml(objectNames)}${moreText}</span>
                        </div>
                    `;
                }
            });
            
            if (contentEl) {
                contentEl.innerHTML = catalogHtml;
            }
            section.classList.remove('hidden');
        } else if (selectedCategory && selectedGroup && selectedCatalogObjectID) {
            // Fallback for backward compatibility
            let catalogHtml = '';
            
            catalogHtml += `
                <div class="progress-item">
                    <span class="progress-label">Category:</span>
                    <span class="progress-value">${selectedCategory.categoryID} - ${Utils.escapeHtml(selectedCategory.categoryName)}</span>
                </div>
                <div class="progress-item">
                    <span class="progress-label">Group:</span>
                    <span class="progress-value">${selectedGroup.groupID} - ${Utils.escapeHtml(selectedGroup.groupName)}</span>
                </div>
                <div class="progress-item">
                    <span class="progress-label">Catalog Object:</span>
                    <span class="progress-value">${selectedCatalogObjectID} - ${Utils.escapeHtml(selectedCatalogObjectName || 'N/A')}</span>
                </div>
            `;
            
            if (contentEl) {
                contentEl.innerHTML = catalogHtml;
            }
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    };
    
    const updateManufacturerSelectionSection = () => {
        const section = document.getElementById('manufacturerSelectionSection');
        const contentEl = document.getElementById('manufacturerSelectionContent');
        const apiResponses = AppState.getAPIResponses();
        const manufacturers = AppState.getManufacturers();
        const allBrands = AppState.getAllBrands();
        const selectedBrands = AppState.getSelectedBrands();
        
        if (apiResponses.manufacturers && manufacturers.length > 0) {
            const selectedBrandsCount = selectedBrands.size;
            const selectedManufacturers = new Map(); // Map of manufacturerID -> {name, brands: []}
            
            // Group selected brands by manufacturer
            allBrands.forEach((brand) => {
                const brandID = parseInt(brand.brandID, 10);
                if (selectedBrands.has(brandID)) {
                    const brandManufacturerID = parseInt(brand.manufacturerID, 10);
                    
                    if (!selectedManufacturers.has(brandManufacturerID)) {
                        // Handle type mismatch in manufacturer lookup
                        const mfr = manufacturers.find(m => {
                            const mfrID = parseInt(m.manufacturerID, 10);
                            return mfrID === brandManufacturerID;
                        });
                        
                        selectedManufacturers.set(brandManufacturerID, {
                            name: mfr ? mfr.manufacturerName : (brand.manufacturerName || `Manufacturer ${brandManufacturerID}`),
                            brands: []
                        });
                    }
                    selectedManufacturers.get(brandManufacturerID).brands.push(brand.brandName);
                }
            });
            
            let manufacturerHtml = `
                <div class="progress-item">
                    <span class="progress-label">Selected:</span>
                    <span class="progress-value">${selectedBrandsCount} brand${selectedBrandsCount !== 1 ? 's' : ''} from ${selectedManufacturers.size} manufacturer${selectedManufacturers.size !== 1 ? 's' : ''}</span>
                </div>
            `;
            
            // Show selected manufacturers with their brands
            selectedManufacturers.forEach((mfrData, mfrID) => {
                const brandsList = mfrData.brands.length <= 3 
                    ? mfrData.brands.join(', ')
                    : mfrData.brands.slice(0, 3).join(', ') + ` +${mfrData.brands.length - 3} more`;
                
                manufacturerHtml += `
                    <div class="progress-item" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e9ecef;">
                        <span class="progress-label" style="font-weight: 600; color: #667eea;">${Utils.escapeHtml(mfrData.name)}:</span>
                        <span class="progress-value">${Utils.escapeHtml(brandsList)}</span>
                    </div>
                `;
            });
            
            if (contentEl) {
                contentEl.innerHTML = manufacturerHtml;
            }
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    };
    
    const updatePartsSection = () => {
        const section = document.getElementById('partsSection');
        // Note: Both progress summary and parts view have #partsContent
        // getElementById returns first match (progress summary one, since it's rendered first)
        // This matches original jQuery behavior
        const contentEl = document.getElementById('partsContent');
        const apiResponses = AppState.getAPIResponses();
        const parts = AppState.getParts();
        
        if (apiResponses.parts && parts.length > 0) {
            let partsHtml = `
                <div class="progress-item">
                    <span class="progress-label">Total Parts:</span>
                    <span class="progress-value">${parts.length}</span>
                </div>
            `;
            
            // Only update if contentEl exists and is within the progress summary section
            if (contentEl && section && section.contains(contentEl)) {
                contentEl.innerHTML = partsHtml;
            } else if (section) {
                // Fallback: find or create content div within section
                let sectionContent = section.querySelector('div:not(.progress-section-title):not(.download-btn)');
                if (!sectionContent) {
                    sectionContent = document.createElement('div');
                    const title = section.querySelector('.progress-section-title');
                    if (title) {
                        title.insertAdjacentElement('afterend', sectionContent);
                    } else {
                        section.appendChild(sectionContent);
                    }
                }
                sectionContent.innerHTML = partsHtml;
            }
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    };
    
    return {
        showLoginForm,
        showVinForm,
        showTreeView,
        showManufacturerSelection,
        showPartsView,
        renderManufacturers,
        updateSelectedCount,
        selectAllBrands,
        deselectAllBrands,
        renderParts,
        updateProgressSummary
    };
})();
