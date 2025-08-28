/**
 * This script fixes the delivery form dropdowns and staff member selection
 */

// Configuration
const POLL_INTERVAL = 1000; // How often to check for form elements (ms)
const DATA_REFRESH_INTERVAL = 60000; // How often to refresh data from APIs (ms)
const DEBUG = true; // Enable/disable debug logging

// Data caches
const buildingsCache = [];
const costCentersCache = [];
const staffMembersCache = [];

// State tracking
let lastUpdateTime = 0;
let isInitialized = false;
let hasPendingFetch = false;

// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
  log('Page loaded, initializing dropdown fixes');
  
  // Initial data load
  refreshAllData();
  
  // Set up polling for forms that need fixing
  setInterval(checkAndFixDropdowns, POLL_INTERVAL);
  
  // Set up periodic data refresh
  setInterval(refreshAllData, DATA_REFRESH_INTERVAL);
});

// Refresh all data from APIs
async function refreshAllData() {
  if (hasPendingFetch) {
    log('Data refresh already in progress, skipping');
    return;
  }
  
  hasPendingFetch = true;
  log('Refreshing data from APIs...');
  
  try {
    // Load buildings
    await fetchBuildings();
    
    // Load cost centers
    await fetchCostCenters();
    
    // Load staff members
    await fetchStaffMembers();
    
    lastUpdateTime = Date.now();
    isInitialized = true;
    log('Data refresh complete');
  } catch (error) {
    logError('Error refreshing data:', error);
  } finally {
    hasPendingFetch = false;
  }
}

// Fetch functions for each data type
async function fetchBuildings() {
  try {
    const response = await fetch('/api/buildings');
    if (!response.ok) {
      throw new Error(`Failed to fetch buildings: ${response.status}`);
    }
    
    const buildings = await response.json();
    buildingsCache.length = 0;
    buildingsCache.push(...buildings);
    log(`Loaded ${buildings.length} buildings`);
    return buildings;
  } catch (error) {
    logError('Error fetching buildings:', error);
    return [];
  }
}

async function fetchCostCenters() {
  try {
    const response = await fetch('/api/cost-centers');
    if (!response.ok) {
      throw new Error(`Failed to fetch cost centers: ${response.status}`);
    }
    
    const costCenters = await response.json();
    costCentersCache.length = 0;
    costCentersCache.push(...costCenters);
    log(`Loaded ${costCenters.length} cost centers`);
    return costCenters;
  } catch (error) {
    logError('Error fetching cost centers:', error);
    return [];
  }
}

async function fetchStaffMembers() {
  try {
    const response = await fetch('/api/staff');
    if (!response.ok) {
      throw new Error(`Failed to fetch staff members: ${response.status}`);
    }
    
    const staffMembers = await response.json();
    staffMembersCache.length = 0;
    staffMembersCache.push(...staffMembers);
    log(`Loaded ${staffMembers.length} staff members`);
    return staffMembers;
  } catch (error) {
    logError('Error fetching staff members:', error);
    return [];
  }
}

// Main function to check and fix dropdowns
function checkAndFixDropdowns() {
  if (!isInitialized || !window.location.pathname.includes('/deliveries')) {
    return;
  }
  
  // Fix React-based dropdowns in the delivery form
  fixBuildingDropdowns();
  fixCostCenterDropdowns();
  fixStaffMemberSelection();
  
  // Fix display of values in the table
  fixTableDisplay();
}

