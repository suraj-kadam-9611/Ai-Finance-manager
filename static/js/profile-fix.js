/**
 * Profile Dropdown Fix
 * This script ensures the profile dropdown works across all pages.
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] Profile fix script loaded');
    
    // Get profile elements
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const profileUpdateBtn = document.getElementById('profileUpdateBtn');
    const profileSetup = document.getElementById('profileSetup');
    
    console.log('[DEBUG] Profile elements:', {
        profileDropdownBtn: !!profileDropdownBtn,
        profileDropdown: !!profileDropdown,
        profileUpdateBtn: !!profileUpdateBtn,
        profileSetup: !!profileSetup
    });
    
    // Fix profile dropdown functionality
    if (profileDropdownBtn && profileDropdown) {
        console.log('[DEBUG] Setting up profile dropdown event listeners');
        
        // Remove any existing listeners by cloning and replacing
        const newProfileBtn = profileDropdownBtn.cloneNode(true);
        profileDropdownBtn.parentNode.replaceChild(newProfileBtn, profileDropdownBtn);
        
        // Add new click listener
        newProfileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('[DEBUG] Profile button clicked');
            profileDropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (profileDropdown.classList.contains('active') && 
                !profileDropdown.contains(e.target) && 
                !newProfileBtn.contains(e.target)) {
                console.log('[DEBUG] Closing profile dropdown (clicked outside)');
                profileDropdown.classList.remove('active');
            }
        });
    }
    
    // Fix profile update button functionality
    if (profileUpdateBtn && profileSetup) {
        console.log('[DEBUG] Setting up profile update button');
        
        // Remove any existing listeners by cloning and replacing
        const newUpdateBtn = profileUpdateBtn.cloneNode(true);
        profileUpdateBtn.parentNode.replaceChild(newUpdateBtn, profileUpdateBtn);
        
        // Add new click listener
        newUpdateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[DEBUG] Profile update button clicked');
            
            // Close dropdown
            if (profileDropdown) {
                profileDropdown.classList.remove('active');
            }
            
            // Load user profile data and show profile setup modal
            loadUserProfile();
            
            // Show profile setup modal
            profileSetup.style.display = 'flex';
            setTimeout(() => {
                profileSetup.classList.add('active');
            }, 10);
        });
    }
    
    // Fix profile setup close buttons
    const closeProfileSetupBtns = document.querySelectorAll('.close-profile-setup');
    if (closeProfileSetupBtns.length > 0 && profileSetup) {
        console.log('[DEBUG] Setting up profile setup close buttons');
        
        closeProfileSetupBtns.forEach(btn => {
            // Remove any existing listeners by cloning and replacing
            const newCloseBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newCloseBtn, btn);
            
            // Add new click listener
            newCloseBtn.addEventListener('click', function() {
                console.log('[DEBUG] Close profile setup button clicked');
                profileSetup.classList.remove('active');
                setTimeout(() => {
                    profileSetup.style.display = 'none';
                }, 300);
            });
        });
        
        // Close modal when clicking outside the content
        profileSetup.addEventListener('click', function(e) {
            if (e.target === profileSetup) {
                console.log('[DEBUG] Closing profile setup (clicked outside)');
                profileSetup.classList.remove('active');
                setTimeout(() => {
                    profileSetup.style.display = 'none';
                }, 300);
            }
        });
    }
    
    // Fix update profile button in empty state
    const updateProfileBtn = document.getElementById('updateProfileBtn');
    if (updateProfileBtn && profileSetup) {
        console.log('[DEBUG] Setting up update profile button in empty state');
        
        // Remove any existing listeners by cloning and replacing
        const newEmptyStateBtn = updateProfileBtn.cloneNode(true);
        updateProfileBtn.parentNode.replaceChild(newEmptyStateBtn, updateProfileBtn);
        
        // Add new click listener
        newEmptyStateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[DEBUG] Empty state update profile button clicked');
            
            // Load user profile data and show profile setup modal
            loadUserProfile();
            
            // Show profile setup modal
            profileSetup.style.display = 'flex';
            setTimeout(() => {
                profileSetup.classList.add('active');
            }, 10);
        });
    }
    
    // Helper function to load user profile
    async function loadUserProfile() {
        const profileForm = document.getElementById('profileForm');
        if (!profileForm) return;
        
        console.log('[DEBUG] Loading user profile data');
        
        try {
            const response = await fetch('/api/profile');
            if (!response.ok) throw new Error('Failed to fetch profile data');
            
            const data = await response.json();
            
            if (data.success && data.profile) {
                const profile = data.profile;
                
                // Set form values
                const currencySelect = document.getElementById('currency');
                const monthlyIncomeInput = document.getElementById('monthlyIncome');
                const savingsGoalInput = document.getElementById('savingsGoal');
                const emergencyFundInput = document.getElementById('emergencyFund');
                
                if (currencySelect) {
                    currencySelect.value = profile.currency || 'INR';
                }
                
                if (monthlyIncomeInput && profile.monthlyIncome) {
                    monthlyIncomeInput.value = profile.monthlyIncome;
                }
                
                if (savingsGoalInput && profile.savingsGoal) {
                    savingsGoalInput.value = profile.savingsGoal;
                }
                
                if (emergencyFundInput && profile.emergencyFund) {
                    emergencyFundInput.value = profile.emergencyFund;
                }
                
                console.log('[DEBUG] User profile loaded successfully');
            }
        } catch (error) {
            console.error('[DEBUG] Error loading user profile:', error);
        }
    }
}); 