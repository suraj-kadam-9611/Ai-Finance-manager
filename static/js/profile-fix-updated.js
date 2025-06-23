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
    const accountDetailsBtn = document.getElementById('accountDetailsBtn');
    const accountDetailsModal = document.getElementById('accountDetailsModal');
    const achievementsBtn = document.getElementById('achievementsBtn');
    const achievementsModal = document.getElementById('achievementsModal');
    
    console.log('[DEBUG] Profile elements:', {
        profileDropdownBtn: !!profileDropdownBtn,
        profileDropdown: !!profileDropdown,
        profileUpdateBtn: !!profileUpdateBtn,
        profileSetup: !!profileSetup,
        accountDetailsBtn: !!accountDetailsBtn,
        accountDetailsModal: !!accountDetailsModal,
        achievementsBtn: !!achievementsBtn,
        achievementsModal: !!achievementsModal
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
    
    // Account Details button functionality
    if (accountDetailsBtn && accountDetailsModal) {
        console.log('[DEBUG] Setting up account details button');
        
        // Remove any existing listeners by cloning and replacing
        const newAccountDetailsBtn = accountDetailsBtn.cloneNode(true);
        accountDetailsBtn.parentNode.replaceChild(newAccountDetailsBtn, accountDetailsBtn);
        
        // Add new click listener
        newAccountDetailsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[DEBUG] Account details button clicked');
            
            // Close dropdown
            if (profileDropdown) {
                profileDropdown.classList.remove('active');
            }
            
            // Load account details data
            loadAccountDetails();
            
            // Show account details modal
            accountDetailsModal.style.display = 'flex';
            setTimeout(() => {
                accountDetailsModal.classList.add('active');
            }, 10);
        });
    }
    
    // Achievements button functionality
    if (achievementsBtn && achievementsModal) {
        console.log('[DEBUG] Setting up achievements button');
        
        // Remove any existing listeners by cloning and replacing
        const newAchievementsBtn = achievementsBtn.cloneNode(true);
        achievementsBtn.parentNode.replaceChild(newAchievementsBtn, achievementsBtn);
        
        // Add new click listener
        newAchievementsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[DEBUG] Achievements button clicked');
            
            // Close dropdown
            if (profileDropdown) {
                profileDropdown.classList.remove('active');
            }
            
            // Load achievements data
            loadAchievements();
            
            // Show achievements modal
            achievementsModal.style.display = 'flex';
            setTimeout(() => {
                achievementsModal.classList.add('active');
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
    
    // Setup close buttons for all modals
    const closeModalBtns = document.querySelectorAll('.close-modal');
    if (closeModalBtns.length > 0) {
        console.log('[DEBUG] Setting up close buttons for all modals');
        
        closeModalBtns.forEach(btn => {
            // Find the parent modal
            const parentModal = btn.closest('.profile-setup');
            if (!parentModal) return;
            
            // Remove any existing listeners by cloning and replacing
            const newCloseBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newCloseBtn, btn);
            
            // Add new click listener
            newCloseBtn.addEventListener('click', function() {
                console.log('[DEBUG] Close modal button clicked');
                parentModal.classList.remove('active');
                setTimeout(() => {
                    parentModal.style.display = 'none';
                }, 300);
            });
        });
        
        // Close modals when clicking outside
        const modals = document.querySelectorAll('.profile-setup');
        modals.forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    console.log('[DEBUG] Closing modal (clicked outside)');
                    modal.classList.remove('active');
                    setTimeout(() => {
                        modal.style.display = 'none';
                    }, 300);
                }
            });
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
    
    // Set up account details form submission
    const accountDetailsForm = document.getElementById('accountDetailsForm');
    if (accountDetailsForm) {
        console.log('[DEBUG] Setting up account details form submission');
        
        accountDetailsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('[DEBUG] Account details form submitted');
            
            // Get form data
            const formData = {
                username: document.getElementById('username').value,
                fullName: document.getElementById('fullName').value,
                mobile: document.getElementById('mobile').value,
                newPassword: document.getElementById('newPassword').value,
                confirmPassword: document.getElementById('confirmPassword').value
            };
            
            // Basic validation
            if (!formData.username || !formData.fullName || !formData.mobile) {
                showNotification('Please fill in all required fields.', 'error');
                return;
            }
            
            // Password validation
            if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
                showNotification('Passwords do not match.', 'error');
                return;
            }
            
            // If password is empty, don't send it
            if (!formData.newPassword) {
                delete formData.newPassword;
                delete formData.confirmPassword;
            }
            
            try {
                // Submit form data
                const response = await fetch('/api/update-profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    showNotification('Account details updated successfully!', 'success');
                    
                    // Close modal
                    if (accountDetailsModal) {
                        accountDetailsModal.classList.remove('active');
                        setTimeout(() => {
                            accountDetailsModal.style.display = 'none';
                        }, 300);
                    }
                    
                    // Reload page to reflect changes
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    throw new Error(data.message || 'Failed to update account details');
                }
            } catch (error) {
                console.error('[DEBUG] Error updating account details:', error);
                showNotification(error.message || 'An error occurred. Please try again.', 'error');
            }
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
    
    // Helper function to load account details
    async function loadAccountDetails() {
        const accountDetailsForm = document.getElementById('accountDetailsForm');
        if (!accountDetailsForm) return;
        
        console.log('[DEBUG] Loading account details');
        
        try {
            const response = await fetch('/api/profile');
            if (!response.ok) throw new Error('Failed to fetch account details');
            
            const data = await response.json();
            
            if (data.success && data.profile) {
                const profile = data.profile;
                
                // Set form values
                const usernameInput = document.getElementById('username');
                const fullNameInput = document.getElementById('fullName');
                const mobileInput = document.getElementById('mobile');
                
                if (usernameInput) {
                    usernameInput.value = profile.username || '';
                }
                
                if (fullNameInput) {
                    fullNameInput.value = profile.fullName || '';
                }
                
                if (mobileInput) {
                    mobileInput.value = profile.mobile || '';
                }
                
                // Clear password fields
                const newPasswordInput = document.getElementById('newPassword');
                const confirmPasswordInput = document.getElementById('confirmPassword');
                
                if (newPasswordInput) newPasswordInput.value = '';
                if (confirmPasswordInput) confirmPasswordInput.value = '';
                
                console.log('[DEBUG] Account details loaded successfully');
            }
        } catch (error) {
            console.error('[DEBUG] Error loading account details:', error);
        }
    }
    
    // Helper function to load achievements
    async function loadAchievements() {
        const achievementsList = document.getElementById('achievementsList');
        if (!achievementsList) return;
        
        console.log('[DEBUG] Loading achievements');
        achievementsList.innerHTML = '<div class="loading-achievements">Loading your achievements...</div>';
        
        try {
            const response = await fetch('/api/achievements');
            if (!response.ok) {
                achievementsList.innerHTML = '<div class="loading-achievements">Could not load achievements. Please try again later.</div>';
                return;
            }
            
            const data = await response.json();
            
            if (data.success && data.achievements) {
                // Sample achievement data if API not yet implemented
                if (data.achievements.length === 0) {
                    // Placeholder achievements
                    const placeholderAchievements = generatePlaceholderAchievements();
                    renderAchievements(placeholderAchievements);
                } else {
                    renderAchievements(data.achievements);
                }
            } else {
                throw new Error(data.message || 'Failed to load achievements');
            }
        } catch (error) {
            console.error('[DEBUG] Error loading achievements:', error);
            achievementsList.innerHTML = '<div class="loading-achievements">Error loading achievements. Please try again later.</div>';
        }
    }
    
    // Function to render achievements
    function renderAchievements(achievements) {
        const achievementsList = document.getElementById('achievementsList');
        if (!achievementsList) return;
        
        // Clear loading message
        achievementsList.innerHTML = '';
        
        // Count unlocked achievements
        const unlockedCount = achievements.filter(a => a.isUnlocked).length;
        const totalPoints = achievements.reduce((total, a) => total + (a.isUnlocked ? a.points : 0), 0);
        const inProgressCount = achievements.filter(a => !a.isUnlocked && a.progress > 0).length;
        
        // Update stats
        document.getElementById('totalAchievements').textContent = unlockedCount;
        document.getElementById('achievementPoints').textContent = totalPoints;
        document.getElementById('nextAchievement').textContent = inProgressCount;
        
        // Render each achievement
        achievements.forEach(achievement => {
            const card = document.createElement('div');
            card.className = `achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'}`;
            
            // Create icon based on achievement type
            let iconSvg = '';
            switch (achievement.type) {
                case 'expense':
                    iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
                    break;
                case 'goal':
                    iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
                    break;
                case 'savings':
                    iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
                    break;
                default:
                    iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            }
            
            card.innerHTML = `
                <div class="achievement-icon">
                    ${iconSvg}
                </div>
                <div class="achievement-info">
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-progress">
                        <div class="achievement-progress-fill" style="width: ${achievement.progress}%"></div>
                    </div>
                </div>
            `;
            
            achievementsList.appendChild(card);
        });
    }
    
    // Generate placeholder achievements for testing
    function generatePlaceholderAchievements() {
        return [
            {
                id: 1,
                title: 'Budget Master',
                description: 'Create your first monthly budget',
                type: 'expense',
                isUnlocked: true,
                progress: 100,
                points: 10
            },
            {
                id: 2,
                title: 'Goal Setter',
                description: 'Set your first financial goal',
                type: 'goal',
                isUnlocked: true,
                progress: 100,
                points: 15
            },
            {
                id: 3,
                title: 'Expense Tracker',
                description: 'Track 10 expenses',
                type: 'expense',
                isUnlocked: false,
                progress: 40,
                points: 20
            },
            {
                id: 4,
                title: 'Goal Achiever',
                description: 'Complete your first financial goal',
                type: 'goal',
                isUnlocked: false,
                progress: 65,
                points: 50
            },
            {
                id: 5,
                title: 'Super Saver',
                description: 'Save 25% of your income for 3 months',
                type: 'savings',
                isUnlocked: false,
                progress: 10,
                points: 100
            }
        ];
    }
    
    // Helper function to show notifications
    function showNotification(message, type = 'info') {
        // Use the global notification function if available
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        
        // Fallback notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
});