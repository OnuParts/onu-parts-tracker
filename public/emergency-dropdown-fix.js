/**
 * EMERGENCY FIX FOR BUILDINGS AND COST CENTERS DROPDOWNS
 * This script directly populates the dropdown options bypassing React
 */

console.log('%c[EMERGENCY FIX] Loading emergency dropdown fix', 'background: red; color: white; font-weight: bold; padding: 5px; font-size: 16px');

// Immediately invoked function to load the data
(async function() {
  try {
    // Load buildings directly
    const buildingsResponse = await fetch('/api/buildings');
    if (!buildingsResponse.ok) throw new Error(`Failed to load buildings: ${buildingsResponse.status}`);
    const buildings = await buildingsResponse.json();
    console.log(`[EMERGENCY FIX] Loaded ${buildings.length} buildings directly`);
    
    // Load cost centers directly
    const costCentersResponse = await fetch('/api/cost-centers');
    if (!costCentersResponse.ok) throw new Error(`Failed to load cost centers: ${costCentersResponse.status}`);
    const costCenters = await costCentersResponse.json();
    console.log(`[EMERGENCY FIX] Loaded ${costCenters.length} cost centers directly`);
    
    // Store data in global variables
    window.ONUPartsTracker = window.ONUPartsTracker || {};
    window.ONUPartsTracker.buildings = buildings;
    window.ONUPartsTracker.costCenters = costCenters;
    
    // Start fixing dropdowns
    console.log('[EMERGENCY FIX] Starting emergency dropdown population');
    setInterval(fixDropdowns, 1000);
    
    // Add a button to force fix dropdowns when clicked
    addEmergencyFixButton();
  } catch (error) {
    console.error('[EMERGENCY FIX] Error loading data:', error);
  }
})();

// Function to force-fix the dropdowns
function fixDropdowns() {
  try {
    if (!window.location.pathname.includes('/deliveries')) return;
    
    const buildings = window.ONUPartsTracker?.buildings || [];
    const costCenters = window.ONUPartsTracker?.costCenters || [];
    
    if (buildings.length === 0 || costCenters.length === 0) {
      console.warn('[EMERGENCY FIX] No building or cost center data available');
      return;
    }
    
    // Fix building dropdown
    const buildingSelect = document.querySelector('select[name="buildingId"]');
    if (buildingSelect && buildingSelect.options.length <= 1) {
      console.log('[EMERGENCY FIX] Populating building dropdown with', buildings.length, 'items');
      
      // Clear existing options
      buildingSelect.innerHTML = '';
      
      // Add default "None" option
      const noneOption = document.createElement('option');
      noneOption.value = "0";
      noneOption.text = "None";
      buildingSelect.add(noneOption);
      
      // Add building options
      buildings.forEach(building => {
        const option = document.createElement('option');
        option.value = building.id;
        option.text = building.name;
        buildingSelect.add(option);
      });
    }
    
    // Fix cost center dropdown
    const costCenterSelect = document.querySelector('select[name="costCenterId"]');
    if (costCenterSelect && costCenterSelect.options.length <= 1) {
      console.log('[EMERGENCY FIX] Populating cost center dropdown with', costCenters.length, 'items');
      
      // Clear existing options
      costCenterSelect.innerHTML = '';
      
      // Add default "None" option
      const noneOption = document.createElement('option');
      noneOption.value = "0";
      noneOption.text = "None";
      costCenterSelect.add(noneOption);
      
      // Add cost center options
      costCenters
        .sort((a, b) => a.code.localeCompare(b.code))
        .forEach(center => {
          const option = document.createElement('option');
          option.value = center.id;
          option.text = `${center.code} - ${center.name}`;
          costCenterSelect.add(option);
        });
    }
  } catch (error) {
    console.error('[EMERGENCY FIX] Error fixing dropdowns:', error);
  }
}

// Add button to force fix dropdowns
function addEmergencyFixButton() {
  // Wait for the page to be loaded
  document.addEventListener('DOMContentLoaded', function() {
    setInterval(() => {
      try {
        if (!window.location.pathname.includes('/deliveries')) return;
        
        // Check if button already exists
        if (document.getElementById('emergency-fix-btn')) return;
        
        // Get the dialog content
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return;
        
        // Create button
        const button = document.createElement('button');
        button.id = 'emergency-fix-btn';
        button.textContent = 'EMERGENCY FIX: CLICK TO LOAD BUILDINGS & COST CENTERS';
        button.style.backgroundColor = 'red';
        button.style.color = 'white';
        button.style.fontWeight = 'bold';
        button.style.padding = '10px';
        button.style.margin = '10px 0';
        button.style.borderRadius = '4px';
        button.style.border = 'none';
        button.style.cursor = 'pointer';
        button.style.width = '100%';
        
        // Add click event to force fix dropdowns
        button.addEventListener('click', function(e) {
          e.preventDefault();
          fixDropdowns();
          
          // Show confirmation toast
          const toast = document.createElement('div');
          toast.style.position = 'fixed';
          toast.style.top = '20px';
          toast.style.right = '20px';
          toast.style.backgroundColor = '#4CAF50';
          toast.style.color = 'white';
          toast.style.padding = '15px';
          toast.style.borderRadius = '4px';
          toast.style.zIndex = '9999';
          toast.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
          toast.textContent = 'Dropdowns populated successfully!';
          document.body.appendChild(toast);
          
          setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => {
              if (toast.parentNode) document.body.removeChild(toast);
            }, 500);
          }, 3000);
        });
        
        // Find place to insert button (before the first form field)
        const firstField = dialog.querySelector('.form-item') || dialog.querySelector('.form-field');
        if (firstField && firstField.parentNode) {
          firstField.parentNode.insertBefore(button, firstField);
        } else {
          // Fallback: insert at the beginning of the dialog
          const dialogHeader = dialog.querySelector('h2') || dialog.firstChild;
          if (dialogHeader && dialogHeader.parentNode) {
            dialogHeader.parentNode.insertBefore(button, dialogHeader.nextSibling);
          }
        }
      } catch (error) {
        console.error('[EMERGENCY FIX] Error adding emergency button:', error);
      }
    }, 1000);
  });
}

// Add global helper function to fix dropdowns
window.ONUPartsTracker = window.ONUPartsTracker || {};
window.ONUPartsTracker.fixDropdowns = fixDropdowns;