/**
 * Fix for staff member selection in deliveries form
 * This script focuses solely on making staff member selection work properly
 */

console.log('%c[STAFF SELECTION FIX] Script loaded', 'background: #f36532; color: white; padding: 4px; font-weight: bold; font-size: 14px');

// Create global helper functions to be accessible from console
window.ONUPartsTracker = window.ONUPartsTracker || {};

// Add a direct staff selection function that can be called from the console or by clicking a button
window.ONUPartsTracker.selectStaffMember = function(staffId) {
  console.log('%c[STAFF SELECTOR] Manually selecting staff ID: ' + staffId, 'background: red; color: white; padding: 4px;');
  
  // Find the staff member in the cache
  fetch('/api/staff/' + staffId)
    .then(response => response.json())
    .then(staff => {
      console.log('[STAFF SELECTOR] Staff member found:', staff);
      
      // Find the form
      const form = document.querySelector('form');
      if (!form) {
        console.error('[STAFF SELECTOR] No form found');
        return;
      }
      
      // 1. Add a hidden input for staffMemberId
      let input = document.querySelector('input[name="staffMemberId"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'staffMemberId';
        form.appendChild(input);
      }
      input.value = staff.id;
      
      // 2. Update the select trigger text
      const selectTrigger = document.querySelector('[data-radix-select-trigger]');
      if (selectTrigger) {
        const valueElement = selectTrigger.querySelector('span');
        if (valueElement) {
          valueElement.textContent = staff.name;
        }
      }
      
      // 3. Update building and cost center if available
      if (staff.buildingId) {
        const buildingSelect = document.querySelector('select[name="buildingId"]');
        if (buildingSelect) {
          buildingSelect.value = staff.buildingId;
        }
      }
      
      if (staff.costCenterId) {
        const costCenterSelect = document.querySelector('select[name="costCenterId"]');
        if (costCenterSelect) {
          costCenterSelect.value = staff.costCenterId;
        }
      }
      
      // 4. Dispatch change events
      const changeEvent = new Event('change', { bubbles: true });
      input.dispatchEvent(changeEvent);
      
      console.log('[STAFF SELECTOR] Staff member selected successfully');
      
      // 5. Close any open dropdowns
      document.body.click();
      
      // Add a simple toast notification
      const toast = document.createElement('div');
      toast.style.position = 'fixed';
      toast.style.bottom = '20px';
      toast.style.right = '20px';
      toast.style.backgroundColor = '#f36532';
      toast.style.color = 'white';
      toast.style.padding = '10px 20px';
      toast.style.borderRadius = '4px';
      toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      toast.style.zIndex = '9999';
      toast.textContent = `Selected ${staff.name}`;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => document.body.removeChild(toast), 500);
      }, 3000);
    })
    .catch(error => {
      console.error('[STAFF SELECTOR] Error selecting staff:', error);
    });
};

// Create a button to show a staff selection dialog
function addDirectSelectionButton() {
  if (document.getElementById('direct-staff-select-btn')) return;
  
  // Get the form dialog
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return;
  
  // Create the button
  const button = document.createElement('button');
  button.id = 'direct-staff-select-btn';
  button.textContent = 'CLICK HERE TO SELECT STAFF';
  button.style.backgroundColor = 'red';
  button.style.color = 'white';
  button.style.fontWeight = 'bold';
  button.style.padding = '12px';
  button.style.margin = '10px 0';
  button.style.borderRadius = '4px';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.style.width = '100%';
  
  // Add click handler
  button.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Create a simple dialog
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '10000';
    
    const modal = document.createElement('div');
    modal.style.backgroundColor = 'white';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.width = '80%';
    modal.style.maxWidth = '500px';
    modal.style.maxHeight = '80vh';
    modal.style.overflow = 'auto';
    
    const heading = document.createElement('h2');
    heading.textContent = 'Select a Staff Member';
    heading.style.marginBottom = '20px';
    heading.style.borderBottom = '1px solid #eee';
    heading.style.paddingBottom = '10px';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by name...';
    searchInput.style.padding = '8px';
    searchInput.style.border = '1px solid #ddd';
    searchInput.style.borderRadius = '4px';
    searchInput.style.width = '100%';
    searchInput.style.marginBottom = '15px';
    
    const staffList = document.createElement('div');
    staffList.style.maxHeight = '60vh';
    staffList.style.overflow = 'auto';
    
    // Load staff data
    fetch('/api/staff')
      .then(response => response.json())
      .then(staffMembers => {
        // Function to render staff list
        const renderStaffList = (filter = '') => {
          staffList.innerHTML = '';
          
          const filteredStaff = filter 
            ? staffMembers.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))
            : staffMembers;
          
          filteredStaff.slice(0, 100).forEach(staff => {
            const item = document.createElement('div');
            item.style.padding = '10px';
            item.style.borderBottom = '1px solid #eee';
            item.style.cursor = 'pointer';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            
            const nameEl = document.createElement('span');
            nameEl.textContent = staff.name;
            
            const infoEl = document.createElement('span');
            infoEl.textContent = staff.building ? staff.building.name : '';
            infoEl.style.color = '#666';
            infoEl.style.fontSize = '0.8em';
            
            item.appendChild(nameEl);
            item.appendChild(infoEl);
            
            item.addEventListener('mouseover', () => {
              item.style.backgroundColor = '#f5f5f5';
            });
            
            item.addEventListener('mouseout', () => {
              item.style.backgroundColor = 'transparent';
            });
            
            item.addEventListener('click', () => {
              window.ONUPartsTracker.selectStaffMember(staff.id);
              document.body.removeChild(overlay);
            });
            
            staffList.appendChild(item);
          });
          
          if (filteredStaff.length === 0) {
            const noResults = document.createElement('div');
            noResults.textContent = 'No staff members found';
            noResults.style.padding = '20px';
            noResults.style.textAlign = 'center';
            noResults.style.color = '#666';
            staffList.appendChild(noResults);
          }
        };
        
        // Initial render
        renderStaffList();
        
        // Add search functionality
        searchInput.addEventListener('input', (e) => {
          renderStaffList(e.target.value);
        });
      })
      .catch(err => {
        console.error('Error loading staff:', err);
        staffList.innerHTML = '<div style="padding: 20px; text-align: center; color: red;">Error loading staff members</div>';
      });
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.padding = '8px 16px';
    closeButton.style.margin = '15px 0 0 0';
    closeButton.style.backgroundColor = '#eee';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    
    closeButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    modal.appendChild(heading);
    modal.appendChild(searchInput);
    modal.appendChild(staffList);
    modal.appendChild(closeButton);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    searchInput.focus();
  });
  
  // Find first .form-field in the dialog
  const formField = dialog.querySelector('.form-field') || dialog.querySelector('.form-item');
  if (formField && formField.parentNode) {
    formField.parentNode.insertBefore(button, formField);
  } else {
    // Fallback: insert at the beginning of the dialog
    dialog.insertBefore(button, dialog.firstChild);
  }
}