// Fix building dropdowns
function fixBuildingDropdowns() {
  if (buildingsCache.length === 0) return;
  
  // Try two approaches:
  // 1. Standard select element
  // 2. React-Radix UI Select component
  
  // Approach 1: Standard select element
  const buildingSelects = document.querySelectorAll('select[name="buildingId"]');
  buildingSelects.forEach(select => {
    if (select.getAttribute('data-fixed') !== 'true') {
      log('Fixing standard building dropdown');
      
      // Clear existing options except the first one (None)
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add building options
      buildingsCache
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(building => {
          const option = document.createElement('option');
          option.value = building.id;
          option.textContent = building.name;
          select.appendChild(option);
        });
      
      // Mark as fixed
      select.setAttribute('data-fixed', 'true');
      
      // Trigger change event to notify React
      const event = new Event('change', { bubbles: true });
      select.dispatchEvent(event);
    }
  });
  
  // Approach 2: React-Radix UI Select component
  const buildingTriggers = document.querySelectorAll('[data-state="closed"][aria-controls][aria-expanded="false"]');
  buildingTriggers.forEach(trigger => {
    // Only process building triggers
    if (trigger.textContent.includes('building') && !trigger.getAttribute('data-fixed')) {
      log('Found Radix UI building trigger, adding click handler');
      
      trigger.addEventListener('click', function() {
        // Wait for content to appear
        setTimeout(() => {
          const content = document.querySelector('[role="listbox"]');
          if (!content) return;
          
          // Check if we need to populate
          if (content.children.length <= 1) {
            log('Populating building dropdown content');
            
            // Add building options
            buildingsCache
              .sort((a, b) => a.name.localeCompare(b.name))
              .forEach(building => {
                const item = document.createElement('div');
                item.setAttribute('role', 'option');
                item.setAttribute('data-radix-collection-item', '');
                item.setAttribute('data-value', building.id);
                item.className = 'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';
                
                // Create text content
                const textSpan = document.createElement('span');
                textSpan.className = 'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';
                textSpan.textContent = building.name;
                
                item.appendChild(textSpan);
                
                // Add click handler
                item.addEventListener('click', function() {
                  log(`Selected building: ${building.name}`);
                  // Update trigger text
                  trigger.textContent = building.name;
                  
                  // Create or update hidden input to update React state
                  let input = document.querySelector('input[name="buildingId"]');
                  if (!input) {
                    input = document.createElement('input');
                    input.setAttribute('type', 'hidden');
                    input.setAttribute('name', 'buildingId');
                    document.querySelector('form').appendChild(input);
                  }
                  
                  input.value = building.id;
                  const event = new Event('change', { bubbles: true });
                  input.dispatchEvent(event);
                });
                
                content.appendChild(item);
              });
          }
        }, 100);
      });
      
      trigger.setAttribute('data-fixed', 'true');
    }
  });
}

// Fix cost center dropdowns
function fixCostCenterDropdowns() {
  if (costCentersCache.length === 0) return;
  
  // Try two approaches:
  // 1. Standard select element
  // 2. React-Radix UI Select component
  
  // Approach 1: Standard select element
  const costCenterSelects = document.querySelectorAll('select[name="costCenterId"]');
  costCenterSelects.forEach(select => {
    if (select.getAttribute('data-fixed') !== 'true') {
      log('Fixing standard cost center dropdown');
      
      // Clear existing options except the first one (None)
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add cost center options
      costCentersCache
        .sort((a, b) => a.code.localeCompare(b.code))
        .forEach(center => {
          const option = document.createElement('option');
          option.value = center.id;
          option.textContent = `${center.code} - ${center.name}`;
          select.appendChild(option);
        });
      
      // Mark as fixed
      select.setAttribute('data-fixed', 'true');
      
      // Trigger change event to notify React
      const event = new Event('change', { bubbles: true });
      select.dispatchEvent(event);
    }
  });
  
  // Approach 2: React-Radix UI Select component
  const costCenterTriggers = document.querySelectorAll('[data-state="closed"][aria-controls][aria-expanded="false"]');
  costCenterTriggers.forEach(trigger => {
    // Only process cost center triggers
    if (trigger.textContent.includes('cost center') && !trigger.getAttribute('data-fixed')) {
      log('Found Radix UI cost center trigger, adding click handler');
      
      trigger.addEventListener('click', function() {
        // Wait for content to appear
        setTimeout(() => {
          const content = document.querySelector('[role="listbox"]');
          if (!content) return;
          
          // Check if we need to populate
          if (content.children.length <= 1) {
            log('Populating cost center dropdown content');
            
            // Add cost center options
            costCentersCache
              .sort((a, b) => a.code.localeCompare(b.code))
              .forEach(center => {
                const item = document.createElement('div');
                item.setAttribute('role', 'option');
                item.setAttribute('data-radix-collection-item', '');
                item.setAttribute('data-value', center.id);
                item.className = 'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';
                
                // Create text content
                const textSpan = document.createElement('span');
                textSpan.className = 'absolute left-2 flex h-3.5 w-3.5 items-center justify-center';
                textSpan.textContent = `${center.code} - ${center.name}`;
                
                item.appendChild(textSpan);
                
                // Add click handler
                item.addEventListener('click', function() {
                  log(`Selected cost center: ${center.code} - ${center.name}`);
                  // Update trigger text
                  trigger.textContent = `${center.code} - ${center.name}`;
                  
                  // Create or update hidden input to update React state
                  let input = document.querySelector('input[name="costCenterId"]');
                  if (!input) {
                    input = document.createElement('input');
                    input.setAttribute('type', 'hidden');
                    input.setAttribute('name', 'costCenterId');
                    document.querySelector('form').appendChild(input);
                  }
                  
                  input.value = center.id;
                  const event = new Event('change', { bubbles: true });
                  input.dispatchEvent(event);
                });
                
                content.appendChild(item);
              });
          }
        }, 100);
      });
      
      trigger.setAttribute('data-fixed', 'true');
    }
  });
}

