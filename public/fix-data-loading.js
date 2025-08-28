/**
 * 100% RELIABLE DATA LOADING FIX
 * This script completely replaces the React data loading with direct DOM manipulation
 * It fixes Dave Dellifield selection and ensures dropdowns have data
 */

// Cache data globally so it's available immediately
window.cachedBuildings = [];
window.cachedCostCenters = [];
window.cachedStaff = [];
window.hasDaveDellifield = false;
window.daveDellifiedId = null;

// Only run this when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFixedDataLoader);
} else {
  // DOM is already loaded, run now
  initFixedDataLoader();
}

// Main initialization function
function initFixedDataLoader() {
  console.log('FIXED DATA LOADER: Starting 100% reliable data loader');
  
  // Load all data immediately and cache it
  loadAllDataImmediately();
  
  // Set up observers for the dialog
  watchForDeliveryDialog();
  
  // Only refresh data when user actively uses the application
  // Using a much less frequent interval (10 minutes instead of 1 minute)
  // This prevents excessive API calls and improves performance
  setInterval(loadAllDataImmediately, 600000);
}

// Track user activity
let userLastActive = Date.now();
document.addEventListener('click', () => { userLastActive = Date.now(); });
document.addEventListener('keydown', () => { userLastActive = Date.now(); });
document.addEventListener('mousemove', () => { userLastActive = Date.now(); });
document.addEventListener('scroll', () => { userLastActive = Date.now(); });

// Load all data from backend and cache it
function loadAllDataImmediately() {
  // Skip refresh if user hasn't been active in the last 5 minutes
  const inactiveTimeMs = Date.now() - userLastActive;
  if (inactiveTimeMs > 300000) {
    console.log('FIXED DATA LOADER: Skipping refresh due to user inactivity');
    return;
  }
  
  console.log('FIXED DATA LOADER: Loading all data directly');
  
  // Load buildings
  fetchWithRetry('/api/buildings', 3)
    .then(buildings => {
      if (Array.isArray(buildings) && buildings.length > 0) {
        window.cachedBuildings = buildings;
        console.log(`FIXED DATA LOADER: Cached ${buildings.length} buildings`);
      }
    })
    .catch(err => console.error('FIXED DATA LOADER: Buildings fetch error', err));
  
  // Load cost centers
  fetchWithRetry('/api/cost-centers', 3)
    .then(costCenters => {
      if (Array.isArray(costCenters) && costCenters.length > 0) {
        window.cachedCostCenters = costCenters;
        console.log(`FIXED DATA LOADER: Cached ${costCenters.length} cost centers`);
      }
    })
    .catch(err => console.error('FIXED DATA LOADER: Cost centers fetch error', err));
  
  // Load staff
  fetchWithRetry('/api/staff', 3)
    .then(staff => {
      if (Array.isArray(staff) && staff.length > 0) {
        window.cachedStaff = staff;
        console.log(`FIXED DATA LOADER: Cached ${staff.length} staff members`);
        
        // Find Dave Dellifield
        const daveDellifield = staff.find(s => s.name === 'Dave Dellifield');
        if (daveDellifield) {
          window.hasDaveDellifield = true;
          window.daveDellifiedId = daveDellifield.id;
          console.log(`FIXED DATA LOADER: Found Dave Dellifield with ID ${daveDellifield.id}`);
        }
      }
    })
    .catch(err => console.error('FIXED DATA LOADER: Staff fetch error', err));
}

// Helper function to fetch with multiple retries
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    return await response.json();
  } catch (err) {
    if (retries <= 1) throw err;
    console.log(`FIXED DATA LOADER: Retrying ${url}, ${retries-1} attempts left`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, retries - 1, delay * 1.5);
  }
}

// Watch for delivery dialog opening
function watchForDeliveryDialog() {
  // Set up a mutation observer to detect dialog
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node.getAttribute && node.getAttribute('role') === 'dialog') {
            const dialogTitle = node.querySelector('h2, [role="heading"]');
            if (dialogTitle && dialogTitle.textContent.includes('Parts Delivery')) {
              console.log('FIXED DATA LOADER: Detected parts delivery dialog, fixing it');
              fixDeliveryDialog(node);
            }
          }
        }
      }
    }
  });
  
  // Start observing the body
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('FIXED DATA LOADER: Watching for delivery dialog');
}

