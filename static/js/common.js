document.addEventListener('DOMContentLoaded', function() {
    // Session timeout check (30 minutes)
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
    let sessionTimer;

    function resetSessionTimer() {
        clearTimeout(sessionTimer);
        sessionTimer = setTimeout(() => {
            // Redirect to login page when session expires
            window.location.href = '/login';
        }, SESSION_TIMEOUT);
    }

    // Reset timer on user activity
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
        document.addEventListener(event, resetSessionTimer);
    });

    // Initial timer start
    resetSessionTimer();
    
    // The global showNotification function is defined at the bottom of this file
    
    // Currency symbols mapping
    const CURRENCY_SYMBOLS = {
        'INR': '₹',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': 'CA$',
        'AUD': 'A$'
    };
    
    // Theme toggling - Enhanced with sliding animation
    const themeToggle = document.querySelector('.theme-toggle');
    const themeButtons = document.querySelectorAll('.theme-btn');
    const body = document.body;
    
    // Initialize theme toggle state based on current theme
    const currentTheme = body.getAttribute('data-theme') || 'light';
    if (currentTheme === 'dark') {
        themeToggle.classList.add('dark-mode');
    }
    
    // Toggle theme when clicking the container
    themeToggle.addEventListener('click', (e) => {
        const isDarkMode = body.getAttribute('data-theme') === 'dark';
        const newTheme = isDarkMode ? 'light' : 'dark';
        
        // Toggle the dark-mode class for the sliding animation
        if (newTheme === 'dark') {
            themeToggle.classList.add('dark-mode');
        } else {
            themeToggle.classList.remove('dark-mode');
        }
        
        // Set the theme
        body.setAttribute('data-theme', newTheme);
        
        // Update active state on buttons
        themeButtons.forEach(btn => {
            if (btn.getAttribute('data-theme') === newTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Save theme preference
        localStorage.setItem('theme', newTheme);
        
        // Update charts if they exist
        updateChartsTheme(newTheme);
    });
    
    // Individual button clicks (for backward compatibility)
    themeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the container click event
            const theme = button.getAttribute('data-theme');
            
            // Toggle the dark-mode class for the sliding animation
            if (theme === 'dark') {
                themeToggle.classList.add('dark-mode');
            } else {
                themeToggle.classList.remove('dark-mode');
            }
            
            body.setAttribute('data-theme', theme);
            
            // Update active state
            themeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Save theme preference
            localStorage.setItem('theme', theme);
            
            // Update charts if they exist
            updateChartsTheme(theme);
        });
    });
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
        
        // Set the toggle state
        if (savedTheme === 'dark') {
            themeToggle.classList.add('dark-mode');
        } else {
            themeToggle.classList.remove('dark-mode');
        }
        
        // Set active button
        themeButtons.forEach(btn => {
            if (btn.getAttribute('data-theme') === savedTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update charts if they exist
        updateChartsTheme(savedTheme);
    }
    
    // Profile dropdown
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const profileUpdateBtn = document.getElementById('profileUpdateBtn');
    const profileSetup = document.getElementById('profileSetup');
    const closeProfileSetupBtns = document.querySelectorAll('.close-profile-setup');
    const profileForm = document.getElementById('profileForm');
    
    // Handle profile dropdown toggle
    if (profileDropdownBtn && profileDropdown) {
        profileDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!profileDropdown.contains(e.target) && !profileDropdownBtn.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }
    
    // Handle profile update click
    if (profileUpdateBtn && profileSetup) {
        profileUpdateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Close dropdown
            profileDropdown.classList.remove('active');
            
            // Load user profile data before showing the modal
            loadUserProfile();
            
            // Show profile setup modal with flex display
            profileSetup.style.display = 'flex';
            
            // Add active class to the modal for animation
            setTimeout(() => {
                profileSetup.classList.add('active');
            }, 10);
        });
    }
    
    // Close profile setup modal
    if (closeProfileSetupBtns.length > 0 && profileSetup) {
        closeProfileSetupBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                profileSetup.classList.remove('active');
                setTimeout(() => {
                    profileSetup.style.display = 'none';
                }, 300);
            });
        });
        
        // Close modal when clicking outside the content
        profileSetup.addEventListener('click', function(e) {
            if (e.target === profileSetup) {
                profileSetup.classList.remove('active');
                setTimeout(() => {
                    profileSetup.style.display = 'none';
                }, 300);
            }
        });
    }
    
    // Currency selection in profile form
    const currencySelect = document.getElementById('currency');
    
    if (currencySelect) {
        currencySelect.addEventListener('change', () => {
            updatePlaceholders();
        });
    }
    
    // Update input placeholders based on currency
    function updatePlaceholders() {
        if (!currencySelect) return;
        
        const selectedCurrency = currencySelect.value;
        const symbol = CURRENCY_SYMBOLS[selectedCurrency] || '₹';
        
        const monthlyIncomeInput = document.getElementById('monthlyIncome');
        const savingsGoalInput = document.getElementById('savingsGoal');
        const emergencyFundInput = document.getElementById('emergencyFund');
        
        if (monthlyIncomeInput) {
            monthlyIncomeInput.placeholder = `${symbol} Enter amount`;
        }
        if (savingsGoalInput) {
            savingsGoalInput.placeholder = `${symbol} Enter amount`;
        }
        if (emergencyFundInput) {
            emergencyFundInput.placeholder = `${symbol} Enter amount`;
        }
    }
    
    // Load user profile data
    async function loadUserProfile() {
        if (!profileForm) return;
        
        try {
            const response = await fetch('/api/profile');
            if (!response.ok) throw new Error('Failed to fetch profile data');
            
            const data = await response.json();
            
            if (data.success && data.profile) {
                const profile = data.profile;
                
                // Set form values
                if (currencySelect) {
                    currencySelect.value = profile.currency || 'INR';
                    // Update placeholders with the currency symbol
                    updatePlaceholders();
                }
                
                const monthlyIncomeInput = document.getElementById('monthlyIncome');
                const savingsGoalInput = document.getElementById('savingsGoal');
                const emergencyFundInput = document.getElementById('emergencyFund');
                
                if (monthlyIncomeInput && profile.monthlyIncome) {
                    monthlyIncomeInput.value = profile.monthlyIncome;
                }
                if (savingsGoalInput && profile.savingsGoal) {
                    savingsGoalInput.value = profile.savingsGoal;
                }
                if (emergencyFundInput && profile.emergencyFund) {
                    emergencyFundInput.value = profile.emergencyFund;
                }
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }
    
    // Profile form submission
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currency = document.getElementById('currency').value;
            const monthlyIncome = document.getElementById('monthlyIncome').value.replace(/[^0-9.]/g, '');
            const savingsGoal = document.getElementById('savingsGoal').value.replace(/[^0-9.]/g, '');
            const emergencyFund = document.getElementById('emergencyFund').value.replace(/[^0-9.]/g, '');
            
            // Validate inputs
            if (isNaN(parseFloat(monthlyIncome)) || isNaN(parseFloat(savingsGoal)) || isNaN(parseFloat(emergencyFund))) {
                showNotification('Please enter valid amounts for all fields', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/update-profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        currency,
                        monthlyIncome: parseFloat(monthlyIncome),
                        savingsGoal: parseFloat(savingsGoal),
                        emergencyFund: parseFloat(emergencyFund),
                        financialGoal: '' // Send an empty string since we removed this field
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Hide the modal
                    profileSetup.style.display = 'none';
                    
                    showNotification('Financial profile updated successfully', 'success');
                    
                    // Reload the page to reflect changes
                    window.location.reload();
                } else {
                    showNotification(data.message || 'Error updating profile', 'error');
                }
            } catch (error) {
                console.error('Error saving financial profile:', error);
                showNotification('An error occurred while saving your financial profile', 'error');
            }
        });
    }
    
    // Initialize placeholders
    updatePlaceholders();
    
    // Update currency display throughout the app
    function updateCurrencyDisplay(currency) {
        const currencyDisplays = document.querySelectorAll('.currency-indicator, #currencyDisplay');
        const symbol = CURRENCY_SYMBOLS[currency] || '₹';
        
        currencyDisplays.forEach(element => {
            element.textContent = currency;
        });
        
        const symbolElements = document.querySelectorAll('.currency-symbol');
        symbolElements.forEach(element => {
            element.textContent = symbol;
        });
    }
    
    // Check and load user profile on page load
    loadUserProfile();
    
    // Update financial advice on load
    updateFinancialAdvice();
    
    // Standardized notification function for all alerts across the app
    window.showNotification = function(message, type = 'info') {
        // Create a notification container if it doesn't exist
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.position = 'fixed';
            notificationContainer.style.top = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.zIndex = '9999';
            notificationContainer.style.width = '300px';
            document.body.appendChild(notificationContainer);
        }
        
        // Create a new flash message element
        const notification = document.createElement('div');
        notification.className = `flash-message ${type}`;
        notification.style.position = 'relative';
        notification.style.marginBottom = '10px';
        notification.style.padding = '15px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        notification.style.animation = 'fadeIn 0.5s ease forwards';
        
        // Set background color based on type
        if (type === 'success') {
            notification.style.backgroundColor = '#28a745';
            notification.style.color = 'white';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#dc3545';
            notification.style.color = 'white';
        } else if (type === 'warning') {
            notification.style.backgroundColor = '#ffc107';
            notification.style.color = 'black';
        } else {
            notification.style.backgroundColor = '#17a2b8';
            notification.style.color = 'white';
        }
        
        notification.innerHTML = `
            <div style="padding-right: 20px;">${message}</div>
            <button class="close-notification" style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: inherit; cursor: pointer; font-size: 18px;">×</button>
        `;

        // Add to the notification container
        notificationContainer.appendChild(notification);

        // Add event listener to the close button
        const closeBtn = notification.querySelector('.close-notification');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.style.animation = 'fadeOut 0.5s ease forwards';
                setTimeout(() => {
                    notification.remove();
                }, 500);
            });
        }

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 7000);  // Extended time to 7 seconds so users can read the message
    };
    
    // Update chart themes if they exist
    function updateChartsTheme(theme) {
        if (window.trendChart) {
            updateChartTheme(window.trendChart, theme);
        }
        if (window.incomeExpenseChart) {
            updateChartTheme(window.incomeExpenseChart, theme);
        }
        if (window.savingsProgressChart) {
            updateChartTheme(window.savingsProgressChart, theme);
        }
        if (window.expenseCategoryChart) {
            updateChartTheme(window.expenseCategoryChart, theme);
        }
    }
    
    function updateChartTheme(chart, theme) {
        const textColor = theme === 'dark' ? '#f5f5f5' : '#333333';
        const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        
        chart.options.scales.x.grid.color = gridColor;
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.y.grid.color = gridColor;
        chart.options.scales.y.ticks.color = textColor;
        chart.options.plugins.legend.labels.color = textColor;
        chart.update();
    }
    
    // Update financial advice on the dashboard
    function updateFinancialAdvice() {
        const aiAdviceElement = document.querySelector('.ai-advice p');
        if (!aiAdviceElement) return;
        
        // First try to get profile from API
        fetch('/api/profile')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.profile) {
                    generateAndDisplayAdvice(data.profile);
                } else {
                    // Fall back to local storage if API fails
                    const profileData = localStorage.getItem('userProfile');
                    if (profileData) {
                        generateAndDisplayAdvice(JSON.parse(profileData));
                    } else {
                        aiAdviceElement.textContent = "To get personalized financial advice, please complete your financial profile.";
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching profile:', error);
                // Fall back to local storage
                const profileData = localStorage.getItem('userProfile');
                if (profileData) {
                    generateAndDisplayAdvice(JSON.parse(profileData));
                } else {
                    aiAdviceElement.textContent = "To get personalized financial advice, please complete your financial profile.";
                }
            });
    }
    
    function generateAndDisplayAdvice(profile) {
        const aiAdviceElement = document.querySelector('.ai-advice p');
        if (!aiAdviceElement) return;
        
        // Get current month and year
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'long' });
        
        // Generate different advice messages
        const adviceMessages = [
            {
                condition: profile => !profile.monthlyIncome || profile.monthlyIncome <= 0,
                message: "Please update your monthly income to receive personalized financial advice."
            },
            {
                condition: profile => profile.emergencyFund < profile.monthlyIncome * 3,
                message: `Your emergency fund is below the recommended amount. Consider setting aside at least 3-6 months of expenses (about ${profile.currencySymbol || '₹'}${(profile.monthlyIncome * 3).toFixed(2)}) to protect against unexpected events.`
            },
            {
                condition: profile => profile.savingsGoal < (profile.monthlyIncome * 0.2),
                message: `For ${currentMonth}, try increasing your savings target. Financial experts recommend saving at least 20% of your income for future goals.`
            },
            {
                condition: profile => true, // Default advice
                message: `Welcome to ${currentMonth}'s financial overview! Remember to regularly track your expenses and look for opportunities to reduce unnecessary spending.`
            }
        ];
        
        // Find the first applicable advice
        const applicableAdvice = adviceMessages.find(advice => advice.condition(profile));
        aiAdviceElement.textContent = applicableAdvice.message;
    }

    // Handle flash messages
    const flashMessages = document.querySelectorAll('.flashed-messages .alert');
    flashMessages.forEach(message => {
        // Add CSS transition properties
        message.style.transition = 'all 0.3s ease-in-out';
        message.style.opacity = '1';
        message.style.transform = 'translateY(0)';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            message.style.opacity = '0';
            message.style.transform = 'translateY(-20px)';
            
            // Remove from DOM after animation completes
            setTimeout(() => {
                const parent = message.parentElement;
                message.remove();
                // If no more flash messages, remove the container
                if (parent && parent.children.length === 0) {
                    parent.remove();
                }
            }, 300);
        }, 5000);
    });
    
    // Global notification function
    window.showNotification = function(message, type = 'info') {
        console.log('showNotification called with:', message, type);
        
        // First, remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Create the notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to the body
        document.body.appendChild(notification);
        console.log('Notification created:', notification);
        
        // Trigger animation after a brief delay to ensure proper rendering
        setTimeout(() => {
            notification.classList.add('show');
            console.log('Notification show class added');
        }, 10);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
        
        return notification;
    };
});
