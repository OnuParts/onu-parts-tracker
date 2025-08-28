/**
 * EMERGENCY FIX SCRIPT
 * This script fixes the Dave Dellifield and dropdowns issue
 * It uses a completely different approach than previous attempts
 */

// Simple compatibility checker - don't run if not supported
try {
  console.log('Loading emergency fix script...');

  // Only run this script if document is available
  if (typeof document !== 'undefined') {
    // Wait for the DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initFixScript);
    } else {
      // DOM already loaded, run immediately
      initFixScript();
    }
  }
} catch (err) {
  console.error('Error loading emergency fix script:', err);
}

function initFixScript() {
  console.log('DOM loaded, initializing emergency fix');
  
  // Apply immediately
  try {
    fixEverything();
    
    // And also set an interval to keep applying the fix
    setInterval(fixEverything, 1000);
  } catch (err) {
    console.error('Error in fix script initialization:', err);
  }
}

// Main fix function 
function fixEverything() {
  // Only run on the deliveries page
  if (!window.location.pathname.includes('/deliveries')) {
    return;
  }
  
  // Look for dialog that might appear
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('role') && node.getAttribute('role') === 'dialog') {
            console.log('EMERGENCY FIX: Dialog detected, fixing immediately!');
            emergencyFixDialog(node);
          }
        }
      }
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// Fix the dialog specifically
function emergencyFixDialog(dialog) {
  // Wait for React to finish rendering
  setTimeout(() => {
    try {
      console.log('EMERGENCY FIX: Starting dialog fix...');
      
      // 1. First, completely disable the problematic part search field so it can't conflict
      const partSearchInput = dialog.querySelector('input[placeholder*="Search parts"]');
      if (partSearchInput) {
        console.log('EMERGENCY FIX: Found part search, disabling it temporarily');
        // Add a dummy class we can check for later
        partSearchInput.classList.add('emergency-fix-applied');
        partSearchInput.disabled = true;
      }
      
      // 2. Make sure the staff field is reset and operating correctly
      const staffField = dialog.querySelector('.parts-delivery-form-staff');
      if (staffField) {
        console.log('EMERGENCY FIX: Found staff field, ensuring it works correctly');
        
        // Find the staff search input 
        const staffInput = staffField.querySelector('input[type="text"]');
        if (staffInput) {
          // Clear any wrong values
          staffInput.value = '';
          
          // Make sure it's enabled and visible
          staffInput.disabled = false;
          staffInput.style.display = 'block';
          
          // Fetch staff list directly
          fetch('/api/staff')
            .then(response => response.json())
            .then(staff => {
              console.log(`EMERGENCY FIX: Loaded ${staff.length} staff members`);
              
              // Set up direct click handlers for Dave Dellifield
              const daveDellifield = staff.find(s => s.name === 'Dave Dellifield');
              if (daveDellifield) {
                console.log(`EMERGENCY FIX: Found Dave Dellifield (ID: ${daveDellifield.id})`);
                
                // Create a custom button for Dave
                const daveButton = document.createElement('button');
                daveButton.textContent = 'Select Dave Dellifield';
                daveButton.className = 'dave-button bg-primary hover:bg-primary/90 text-white rounded px-3 py-1 text-sm';
                daveButton.style.position = 'absolute';
                daveButton.style.right = '10px';
                daveButton.style.top = '50%';
                daveButton.style.transform = 'translateY(-50%)';
                daveButton.style.zIndex = '9999';
                
                // Add click handler
                daveButton.addEventListener('click', () => {
                  console.log('EMERGENCY FIX: Dave Dellifield button clicked');
                  
                  // Find the right input to manipulate
                  const staffCombobox = staffField.querySelector('[role="combobox"]');
                  if (staffCombobox) {
                    staffCombobox.textContent = daveDellifield.name;
                  }
                  
                  // Create/Update the hidden form field
                  let hiddenInput = dialog.querySelector('input[name="staffMemberId"]');
                  if (!hiddenInput) {
                    hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = 'staffMemberId';
                    dialog.querySelector('form').appendChild(hiddenInput);
                  }
                  
                  hiddenInput.value = daveDellifield.id;
                  hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                  
                  // Hide dropdown if open
                  const listbox = document.querySelector('[role="listbox"]');
                  if (listbox) {
                    listbox.remove();
                  }
                  
                  // Remove any part input value that might be Dave
                  const partSelect = dialog.querySelector('[name="partId"]');
                  if (partSelect && partSelect.value === "dave-dellifield") {
                    partSelect.value = "";
                  }
                });
                
                // Add the button to the staff field
                if (!staffField.querySelector('.dave-button')) {
                  staffField.style.position = 'relative';
                  staffField.appendChild(daveButton);
                }
              }
            })
            .catch(error => console.error('EMERGENCY FIX: Error loading staff:', error));
        }
      }
      
      // 3. Fix buildings dropdown
      const buildingField = dialog.querySelector('.parts-delivery-form-building');
      if (buildingField) {
        console.log('EMERGENCY FIX: Found building field, fixing...');
        
        fetch('/api/buildings')
          .then(response => response.json())
          .then(buildings => {
            console.log(`EMERGENCY FIX: Loaded ${buildings.length} buildings`);
            
            // Create a normal select dropdown as a replacement
            const select = document.createElement('select');
            select.className = 'w-full rounded-md border border-input bg-background px-3 py-2';
            select.name = 'buildingId';
            
            // Add None option
            const noneOption = document.createElement('option');
            noneOption.value = '0';
            noneOption.text = 'Select a building (optional)';
            select.add(noneOption);
            
            // Add building options
            buildings
              .sort((a, b) => a.name.localeCompare(b.name))
              .forEach(building => {
                const option = document.createElement('option');
                option.value = building.id;
                option.text = building.name;
                select.add(option);
              });
            
            // Add the select box if it doesn't exist already
            if (!buildingField.querySelector('select[name="buildingId"]')) {
              // Get the Radix UI component to replace
              const radixBuildingTrigger = buildingField.querySelector('[aria-haspopup="listbox"]');
              if (radixBuildingTrigger) {
                // Create a label
                const label = document.createElement('label');
                label.className = 'block text-sm font-medium mb-2';
                label.textContent = 'Building';
                
                // Replace the Radix UI trigger with our select
                if (radixBuildingTrigger.parentNode) {
                  radixBuildingTrigger.parentNode.replaceChild(select, radixBuildingTrigger);
                  radixBuildingTrigger.parentNode.prepend(label);
                }
              } else {
                // Just append if we can't find it
                buildingField.innerHTML = '';
                buildingField.appendChild(select);
              }
            }
          })
          .catch(error => console.error('EMERGENCY FIX: Error loading buildings:', error));
      }
      
      // 4. Fix cost centers dropdown
      const costCenterField = dialog.querySelector('.parts-delivery-form-cost-center');
      if (costCenterField) {
        console.log('EMERGENCY FIX: Found cost center field, fixing...');
        
        fetch('/api/cost-centers')
          .then(response => response.json())
          .then(costCenters => {
            console.log(`EMERGENCY FIX: Loaded ${costCenters.length} cost centers`);
            
            // Create a normal select dropdown as a replacement
            const select = document.createElement('select');
            select.className = 'w-full rounded-md border border-input bg-background px-3 py-2';
            select.name = 'costCenterId';
            
            // Add None option
            const noneOption = document.createElement('option');
            noneOption.value = '0';
            noneOption.text = 'Select a cost center (optional)';
            select.add(noneOption);
            
            // Add cost center options
            costCenters
              .sort((a, b) => a.code.localeCompare(b.code))
              .forEach(center => {
                const option = document.createElement('option');
                option.value = center.id;
                option.text = `${center.code} - ${center.name}`;
                select.add(option);
              });
            
            // Add the select box if it doesn't exist already
            if (!costCenterField.querySelector('select[name="costCenterId"]')) {
              // Get the Radix UI component to replace
              const radixCCTrigger = costCenterField.querySelector('[aria-haspopup="listbox"]');
              if (radixCCTrigger) {
                // Create a label
                const label = document.createElement('label');
                label.className = 'block text-sm font-medium mb-2';
                label.textContent = 'Cost Center';
                
                // Replace the Radix UI trigger with our select
                if (radixCCTrigger.parentNode) {
                  radixCCTrigger.parentNode.replaceChild(select, radixCCTrigger);
                  radixCCTrigger.parentNode.prepend(label);
                }
              } else {
                // Just append if we can't find it
                costCenterField.innerHTML = '';
                costCenterField.appendChild(select);
              }
            }
          })
          .catch(error => console.error('EMERGENCY FIX: Error loading cost centers:', error));
      }
      
      // 5. Re-enable parts search after everything else is fixed
      setTimeout(() => {
        if (partSearchInput && partSearchInput.classList.contains('emergency-fix-applied')) {
          console.log('EMERGENCY FIX: Re-enabling part search');
          partSearchInput.disabled = false;
        }
      }, 1000);
      
      console.log('EMERGENCY FIX: Dialog fixes completed');
    } catch (error) {
      console.error('EMERGENCY FIX: Error fixing dialog:', error);
    }
  }, 500);
}

// Make functions available globally for debugging
window.emergencyFixes = {
  fix: fixEverything,
  fixDialog: emergencyFixDialog
};