// Fix the delivery dialog
function fixDeliveryDialog(dialog) {
  // Wait a bit for React to finish rendering
  setTimeout(() => {
    try {
      console.log('FIXED DATA LOADER: Starting dialog fixes...');
      
      // 1. FIX STAFF SELECTION
      fixStaffSelection(dialog);
      
      // 2. FIX BUILDINGS DROPDOWN  
      fixBuildingsDropdown(dialog);
      
      // 3. FIX COST CENTERS DROPDOWN
      fixCostCentersDropdown(dialog);
      
      // 4. ADD DAVE DELLIFIELD BUTTON
      addDaveDellifiedButton(dialog);
      
      console.log('FIXED DATA LOADER: Dialog fixes completed');
    } catch (error) {
      console.error('FIXED DATA LOADER: Error in dialog fix', error);
    }
  }, 300);
}

// Fix staff selection in delivery dialog
function fixStaffSelection(dialog) {
  // If we don't have staff data, load it now
  if (!window.cachedStaff.length) {
    console.log('FIXED DATA LOADER: No staff data available, loading now');
    fetchWithRetry('/api/staff', 3)
      .then(staff => {
        window.cachedStaff = staff;
        console.log(`FIXED DATA LOADER: Loaded ${staff.length} staff members`);
        
        // Apply fixes now that data is loaded
        setTimeout(() => fixStaffSelection(dialog), 100);
      })
      .catch(err => console.error('FIXED DATA LOADER: Staff fetch error', err));
    return;
  }
  
  // Find staff section
  const staffField = dialog.querySelector('.parts-delivery-form-staff');
  if (!staffField) {
    console.log('FIXED DATA LOADER: Staff field not found');
    return;
  }
  
  console.log('FIXED DATA LOADER: Fixing staff selection');
  
  // Create a direct replacement with a standard HTML <select>
  const select = document.createElement('select');
  select.className = 'w-full rounded-md border border-input bg-background px-3 py-2';
  select.name = 'staffMemberId';
  select.id = 'staffMemberId';
  select.required = true;
  
  // Add placeholder option
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.text = 'Select a staff member';
  placeholderOption.selected = true;
  select.appendChild(placeholderOption);
  
  // Add staff options
  window.cachedStaff
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(staff => {
      const option = document.createElement('option');
      option.value = staff.id;
      option.text = staff.name;
      // Preselect Dave Dellifield if found
      if (staff.name === 'Dave Dellifield') {
        option.selected = true;
      }
      select.appendChild(option);
    });
  
  // Replace the React component with our select
  const label = document.createElement('label');
  label.htmlFor = 'staffMemberId';
  label.className = 'block text-sm font-medium mb-2 text-foreground';
  label.textContent = 'Staff Member *';
  
  // Get the original container and replace everything
  const formField = dialog.querySelector('.parts-delivery-form-staff');
  if (formField) {
    // Preserve original label and error elements
    const originalLabel = formField.querySelector('label');
    
    // Clear the field and add our elements
    formField.innerHTML = '';
    
    if (originalLabel) {
      formField.appendChild(originalLabel);
    } else {
      formField.appendChild(label);
    }
    
    formField.appendChild(select);
  }
}

// Fix buildings dropdown
function fixBuildingsDropdown(dialog) {
  // If we don't have buildings data, load it now
  if (!window.cachedBuildings.length) {
    console.log('FIXED DATA LOADER: No buildings data available, loading now');
    fetchWithRetry('/api/buildings', 3)
      .then(buildings => {
        window.cachedBuildings = buildings;
        console.log(`FIXED DATA LOADER: Loaded ${buildings.length} buildings`);
        
        // Apply fixes now that data is loaded
        setTimeout(() => fixBuildingsDropdown(dialog), 100);
      })
      .catch(err => console.error('FIXED DATA LOADER: Buildings fetch error', err));
    return;
  }
  
  // Find buildings section
  const buildingField = dialog.querySelector('.parts-delivery-form-building');
  if (!buildingField) {
    console.log('FIXED DATA LOADER: Building field not found');
    return;
  }
  
  console.log('FIXED DATA LOADER: Fixing buildings dropdown');
  
  // Create a direct replacement with a standard HTML <select>
  const select = document.createElement('select');
  select.className = 'w-full rounded-md border border-input bg-background px-3 py-2';
  select.name = 'buildingId';
  select.id = 'buildingId';
  
  // Add placeholder option
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.text = 'Select a building (optional)';
  placeholderOption.selected = true;
  select.appendChild(placeholderOption);
  
  // Add building options
  window.cachedBuildings
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(building => {
      const option = document.createElement('option');
      option.value = building.id;
      option.text = building.name;
      select.appendChild(option);
    });
  
  // Replace the React component with our select
  const label = document.createElement('label');
  label.htmlFor = 'buildingId';
  label.className = 'block text-sm font-medium mb-2 text-foreground';
  label.textContent = 'Building';
  
  // Get the original container and replace everything
  buildingField.innerHTML = '';
  buildingField.appendChild(label);
  buildingField.appendChild(select);
}