// Fix staff member selection
function fixStaffMemberSelection() {
  if (staffMembersCache.length === 0) return;
  
  // Find the staff search input
  const staffSearchInput = document.querySelector('input[placeholder="Search staff members..."]');
  if (!staffSearchInput) return;
  
  // Add event listener if not already added
  if (!staffSearchInput.hasAttribute('data-fixed')) {
    log('Setting up staff member selection');
    
    // Add event listener for input changes
    staffSearchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase();
      log(`Staff search term: ${searchTerm}`);
      
      // Delay execution slightly to allow React to update
      setTimeout(() => updateStaffMemberDropdown(searchTerm), 50);
    });
    
    // Add click handlers to existing staff member items
    addClickHandlersToStaffItems();
    
    // Mark as fixed
    staffSearchInput.setAttribute('data-fixed', 'true');
  }
}

// Update staff member dropdown based on search term
function updateStaffMemberDropdown(searchTerm) {
  // Get all matching staff members
  const filteredStaff = staffMembersCache.filter(staff => 
    staff.name.toLowerCase().includes(searchTerm)
  );
  
  // Find the dropdown container
  const selectTrigger = document.querySelector('[data-radix-select-trigger]');
  if (!selectTrigger) return;
  
  // Force the dropdown to be open
  if (!document.querySelector('[data-radix-select-content]')) {
    selectTrigger.click();
  }
  
  // Find the content area
  setTimeout(() => {
    const content = document.querySelector('[data-radix-select-content]');
    if (!content) return;
    
    // Clear existing items
    content.innerHTML = '';
    
    // Add filtered items
    filteredStaff.forEach(staff => {
      const item = document.createElement('div');
      item.setAttribute('role', 'option');
      item.setAttribute('data-radix-select-item', '');
      item.setAttribute('data-value', staff.id);
      item.setAttribute('data-staff-id', staff.id);
      item.className = 'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';
      
      // Create text content
      const textSpan = document.createElement('span');
      textSpan.className = 'absolute inset-0 flex items-center px-2';
      textSpan.textContent = staff.name + (staff.building ? ` (${staff.building.name})` : '');
      
      item.appendChild(textSpan);
      
      // Add click handler
      item.addEventListener('click', function() {
        selectStaffMember(staff);
      });
      
      content.appendChild(item);
    });
    
    // Add a message if no results
    if (filteredStaff.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'py-2 px-2 text-center text-sm text-muted-foreground';
      noResults.textContent = searchTerm ? `No staff members found matching "${searchTerm}"` : 'Type to search for staff members';
      content.appendChild(noResults);
    }
  }, 100);
}

// Add click handlers to existing staff items
function addClickHandlersToStaffItems() {
  document.querySelectorAll('[data-radix-select-item]').forEach(item => {
    // Only add handler if it doesn't already have one
    if (!item.hasAttribute('data-has-click-handler')) {
      const staffId = item.getAttribute('data-value');
      if (!staffId) return;
      
      const staff = staffMembersCache.find(s => s.id.toString() === staffId);
      if (!staff) return;
      
      item.addEventListener('click', function() {
        selectStaffMember(staff);
      });
      
      item.setAttribute('data-has-click-handler', 'true');
    }
  });
}

