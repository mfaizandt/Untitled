// tree.js - jsTree management and catalog tree building
const Tree = (() => {
    const buildTree = (data) => {
        const treeData = [];
        
        // Sort categories by ID
        const sortedCategories = data.data.sort((a, b) => a.categoryID - b.categoryID);
        
        // Convert catalog data to jsTree format
        sortedCategories.forEach((category) => {
            const categoryNode = {
                id: `cat_${category.categoryID}`,
                text: `<span class="tree-category">${category.categoryID}: ${Utils.escapeHtml(category.categoryName)} (${category.groups.length})</span>`,
                children: [],
                state: { opened: false }
            };
            
            // Sort groups by ID
            const sortedGroups = category.groups.sort((a, b) => a.groupID - b.groupID);
            
            sortedGroups.forEach((group) => {
                const groupNode = {
                    id: `grp_${group.groupID}`,
                    text: `<span class="tree-group">${group.groupID}: ${Utils.escapeHtml(group.groupName)} (${group.catalogObjects.length})</span>`,
                    children: [],
                    state: { opened: false }
                };
                
                // Sort catalog objects by ID
                const sortedObjects = group.catalogObjects.sort((a, b) => a.catalogObjectID - b.catalogObjectID);
                
                sortedObjects.forEach((item) => {
                    const itemNode = {
                        id: `item_${item.catalogObjectID}`,
                        text: `<span class="tree-item">${item.catalogObjectID}: ${Utils.escapeHtml(item.catalogObjectName)}</span>`,
                        icon: 'jstree-file',
                        state: { selected: false }
                    };
                    groupNode.children.push(itemNode);
                });
                
                categoryNode.children.push(groupNode);
            });
            
            treeData.push(categoryNode);
        });
        
        // Initialize jsTree with optimized settings
        const treeElement = $('#tree');
        
        if (treeElement.jstree) {
            treeElement.jstree('destroy');
        }
        
        treeElement.jstree({
            'core': {
                'data': treeData,
                'themes': {
                    'name': 'default',
                    'responsive': true,
                    'stripes': false,
                    'dots': true
                },
                'animation': 200,
                'multiple': true,
                'check_callback': true
            },
            'search': {
                'case_insensitive': true,
                'show_only_matches': true,
                'show_only_matches_children': true,
                'fuzzy': false
            },
            'plugins': ['search']
        });
        
        AppState.setTreeInstance(treeElement.jstree(true));
        
        // Add event handlers
        treeElement.on('before_open.jstree before_close.jstree', function(e, data) {
            if (AppState.searchActive) {
                data.skip_animation = true;
            }
        }).on('after_open.jstree after_close.jstree', function(e, data) {
            if (AppState.searchActive) {
                treeElement.jstree('set_animation', 0);
            } else {
                treeElement.jstree('set_animation', 250);
            }
        });
        
        // Handle node selection
        treeElement.on('select_node.jstree deselect_node.jstree', function(e, data) {
            updateSelectedCatalogObjects();
        });
        
        Utils.showStatus('✓ Catalog loaded successfully! (Total: ' + treeData.length + ' categories)', 'success');
    };
    
    const updateSelectedCatalogObjects = () => {
        const treeInstance = AppState.getTreeInstance();
        if (!treeInstance) return;
        
        const catalogData = AppState.getCatalogData();
        const selectedNodes = treeInstance.get_selected(true);
        const selectedCatalogObjects = [];
        const selectedGroups = [];
        
        selectedNodes.forEach((node) => {
            const nodeId = node.id;
            
            // Handle group nodes (grp_*)
            if (nodeId.startsWith('grp_')) {
                const groupID = parseInt(nodeId.replace('grp_', ''));
                
                // Extract group name from the node text
                const nodeText = $(node.text).text() || node.text;
                const match = nodeText.match(/:\s*(.+?)\s*\(/);
                const groupName = match ? match[1].trim() : `Group ${groupID}`;
                
                // Find category for this group
                let categoryInfo = null;
                if (catalogData && catalogData.data) {
                    catalogData.data.forEach((category) => {
                        category.groups.forEach((group) => {
                            if (group.groupID === groupID) {
                                categoryInfo = {
                                    categoryID: category.categoryID,
                                    categoryName: category.categoryName
                                };
                            }
                        });
                    });
                }
                
                selectedGroups.push({
                    groupID: groupID,
                    groupName: groupName,
                    categoryID: categoryInfo ? categoryInfo.categoryID : null,
                    categoryName: categoryInfo ? categoryInfo.categoryName : null
                });
            }
            // Handle catalog object nodes (item_*)
            else if (nodeId.startsWith('item_')) {
                const catalogObjectID = parseInt(nodeId.replace('item_', ''));
                
                // Extract catalog object name from the node text
                const nodeText = $(node.text).text() || node.text;
                const match = nodeText.match(/:\s*(.+)$/);
                const catalogObjectName = match ? match[1].trim() : `Catalog Object ${catalogObjectID}`;
                
                // Extract category and group information from tree structure
                let categoryInfo = null;
                let groupInfo = null;
                
                if (catalogData && catalogData.data) {
                    catalogData.data.forEach((category) => {
                        category.groups.forEach((group) => {
                            group.catalogObjects.forEach((item) => {
                                if (item.catalogObjectID === catalogObjectID) {
                                    categoryInfo = {
                                        categoryID: category.categoryID,
                                        categoryName: category.categoryName
                                    };
                                    groupInfo = {
                                        groupID: group.groupID,
                                        groupName: group.groupName
                                    };
                                }
                            });
                        });
                    });
                }
                
                selectedCatalogObjects.push({
                    catalogObjectID: catalogObjectID,
                    catalogObjectName: catalogObjectName,
                    category: categoryInfo,
                    group: groupInfo
                });
            }
        });
        
        AppState.setSelectedCatalogObjects(selectedCatalogObjects);
        AppState.setSelectedGroups(selectedGroups);
        
        // Update UI with combined counts
        const objectCount = selectedCatalogObjects.length;
        const groupCount = selectedGroups.length;
        const totalCount = objectCount + groupCount;
        
        let countText = '';
        if (totalCount > 0) {
            if (objectCount > 0 && groupCount > 0) {
                countText = `${objectCount} object${objectCount !== 1 ? 's' : ''} + ${groupCount} group${groupCount !== 1 ? 's' : ''} selected`;
            } else if (objectCount > 0) {
                countText = `${objectCount} catalog object${objectCount !== 1 ? 's' : ''} selected`;
            } else {
                countText = `${groupCount} group${groupCount !== 1 ? 's' : ''} selected`;
            }
        } else {
            countText = '0 items selected';
        }
        
        const countEl = document.getElementById('selectedCatalogCount');
        if (countEl) {
            countEl.textContent = countText;
        }
        
        const nextBtn = document.getElementById('nextToManufacturersBtn');
        const infoEl = document.getElementById('catalogSelectionInfo');
        
        if (totalCount > 0) {
            if (nextBtn) nextBtn.style.display = 'block';
            if (infoEl) {
                infoEl.style.display = 'block';
                infoEl.style.background = '#e8f5e9';
                infoEl.style.borderLeftColor = '#4CAF50';
            }
            if (countEl) countEl.style.color = '#2e7d32';
        } else {
            if (nextBtn) nextBtn.style.display = 'none';
            if (infoEl) {
                infoEl.style.display = 'block';
                infoEl.style.background = '#fff3cd';
                infoEl.style.borderLeftColor = '#ffc107';
            }
            if (countEl) countEl.style.color = '#856404';
        }
        
        // Update progress summary
        UI.updateProgressSummary();
        
        // For backward compatibility, set the first selected as primary
        if (selectedCatalogObjects.length > 0) {
            AppState.selectedCatalogObjectID = selectedCatalogObjects[0].catalogObjectID;
            AppState.setCatalogObjectName(selectedCatalogObjects[0].catalogObjectName);
            if (selectedCatalogObjects[0].category) {
                AppState.selectedCategory = selectedCatalogObjects[0].category;
            }
            if (selectedCatalogObjects[0].group) {
                AppState.selectedGroup = selectedCatalogObjects[0].group;
            }
        } else if (selectedGroups.length > 0) {
            // Use first group's category if no catalog objects selected
            if (selectedGroups[0].categoryID) {
                AppState.selectedCategory = {
                    categoryID: selectedGroups[0].categoryID,
                    categoryName: selectedGroups[0].categoryName
                };
            }
            AppState.selectedGroup = {
                groupID: selectedGroups[0].groupID,
                groupName: selectedGroups[0].groupName
            };
        } else {
            AppState.selectedCatalogObjectID = null;
            AppState.setCatalogObjectName(null);
            AppState.selectedCategory = null;
            AppState.selectedGroup = null;
        }
    };
    
    const expandAll = () => {
        const treeInstance = AppState.getTreeInstance();
        if (treeInstance) {
            treeInstance.open_all();
        }
    };
    
    const collapseAll = () => {
        const treeInstance = AppState.getTreeInstance();
        if (treeInstance) {
            treeInstance.close_all();
        }
    };
    
    const search = (searchTerm) => {
        const treeInstance = AppState.getTreeInstance();
        if (!treeInstance) return;
        
        try {
            const treeElement = $('#tree');
            const wasAnimated = treeElement.jstree().settings.core.animation;
            treeElement.jstree('set_animation', 0);
            
            treeInstance.search(searchTerm, false, false);
            
            treeElement.jstree('set_animation', wasAnimated);
        } catch (e) {
            console.error('Search error:', e);
        }
    };
    
    const clearSearch = () => {
        const treeInstance = AppState.getTreeInstance();
        if (!treeInstance) return;
        
        treeInstance.clear_search();
    };
    
    return {
        buildTree,
        updateSelectedCatalogObjects,
        expandAll,
        collapseAll,
        search,
        clearSearch
    };
})();