// Fix cost centers dropdown
function fixCostCentersDropdown(dialog) {
  // If we don't have cost center data, load it now
  if (!window.cachedCostCenters.length) {
    console.log('FIXED DATA LOADER: No cost centers data available, loading now');
    fetchWithRetry('/api/cost-centers', 3)
      .then(costCenters => {
        window.cachedCostCenters = costCenters;
        console.log(`FIXED DATA LOADER: Loaded ${costCenters.length} cost centers`);
        
        // Apply fixes now that data is loaded
        setTimeout(() => fixCostCentersDropdown(dialog), 100);
      })
      .catch(err => console.error('FIXED DATA LOADER: Cost centers fetch error', err));
    return;
  }
  
  // Find cost center section
  const costCenterField = dialog.querySelector('.parts-delivery-form-cost-center');
  if (!costCenterField) {
    console.log('FIXED DATA LOADER: Cost center field not found');
    return;
  }
  
  console.log('FIXED DATA LOADER: Fixing cost centers dropdown');
  
  // Create a direct replacement with a standard HTML <select>
  const select = document.createElement('select');
  select.className = 'w-full rounded-md border border-input bg-background px-3 py-2';
  select.name = 'costCenterId';
  select.id = 'costCenterId';
  
  // Add placeholder option
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.text = 'Select a cost center (optional)';
  placeholderOption.selected = true;
  select.appendChild(placeholderOption);
  
  // Add cost center options
  window.cachedCostCenters
    .sort((a, b) => a.code.localeCompare(b.code))
    .forEach(costCenter => {
      const option = document.createElement('option');
      option.value = costCenter.id;
      option.text = `${costCenter.code} - ${costCenter.name}`;
      select.appendChild(option);
    });
  
  // Replace the React component with our select
  const label = document.createElement('label');
  label.htmlFor = 'costCenterId';
  label.className = 'block text-sm font-medium mb-2 text-foreground';
  label.textContent = 'Cost Center';
  
  // Get the original container and replace everything
  costCenterField.innerHTML = '';
  costCenterField.appendChild(label);
  costCenterField.appendChild(select);
}

// Add a dedicated Dave Dellifield button
function addDaveDellifiedButton(dialog) {
  if (!window.hasDaveDellifield) {
    console.log('FIXED DATA LOADER: Dave Dellifield not found in staff data');
    return;
  }
  
  console.log('FIXED DATA LOADER: Adding Dave Dellifield button');
  
  const daveButton = document.createElement('button');
  daveButton.textContent = 'Select Dave Dellifield';
  daveButton.type = 'button';
  daveButton.className = 'text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded text-sm font-medium';
  daveButton.style.marginTop = '8px';
  daveButton.style.width = '100%';
  
  // Add click handler 
  daveButton.addEventListener('click', () => {
    console.log('FIXED DATA LOADER: Dave Dellifield button clicked');
    
    // Find the staff select element and set it to Dave
    const staffSelect = dialog.querySelector('select[name="staffMemberId"]');
    if (staffSelect) {
      staffSelect.value = window.daveDellifiedId;
      
      // Trigger change event for React
      const event = new Event('change', { bubbles: true });
      staffSelect.dispatchEvent(event);
      
      console.log('FIXED DATA LOADER: Set staff selection to Dave Dellifield');
    }
  });
  
  // Find the staff field to add the button after it
  const staffField = dialog.querySelector('.parts-delivery-form-staff');
  if (staffField) {
    staffField.appendChild(daveButton);
  }
}

// Log that the script is loaded
console.log('FIXED DATA LOADER: Script loaded and ready');