// Handle staff member selection
function selectStaffMember(staff) {
  log(`Selecting staff member: ${staff.name} (ID: ${staff.id})`);
  
  // Update the select trigger text
  const selectTrigger = document.querySelector('[data-radix-select-trigger]');
  if (selectTrigger) {
    const valueSpan = selectTrigger.querySelector('span');
    if (valueSpan) {
      valueSpan.textContent = staff.name;
    }
  }
  
  // Create or update a React-compatible form field
  const formElement = document.querySelector('form');
  if (formElement) {
    // Create a custom event that React will recognize
    const changeEvent = new CustomEvent('staffSelected', {
      detail: {
        id: staff.id,
        name: staff.name,
        buildingId: staff.buildingId || 0,
        costCenterId: staff.costCenterId || 0
      },
      bubbles: true
    });
    
    // Dispatch the event on the form
    formElement.dispatchEvent(changeEvent);
    
    // Also update React's internal state by dispatching a change event
    // Find the select element or create a hidden input
    let inputField = document.querySelector('input[name="staffMemberId"]');
    if (!inputField) {
      inputField = document.createElement('input');
      inputField.setAttribute('type', 'hidden');
      inputField.setAttribute('name', 'staffMemberId');
      formElement.appendChild(inputField);
    }
    
    // Set value and dispatch event
    inputField.value = staff.id;
    const changeInputEvent = new Event('change', { bubbles: true });
    inputField.dispatchEvent(changeInputEvent);
    
    // Direct DOM updates for building and cost center selects
    updateBuildingAndCostCenter(staff);
  }
  
  // Close the dropdown by clicking outside
  document.body.click();
}

// Update building and cost center based on staff selection
function updateBuildingAndCostCenter(staff) {
  // Update building select if staff has a building
  if (staff.buildingId) {
    const buildingSelect = document.querySelector('select[name="buildingId"]');
    if (buildingSelect) {
      buildingSelect.value = staff.buildingId;
      const changeEvent = new Event('change', { bubbles: true });
      buildingSelect.dispatchEvent(changeEvent);
      log(`Updated building selection to ID: ${staff.buildingId}`);
    }
  }
  
  // Update cost center select if staff has a cost center
  if (staff.costCenterId) {
    const costCenterSelect = document.querySelector('select[name="costCenterId"]');
    if (costCenterSelect) {
      costCenterSelect.value = staff.costCenterId;
      const changeEvent = new Event('change', { bubbles: true });
      costCenterSelect.dispatchEvent(changeEvent);
      log(`Updated cost center selection to ID: ${staff.costCenterId}`);
    }
  }
}

// Fix table display of buildings and cost centers
function fixTableDisplay() {
  const tableRows = document.querySelectorAll('tbody tr');
  tableRows.forEach(row => {
    // Skip rows already processed
    if (row.getAttribute('data-display-fixed') === 'true') return;
    
    // Get the delivery ID
    const deliveryId = row.getAttribute('data-id');
    if (!deliveryId) return;
    
    // Get building and cost center IDs from data attributes
    const buildingId = row.getAttribute('data-building-id');
    const costCenterId = row.getAttribute('data-cost-center-id');
    
    // Fix building cell
    if (buildingId && buildingId !== '0') {
      const buildingCell = row.querySelector('td:nth-child(5)');
      if (buildingCell && buildingsCache.length > 0) {
        const building = buildingsCache.find(b => b.id.toString() === buildingId);
        if (building && (buildingCell.textContent.trim() === 'N/A' || buildingCell.textContent.trim() === 'None')) {
          buildingCell.textContent = building.name;
        }
      }
    }
    
    // Fix cost center cell
    if (costCenterId && costCenterId !== '0') {
      const costCenterCell = row.querySelector('td:nth-child(6)');
      if (costCenterCell && costCentersCache.length > 0) {
        const costCenter = costCentersCache.find(c => c.id.toString() === costCenterId);
        if (costCenter && (costCenterCell.textContent.trim() === 'N/A' || costCenterCell.textContent.trim() === 'None')) {
          costCenterCell.textContent = `${costCenter.code} - ${costCenter.name}`;
        }
      }
    }
    
    // Mark as fixed
    row.setAttribute('data-display-fixed', 'true');
  });
}

