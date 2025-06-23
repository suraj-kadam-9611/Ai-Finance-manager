document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileForm');
    const profileSetup = document.getElementById('profileSetup');
    
    if (profileForm) {
        console.log('[DEBUG] Setting up profile form submission handler');
        
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('[DEBUG] Profile form submitted');
            
            // Get form data
            const formData = {
                currency: document.getElementById('currency').value,
                monthlyIncome: parseFloat(document.getElementById('monthlyIncome').value.replace(/[^0-9.-]+/g, '')),
                savingsGoal: parseFloat(document.getElementById('savingsGoal').value.replace(/[^0-9.-]+/g, '')),
                emergencyFund: parseFloat(document.getElementById('emergencyFund').value.replace(/[^0-9.-]+/g, ''))
            };
            
            // Validate form data
            if (isNaN(formData.monthlyIncome) || formData.monthlyIncome <= 0) {
                showNotification('Please enter a valid monthly income amount.', 'error');
                return;
            }
            
            if (isNaN(formData.savingsGoal) || formData.savingsGoal <= 0) {
                showNotification('Please enter a valid savings goal amount.', 'error');
                return;
            }
            
            if (isNaN(formData.emergencyFund) || formData.emergencyFund <= 0) {
                showNotification('Please enter a valid emergency fund target amount.', 'error');
                return;
            }
            
            try {
                // Submit form data
                const response = await fetch('/api/profile/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showNotification('Profile updated successfully!', 'success');
                    
                    // Close profile setup modal
                    if (profileSetup) {
                        profileSetup.classList.remove('active');
                        setTimeout(() => {
                            profileSetup.style.display = 'none';
                        }, 300);
                    }
                    
                    // Reload page to reflect changes
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    throw new Error(data.message || 'Failed to update profile');
                }
            } catch (error) {
                console.error('[DEBUG] Error updating profile:', error);
                showNotification(error.message || 'An error occurred while updating your profile. Please try again.', 'error');
            }
        });
    }
    
    // Using the global showNotification function from common.js
});