// Start the fix after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize immediately and then periodically check for changes
  setTimeout(initStaffSelectionFix, 1000);
  
  // Check every second for changes
  setInterval(function() {
    checkAndFixStaffSelection();
    addDirectSelectionButton();
  }, 1000);
});

// Global cache of staff members
const staffCache = [];

// Initialize by loading staff data
async function initStaffSelectionFix() {
  console.log('[Staff Fix] Initializing staff selection fix');
  try {
    // Load staff data
    await loadStaffData();
    
    // Apply initial fixes
    checkAndFixStaffSelection();
  } catch (error) {
    console.error('[Staff Fix] Error initializing:', error);
  }
}

// Load staff data from API
async function loadStaffData() {
  try {
    const response = await fetch('/api/staff');
    if (!response.ok) {
      throw new Error(`Failed to fetch staff data: ${response.status}`);
    }
    
    const staffData = await response.json();
    staffCache.length = 0; // Clear existing cache
    staffCache.push(...staffData);
    console.log(`[Staff Fix] Loaded ${staffData.length} staff members`);
  } catch (error) {
    console.error('[Staff Fix] Error loading staff data:', error);
  }
}

// Check and fix staff selection in any open forms
function checkAndFixStaffSelection() {
  if (!window.location.pathname.includes('/deliveries')) {
    return; // Only run on deliveries page
  }
  
  // Only proceed if we have staff data
  if (staffCache.length === 0) {
    // Try to load staff data if cache is empty
    loadStaffData();
    return;
  }
  
  // Add a direct DOM hack to fix staff dropdowns if they're open
  try {
    // Find the staff dropdown content if it's open
    const dropdownContent = document.querySelector('[data-radix-select-content]');
    if (dropdownContent && dropdownContent.children.length === 0) {
      console.log('[Staff Fix] Found empty dropdown content, attempting to populate');
      
      // Populate with staff members
      staffCache.slice(0, 20).forEach(staff => {
        const item = document.createElement('div');
        item.setAttribute('role', 'option');
        item.setAttribute('data-radix-select-item', '');
        item.setAttribute('data-value', staff.id);
        item.className = 'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'absolute inset-0 flex items-center px-2';
        textSpan.textContent = staff.name;
        
        item.appendChild(textSpan);
        dropdownContent.appendChild(item);
      });
      
      console.log('[Staff Fix] Added staff items to empty dropdown');
    }
  } catch (e) {
    console.error('[Staff Fix] Error fixing empty dropdown:', e);
  }
  
  // Find all staff dropdown items that need click handlers
  const staffItems = document.querySelectorAll('[data-radix-select-item]');
  if (staffItems.length > 0) {
    console.log(`[Staff Fix] Found ${staffItems.length} staff items to fix`);
    staffItems.forEach(fixStaffItemClickHandler);
  }
  
  // Find form and add event listeners for the custom handling
  const form = document.querySelector('form');
  if (form && !form.hasAttribute('data-staff-fix-applied')) {
    console.log('[Staff Fix] Setting up form listener for staff selection');
    setupFormListener(form);
    form.setAttribute('data-staff-fix-applied', 'true');
  }
}