// Helper functions for logging
function log(message, ...args) {
  if (DEBUG) {
    console.log(`[Delivery Dropdown Fix] ${message}`, ...args);
  }
}

function logError(message, error) {
  console.error(`[Delivery Dropdown Fix] ${message}`, error);
}

// Monitor for URL changes to detect navigation to deliveries page
let lastUrl = window.location.href;
new MutationObserver(() => {
  const url = window.location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (window.location.pathname.includes('/deliveries')) {
      // Clear fixed flags to force refresh
      document.querySelectorAll('[data-fixed="true"]').forEach(el => {
        el.removeAttribute('data-fixed');
      });
      document.querySelectorAll('[data-display-fixed="true"]').forEach(el => {
        el.removeAttribute('data-display-fixed');
      });
      
      // Fix dropdowns immediately and then periodically
      fixDropdowns();
    }
  }
}).observe(document, {subtree: true, childList: true});

// Last-resort function for direct DOM manipulation of select dropdowns
// Can be called from console: ONUPartsTracker.forceFixDropdowns()
function forceFixDropdowns() {
  log("FORCE: Running emergency dropdown fix");
  
  // Force-fix building dropdown
  if (buildingsCache.length > 0) {
    // Find any select element that might be for buildings
    const buildingSelects = document.querySelectorAll('select');
    
    buildingSelects.forEach(select => {
      // Check if it's likely a building select
      if (select.name && select.name.toLowerCase().includes('building') 
          || select.id && select.id.toLowerCase().includes('building')
          || select.closest('label') && select.closest('label').textContent.toLowerCase().includes('building')) {
        
        log('FORCE: Fixing building dropdown');
        
        // Clear all options
        select.innerHTML = '';
        
        // Add "None" option
        const noneOption = document.createElement('option');
        noneOption.value = "0";
        noneOption.textContent = "None";
        select.appendChild(noneOption);
        
        // Add building options
        buildingsCache
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach(building => {
            const option = document.createElement('option');
            option.value = building.id;
            option.textContent = building.name;
            select.appendChild(option);
          });
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        select.dispatchEvent(event);
      }
    });
  }
  
  // Force-fix cost center dropdown
  if (costCentersCache.length > 0) {
    // Find any select element that might be for cost centers
    const costCenterSelects = document.querySelectorAll('select');
    
    costCenterSelects.forEach(select => {
      // Check if it's likely a cost center select
      if (select.name && select.name.toLowerCase().includes('cost') 
          || select.id && select.id.toLowerCase().includes('cost')
          || select.closest('label') && select.closest('label').textContent.toLowerCase().includes('cost')) {
        
        log('FORCE: Fixing cost center dropdown');
        
        // Clear all options
        select.innerHTML = '';
        
        // Add "None" option
        const noneOption = document.createElement('option');
        noneOption.value = "0";
        noneOption.textContent = "None";
        select.appendChild(noneOption);
        
        // Add cost center options
        costCentersCache
          .sort((a, b) => a.code.localeCompare(b.code))
          .forEach(center => {
            const option = document.createElement('option');
            option.value = center.id;
            option.textContent = `${center.code} - ${center.name}`;
            select.appendChild(option);
          });
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        select.dispatchEvent(event);
      }
    });
  }
  
  return { 
    buildings: buildingsCache.length, 
    costCenters: costCentersCache.length,
    message: "Force-fixed dropdowns. Check the page to see if it worked." 
  };
}

// Export functions to global scope for manual fixing if needed
window.ONUPartsTracker = window.ONUPartsTracker || {};
window.ONUPartsTracker.forceFixDropdowns = forceFixDropdowns;
window.ONUPartsTracker.fixBuildingDropdowns = fixBuildingDropdowns;
window.ONUPartsTracker.fixCostCenterDropdowns = fixCostCenterDropdowns;