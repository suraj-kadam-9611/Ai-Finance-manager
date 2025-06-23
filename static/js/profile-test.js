// Debug script for profile update functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if elements exist
    console.log('Checking for profile elements...');
    
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    console.log('Profile dropdown button exists:', !!profileDropdownBtn);
    
    const profileDropdown = document.getElementById('profileDropdown');
    console.log('Profile dropdown exists:', !!profileDropdown);
    
    const profileUpdateBtn = document.getElementById('profileUpdateBtn');
    console.log('Profile update button exists:', !!profileUpdateBtn);
    
    const updateProfileBtn = document.getElementById('updateProfileBtn');
    console.log('Update profile button exists:', !!updateProfileBtn);
    
    const profileSetup = document.getElementById('profileSetup');
    console.log('Profile setup modal exists:', !!profileSetup);
    
    // Add direct click event for testing
    if (profileUpdateBtn) {
        console.log('Adding test click handler to profile update button');
        profileUpdateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Profile update button clicked');
            
            // Force show the profile modal
            if (profileSetup) {
                console.log('Showing profile setup modal');
                profileSetup.style.display = 'flex';
                profileSetup.classList.add('active');
            } else {
                console.log('ERROR: Profile setup modal not found!');
            }
        });
    }
    
    // Use the existing updateProfileBtn if it exists
    if (updateProfileBtn) {
        console.log('Adding test click handler to update profile button');
        updateProfileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Update profile button clicked');
            
            // Force show the profile modal
            if (profileSetup) {
                console.log('Showing profile setup modal');
                profileSetup.style.display = 'flex';
                profileSetup.classList.add('active');
            } else {
                console.log('ERROR: Profile setup modal not found!');
            }
        });
    }
}); 