// Fix click handler for a staff item
function fixStaffItemClickHandler(item) {
  // Skip if already fixed
  if (item.hasAttribute('data-click-fixed')) {
    return;
  }
  
  // Get the staff ID from the item
  const staffId = parseInt(item.getAttribute('data-value'));
  if (isNaN(staffId)) {
    return;
  }
  
  // Find the staff member in our cache
  const staffMember = staffCache.find(s => s.id === staffId);
  if (!staffMember) {
    return;
  }
  
  // Remove any existing click listeners by cloning the node
  const newItem = item.cloneNode(true);
  item.parentNode.replaceChild(newItem, item);
  
  // Add our click handler
  newItem.addEventListener('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    console.log(`[Staff Fix] Staff item clicked: ${staffMember.name} (ID: ${staffMember.id})`);
    
    // Find form element to dispatch event on
    const form = document.querySelector('form');
    if (form) {
      // Create and dispatch a custom event with staff details
      const staffEvent = new CustomEvent('staffSelected', {
        bubbles: true,
        detail: {
          id: staffMember.id,
          name: staffMember.name,
          buildingId: staffMember.buildingId || 0,
          costCenterId: staffMember.costCenterId || 0
        }
      });
      form.dispatchEvent(staffEvent);
      
      // Create React-style change event for the staffMemberId field
      // This updates the form data in React's state
      const staffIdInput = document.createElement('input');
      staffIdInput.type = 'hidden';
      staffIdInput.name = 'staffMemberId';
      staffIdInput.value = staffMember.id;
      
      form.appendChild(staffIdInput);
      const changeEvent = new Event('change', { bubbles: true });
      staffIdInput.dispatchEvent(changeEvent);
      form.removeChild(staffIdInput);
      
      // Update UI by finding the select trigger and updating its text
      const trigger = document.querySelector('[data-radix-select-trigger]');
      if (trigger) {
        const valueElement = trigger.querySelector('span');
        if (valueElement) {
          valueElement.textContent = staffMember.name;
        }
      }
      
      // Close dropdown by clicking outside
      document.body.click();
      
      // Update building and cost center if available
      updateRelatedFields(staffMember);
    }
  });
  
  // Mark as fixed
  newItem.setAttribute('data-click-fixed', 'true');
}

// Set up form listener for custom staff selection event
function setupFormListener(form) {
  form.addEventListener('staffSelected', function(event) {
    const staff = event.detail;
    console.log('[Staff Fix] Staff selected event:', staff);
    
    // Try to find the React component instance through the DOM
    // This is a common pattern to access React component methods
    const reactInstance = findReactInstance(form);
    if (reactInstance && reactInstance.props && reactInstance.props.onStaffSelected) {
      reactInstance.props.onStaffSelected(staff);
    }
    
    // As a fallback, try to find the form's React component instance
    // through an attribute that might be set by React's ref system
    if (form.hasAttribute('data-form-id')) {
      const formId = form.getAttribute('data-form-id');
      if (window.__REACT_FORMS && window.__REACT_FORMS[formId]) {
        window.__REACT_FORMS[formId].setFieldValue('staffMemberId', staff.id);
        if (staff.buildingId) {
          window.__REACT_FORMS[formId].setFieldValue('buildingId', staff.buildingId);
        }
        if (staff.costCenterId) {
          window.__REACT_FORMS[formId].setFieldValue('costCenterId', staff.costCenterId);
        }
      }
    }
  });
}

// Update related building and cost center fields
function updateRelatedFields(staff) {
  // Update building select if staff has a building ID
  if (staff.buildingId) {
    const buildingSelect = document.querySelector('select[name="buildingId"]');
    if (buildingSelect) {
      buildingSelect.value = staff.buildingId;
      const changeEvent = new Event('change', { bubbles: true });
      buildingSelect.dispatchEvent(changeEvent);
      console.log(`[Staff Fix] Updated building select to ID: ${staff.buildingId}`);
    }
  }
  
  // Update cost center select if staff has a cost center ID
  if (staff.costCenterId) {
    const costCenterSelect = document.querySelector('select[name="costCenterId"]');
    if (costCenterSelect) {
      costCenterSelect.value = staff.costCenterId;
      const changeEvent = new Event('change', { bubbles: true });
      costCenterSelect.dispatchEvent(changeEvent);
      console.log(`[Staff Fix] Updated cost center select to ID: ${staff.costCenterId}`);
    }
  }
}

// Helper function to find React component instance from a DOM node
// This is an advanced technique that might work in some React apps
function findReactInstance(dom) {
  const key = Object.keys(dom).find(key => key.startsWith('__reactInternalInstance$'));
  if (key) {
    return dom[key];
  }
  return null;
}