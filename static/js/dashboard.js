document.addEventListener('DOMContentLoaded', () => {
    console.log("[DEBUG] DOM content loaded");
    
    // DIAGNOSTIC: Direct click handler for trend buttons
    setTimeout(() => {
        console.log("[DIAGNOSTIC] Setting up direct button handlers for debugging");
        
        // Find all buttons that could control the trend chart
        const allPeriodButtons = document.querySelectorAll('.period-selector button, .trend-view button');
        console.log(`[DIAGNOSTIC] Found ${allPeriodButtons.length} period buttons:`, allPeriodButtons);
        
        allPeriodButtons.forEach(btn => {
            console.log(`[DIAGNOSTIC] Button:`, {
                text: btn.textContent.trim(),
                classes: btn.className,
                dataPeriod: btn.getAttribute('data-period'),
                dataRange: btn.getAttribute('data-range'),
                isActive: btn.classList.contains('active')
            });
            
            // Add a simple click handler to every button that logs its attributes
            btn.addEventListener('click', function(e) {
                e.preventDefault(); // For testing only
                
                console.log(`[DIAGNOSTIC] CLICK:`, {
                    button: this.textContent.trim(),
                    dataPeriod: this.getAttribute('data-period'),
                    dataRange: this.getAttribute('data-range'),
                });
                
                // Try loading trend directly with the range value
                const range = this.getAttribute('data-range') || 
                              (this.getAttribute('data-period') === 'week' ? 'weekly' : 
                               this.getAttribute('data-period') === 'month' ? 'monthly' : 
                               this.getAttribute('data-period') === 'year' ? 'yearly' : 'monthly');
                
                console.log(`[DIAGNOSTIC] Calling loadExpenseTrend directly with range=${range}`);
                
                // Set this as active
                allPeriodButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Try to call loadExpenseTrend directly
                if (typeof loadExpenseTrend === 'function') {
                    loadExpenseTrend(range);
                }
            });
        });
    }, 1000); // Wait 1 second after page load to ensure all other scripts have run
    
    // DOM Elements
    const menuToggle = document.querySelector('.menu-toggle');
    const overlay = document.querySelector('.overlay');
    const expensesList = document.getElementById('expensesList');
    const expensesTable = document.querySelector('.expenses-table tbody');
    const aiAdviceElement = document.querySelector('.ai-advice p');
    const trendChart = document.getElementById('trendChart');
    const incomeExpenseChart = document.getElementById('incomeExpenseChart');
    const savingsProgressChart = document.getElementById('savingsProgressChart');
    const trendViewButtons = document.querySelectorAll('.trend-view button');
    const changeCurrencyBtn = document.getElementById('changeCurrencyBtn');
    const currencyModal = document.getElementById('currencyModal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const periodSelectors = document.querySelectorAll('.period-selector button');
    const updateProfileBtn = document.getElementById('updateProfileBtn');
    
    // Chart elements
    const financialSummaryChart = document.getElementById('financialSummaryChart');
    const expenseDistributionChart = document.getElementById('expenseDistributionChart');
    
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
    
    // Initialize variables for charts
    window.trendChart = null;
    window.incomeExpenseChart = null;
    window.savingsProgressChart = null;
    let financialSummaryChartInstance = null;
    let expenseDistChartInstance = null;
    
    // Mobile menu toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            document.querySelector('.main-menu').classList.toggle('open');
            overlay.classList.toggle('show');
        });
    }
    
    // Close menu when clicking overlay
    if (overlay) {
        overlay.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            document.querySelector('.main-menu').classList.remove('open');
            overlay.classList.remove('show');
        });
    }
    
    // Handle currency modal
    if (changeCurrencyBtn && currencyModal) {
        changeCurrencyBtn.addEventListener('click', () => {
            loadCurrencyOptions();
            currencyModal.style.display = 'flex';
        });
        
        // Close currency modal
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                currencyModal.style.display = 'none';
            });
        });
        
        // When clicking outside the modal content, close the modal
        currencyModal.addEventListener('click', (e) => {
            if (e.target === currencyModal) {
                currencyModal.style.display = 'none';
            }
        });
        
        // Save currency button
        const saveCurrencyBtn = document.getElementById('saveCurrencyBtn');
        if (saveCurrencyBtn) {
            saveCurrencyBtn.addEventListener('click', async () => {
                const selectedCurrency = document.querySelector('input[name="currencyOption"]:checked');
                if (selectedCurrency) {
                    // Get user profile
                    try {
                        const profileResponse = await fetch('/api/profile');
                        const profileData = await profileResponse.json();
                        
                        if (profileData.success && profileData.profile) {
                            const profile = profileData.profile;
                            
                            // Update currency
                            const response = await fetch('/api/update-profile', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    currency: selectedCurrency.value,
                                    monthlyIncome: profile.monthlyIncome,
                                    savingsGoal: profile.savingsGoal,
                                    emergencyFund: profile.emergencyFund,
                                    financialGoal: profile.financialGoal
                                })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                                // Hide the modal
                                currencyModal.style.display = 'none';
                                
                                showNotification('Currency updated successfully', 'success');
                                
                                // Reload page to reflect changes
                                window.location.reload();
                            } else {
                                showNotification(data.message || 'Error updating currency', 'error');
                            }
                        }
                    } catch (error) {
                        console.error('Error updating currency:', error);
                        showNotification('An error occurred while updating currency', 'error');
                    }
                } else {
                    showNotification('Please select a currency', 'warning');
                }
            });
        }
    }
    
    // Load user profile for currency
    async function loadUserProfile() {
        try {
            const response = await fetch('/api/profile');
            if (!response.ok) throw new Error('Failed to fetch profile data');
            
            const data = await response.json();
            
            if (data.success && data.profile) {
                const profile = data.profile;
                
                // Cache profile in localStorage for other functions
                localStorage.setItem('userProfile', JSON.stringify({
                    ...profile,
                    currencySymbol: CURRENCY_SYMBOLS[profile.currency] || '₹'
                }));
                
                // Update currency display in UI
                updateCurrencyDisplay(profile.currency);
                
                return profile;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
        
        return null;
    }
    
    // Update currency display throughout the dashboard
    function updateCurrencyDisplay(currency) {
        const currencyDisplays = document.querySelectorAll('#currencyDisplay');
        const symbol = CURRENCY_SYMBOLS[currency] || '₹';
        
        currencyDisplays.forEach(element => {
            element.textContent = currency;
        });
        
        // Update tooltip callbacks in charts
        if (window.trendChart) {
            window.trendChart.options.scales.y.ticks.callback = function(value) {
                return symbol + value;
            };
            window.trendChart.options.plugins.tooltip.callbacks.label = function(context) {
                return symbol + context.parsed.y.toFixed(2);
            };
            window.trendChart.update();
        }
    }
    
    // Load currency options for the modal
    async function loadCurrencyOptions() {
        const currencyList = document.getElementById('currencyList');
        if (!currencyList) return;
        
        try {
            const response = await fetch('/api/currency-options');
            const data = await response.json();
            
            if (data.success) {
                // Get user's current currency
                const profileResponse = await fetch('/api/profile');
                const profileData = await profileResponse.json();
                const currentCurrency = profileData.success && profileData.profile ? profileData.profile.currency : 'INR';
                
                // Populate currency options
                currencyList.innerHTML = '';
                data.currencies.forEach(currency => {
                    const isSelected = currency.code === currentCurrency;
                    
                    const currencyOption = document.createElement('div');
                    currencyOption.className = 'currency-option';
                    currencyOption.innerHTML = `
                        <input type="radio" name="currencyOption" id="currency_${currency.code}" 
                               value="${currency.code}" ${isSelected ? 'checked' : ''}>
                        <label for="currency_${currency.code}">
                            <span class="currency-symbol">${currency.symbol}</span>
                            <span class="currency-name">${currency.name}</span>
                            <span class="currency-code">${currency.code}</span>
                        </label>
                    `;
                    
                    currencyList.appendChild(currencyOption);
                });
            }
        } catch (error) {
            console.error('Error loading currency options:', error);
            
            // Fallback options if API fails
            const currencies = [
                { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
                { code: 'USD', name: 'US Dollar', symbol: '$' },
                { code: 'EUR', name: 'Euro', symbol: '€' },
                { code: 'GBP', name: 'British Pound', symbol: '£' },
                { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
                { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
                { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' }
            ];
            
            // Get profile data from localStorage
            const profileData = localStorage.getItem('userProfile');
            const currentCurrency = profileData ? JSON.parse(profileData).currency : 'INR';
            
            // Populate with fallback options
            currencyList.innerHTML = '';
            currencies.forEach(currency => {
                const isSelected = currency.code === currentCurrency;
                
                const currencyOption = document.createElement('div');
                currencyOption.className = 'currency-option';
                currencyOption.innerHTML = `
                    <input type="radio" name="currencyOption" id="currency_${currency.code}" 
                            value="${currency.code}" ${isSelected ? 'checked' : ''}>
                    <label for="currency_${currency.code}">
                        <span class="currency-symbol">${currency.symbol}</span>
                        <span class="currency-name">${currency.name}</span>
                        <span class="currency-code">${currency.code}</span>
                    </label>
                `;
                
                currencyList.appendChild(currencyOption);
            });
        }
    }
    
    // Load and display recent expenses
    async function loadExpenses() {
        if (!expensesTable) return;
        
        try {
            const response = await fetch('/api/expenses?limit=5');
            const data = await response.json();
            
            if (data.success) {
                renderExpenses(data.expenses);
            } else {
                showNotification('Failed to load expenses. Please refresh the page.', 'error');
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
            renderExpenses([]); // Show empty state
        }
    }
    
    // Render expenses in table
    function renderExpenses(expenses) {
        if (!expensesTable) return;
        
        expensesTable.innerHTML = '';
        
        if (!expenses || expenses.length === 0) {
            const emptyState = document.createElement('tr');
            emptyState.innerHTML = `
                <td colspan="5" class="empty-state">
                    <div class="empty-state-content">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                        <p>No expenses yet. Add your first expense on the expenses page.</p>
                    </div>
                </td>
            `;
            expensesTable.appendChild(emptyState);
            return;
        }
        
        // Sort by date (most recent first)
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Limit to most recent 5 for the dashboard
        const recentExpenses = expenses.slice(0, 5);
        
        // Get user's currency symbol from localStorage
        const profileData = localStorage.getItem('userProfile');
        const profile = profileData ? JSON.parse(profileData) : { currency: 'INR' };
        const currencySymbol = CURRENCY_SYMBOLS[profile.currency] || '₹';
        
        recentExpenses.forEach(expense => {
            const row = document.createElement('tr');
            
            // Format date
            const expenseDate = new Date(expense.date);
            const formattedDate = expenseDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Create category element with appropriate class
            const categoryClass = expense.category.toLowerCase().replace(/\s+/g, '');
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td><span class="expense-category ${categoryClass}">${expense.category}</span></td>
                <td>${expense.description || '-'}</td>
                <td>${currencySymbol}${expense.amount.toFixed(2)}</td>
                <td>
                    <div class="expense-actions">
                        <button class="delete-expense" data-id="${expense.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    </div>
                </td>
            `;
            
            expensesTable.appendChild(row);
        });
        
        // Add delete event listeners
        document.querySelectorAll('.delete-expense').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = button.getAttribute('data-id');
                
                if (confirm('Are you sure you want to delete this expense?')) {
                    try {
                        const response = await fetch(`/api/expenses/${id}`, {
                            method: 'DELETE'
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            // Remove row
                            button.closest('tr').remove();
                            
                            // Update charts
                            loadExpenseTrend();
                            createIncomeExpenseChart();
                            createSavingsProgressChart();
                            
                            // Show success notification
                            showNotification('Expense deleted successfully', 'success');
                            
                            // If no more expenses, show empty state
                            if (expensesTable.children.length === 0) {
                                renderExpenses([]);
                            }
                        } else {
                            showNotification('Failed to delete expense. Please try again.', 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting expense:', error);
                        showNotification('Failed to delete expense. Please try again.', 'error');
                    }
                }
            });
        });
    }
    
    // Load expense trend data and render chart
    async function loadExpenseTrend(range = 'monthly') {
        console.log(`[DEBUG] Loading expense trend for range: ${range}`);
        
        // Get chart element
        const trendChartElement = document.getElementById('trendChart');
        if (!trendChartElement) {
            console.error("[DEBUG] Chart element not found");
            return;
        }
        
        // Get chart container
        const chartContainer = trendChartElement.closest('.chart-container');
        if (!chartContainer) {
            console.error("[DEBUG] Chart container not found");
            return;
        }
        
        try {
            // Show loading state
            chartContainer.classList.add('loading');
            
            // Determine API URL based on range
            let apiUrl;
            if (range === 'yearly') {
                apiUrl = '/api/yearly-summary';
            } else if (range === 'weekly') {
                apiUrl = '/api/expense-trend?range=week';
            } else { // monthly
                apiUrl = '/api/expense-trend?range=month';
            }
            
            console.log(`[DEBUG] Fetching data from URL: "${apiUrl}" for range: "${range}"`);
            
            // Fetch data from API
            console.log(`[DEBUG] Sending API request...`);
            const response = await fetch(apiUrl);
            console.log(`[DEBUG] API response status:`, response.status, response.statusText);
            
            // Remove loading state
            chartContainer.classList.remove('loading');
            
            if (!response.ok) {
                console.error(`[DEBUG] API response not OK: ${response.status} ${response.statusText}`);
                showEmptyTrend(trendChartElement);
                return;
            }
            
            const data = await response.json();
            console.log(`[DEBUG] API response data:`, JSON.stringify(data, null, 2));
            
            if (!data.success) {
                console.error(`[DEBUG] API returned error:`, data.message);
                showEmptyTrend(trendChartElement);
                return;
            }
            
            // Process data based on range
            let labels = [];
            let values = [];
            
            if (range === 'yearly') {
                // For yearly view, use month names and yearly expense data
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                values = data.expenses || [];
                
                if (!values || values.length === 0 || values.every(v => v === 0)) {
                    console.log(`[DEBUG] No data for yearly view`);
                    showEmptyTrend(trendChartElement);
                    return;
                }
            } else {
                // For weekly or monthly views
                if (!data.labels || !data.values || data.labels.length === 0) {
                    console.log(`[DEBUG] No data for ${range} view:`, data);
                    showEmptyTrend(trendChartElement);
                    return;
                }
                
                labels = data.labels;
                values = data.values.map(v => parseFloat(v) || 0);
                
                // For monthly view, add day suffix (1st, 2nd, etc.) to labels
                if (range === 'monthly') {
                    labels = labels.map(day => {
                        const num = parseInt(day);
                        const suffix = getDaySuffix(num);
                        return `${num}${suffix}`;
                    });
                }
                
                console.log(`[DEBUG] Parsed labels:`, labels);
                console.log(`[DEBUG] Parsed values:`, values);
            }
            
            console.log(`[DEBUG] Processed data:`, { labels, values });
            
            // Get chart context
            const ctx = trendChartElement.getContext('2d');

            // Destroy existing chart if it exists
            if (window.trendChart) {
                console.log(`[DEBUG] Destroying existing chart`);
                window.trendChart.destroy();
                window.trendChart = null;
            }
            
            // Clear any existing error message
            const emptyMsg = chartContainer.querySelector('.empty-distribution-message');
            if (emptyMsg) {
                emptyMsg.style.display = 'none';
            }
            
                // Get user's currency symbol
                const profileData = localStorage.getItem('userProfile');
                const profile = profileData ? JSON.parse(profileData) : { currency: 'INR' };
                const currencySymbol = CURRENCY_SYMBOLS[profile.currency] || '₹';

                // Get theme colors
                const isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
            const textColor = isDarkTheme ? '#f5f5f5' : '#333333';
            const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
            const borderColor = isDarkTheme ? '#9e85f0' : '#7e57c2';
            const backgroundColor = isDarkTheme ? 'rgba(158, 133, 240, 0.3)' : 'rgba(126, 87, 194, 0.1)';

                // Create new chart
            console.log(`[DEBUG] Creating new chart`);
            window.trendChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                    labels: labels,
                        datasets: [{
                            label: 'Expenses',
                        data: values,
                        borderColor: borderColor,
                        backgroundColor: backgroundColor,
                        borderWidth: 3,
                        pointBackgroundColor: borderColor,
                            pointHoverRadius: 6,
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                        title: {
                                display: true,
                            text: range === 'yearly' ? 'Yearly Expenses' : 
                                 range === 'weekly' ? 'Weekly Expenses' : 'Monthly Expenses',
                                    font: {
                                size: 16,
                                weight: 'bold'
                            },
                            color: textColor
                            },
                            tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${currencySymbol}${context.parsed.y.toFixed(2)}`;
                                }
                            },
                            backgroundColor: isDarkTheme ? '#2c2c40' : '#ffffff',
                                titleColor: textColor,
                                bodyColor: textColor,
                                borderColor: gridColor,
                            borderWidth: 1
                            }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    color: textColor,
                                    font: {
                                    size: 12,
                                    weight: 'bold'
                                },
                                // Adjust rotation based on view type
                                maxRotation: range === 'monthly' ? 0 : 0,
                                minRotation: 0
                            },
                            grid: {
                                color: gridColor,
                                lineWidth: 1
                                }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: textColor,
                                    font: {
                                    size: 12,
                                    weight: 'bold'
                                    },
                                    callback: function(value) {
                                        return `${currencySymbol}${value}`;
                                    }
                            },
                            grid: {
                                color: gridColor,
                                lineWidth: 1
                                }
                            }
                        }
                    }
                });
            
            console.log(`[DEBUG] Chart created successfully`);
        } catch (error) {
            console.error(`[DEBUG] Error loading expense trend:`, error);
            showEmptyTrend(trendChartElement);
        }
    }
    
    // Helper function to get day suffix (1st, 2nd, 3rd, etc.)
    function getDaySuffix(day) {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }
    
    // Show empty trend state
    function showEmptyTrend(chartElement) {
        console.log("[DEBUG] Showing empty trend state");
        
        // Ensure we have the chart element
        if (!chartElement) {
            chartElement = document.getElementById('trendChart');
            if (!chartElement) {
                console.error("[DEBUG] Chart element not found for empty state");
                return;
            }
        }
        
        // Get the chart container
        const chartContainer = chartElement.closest('.chart-container');
        if (!chartContainer) {
            console.error("[DEBUG] Chart container not found for empty state");
            return;
        }
        
        // Destroy existing chart if it exists
        if (window.trendChart) {
            console.log("[DEBUG] Destroying existing chart for empty state");
            window.trendChart.destroy();
            window.trendChart = null;
        }
        
        // Check if we already have an empty message
        let emptyMsg = chartContainer.querySelector('.empty-distribution-message');
        
        if (!emptyMsg) {
            // Create empty message if it doesn't exist
            emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-distribution-message';
            emptyMsg.style.position = 'absolute';
            emptyMsg.style.top = '50%';
            emptyMsg.style.left = '50%';
            emptyMsg.style.transform = 'translate(-50%, -50%)';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.width = '100%';
            emptyMsg.innerHTML = '<p>No expense data available for this period</p>';
            
            // Ensure chart container has position relative for absolute positioning
            chartContainer.style.position = 'relative';
            
            // Append to container
            chartContainer.appendChild(emptyMsg);
        } else {
            // Show existing message
            emptyMsg.style.display = 'block';
        }
        
        console.log("[DEBUG] Empty trend message displayed");
    }
    
    // Create income vs expense donut chart
    async function createIncomeExpenseChart() {
        if (!incomeExpenseChart) return;
        
        const chartContext = incomeExpenseChart.getContext('2d');
        
        try {
            // Get user profile data for monthly income
            const profileResponse = await fetch('/api/profile');
            const profileData = await profileResponse.json();
            
            if (!profileData.success || !profileData.profile) {
                console.error('Failed to load profile data');
                return;
            }
            
            const profile = profileData.profile;
            const monthlyIncome = profile.monthlyIncome || 0;
            
            // Get total expenses for the current month
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            
            const expenseResponse = await fetch(`/api/monthly-expenses?month=${currentMonth}&year=${currentYear}`);
            const expenseData = await expenseResponse.json();
            
            if (!expenseData.success) {
                console.error('Failed to load expense data');
                return;
            }
            
            const totalExpenses = expenseData.total || 0;
            const remaining = Math.max(0, monthlyIncome - totalExpenses);
            
            // Get theme for styling
            const isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
            const textColor = isDarkTheme ? '#f5f5f5' : '#333333';
            
            // Get currency symbol
            const currencySymbol = CURRENCY_SYMBOLS[profile.currency] || '₹';
            
            // Update balance display
            const balanceValue = document.getElementById('balanceValue');
            if (balanceValue) {
                balanceValue.textContent = `${currencySymbol} ${remaining.toFixed(2)}`;
            }
            
            // If no data (both zero), show placeholder
            if (totalExpenses === 0 && monthlyIncome === 0) {
                if (window.incomeExpenseChart) {
                    window.incomeExpenseChart.destroy();
                }
                
                window.incomeExpenseChart = new Chart(chartContext, {
                    type: 'doughnut',
                    data: {
                        labels: ['No Data'],
                        datasets: [{
                            data: [1],
                            backgroundColor: ['#e0e0e0'],
                            borderWidth: 0,
                            cutout: '75%'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                enabled: false
                            }
                        }
                    }
                });
                
                return;
            }
            
            // Destroy previous chart if it exists
            if (window.incomeExpenseChart) {
                window.incomeExpenseChart.destroy();
            }
            
            // Create new chart
            window.incomeExpenseChart = new Chart(chartContext, {
                type: 'doughnut',
                data: {
                    labels: ['Expenses', 'Remaining'],
                    datasets: [{
                        data: [totalExpenses, remaining],
                        backgroundColor: [
                            '#ef4444', // Red for expenses
                            '#10b981'  // Green for remaining
                        ],
                        borderWidth: 0,
                        cutout: '75%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + '₹' + context.raw.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating income expense chart:', error);
            
            // Create fallback empty chart
            if (window.incomeExpenseChart) {
                window.incomeExpenseChart.destroy();
            }
            
            window.incomeExpenseChart = new Chart(chartContext, {
                type: 'doughnut',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e0e0e0'],
                        borderWidth: 0,
                        cutout: '75%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: false
                        }
                    }
                }
            });
        }
    }
    
    // Create savings progress donut chart
    async function createSavingsProgressChart() {
        if (!savingsProgressChart) return;
        
        const chartContext = savingsProgressChart.getContext('2d');
        
        try {
            // Get user profile data for savings goal
            const profileResponse = await fetch('/api/profile');
            const profileData = await profileResponse.json();
            
            if (!profileData.success || !profileData.profile) {
                console.error('Failed to load profile data');
                return;
            }
            
            const profile = profileData.profile;
            const savingsGoal = profile.savingsGoal || 0;
            
            // Calculate current savings based on income - expenses
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            
            const expenseResponse = await fetch(`/api/monthly-expenses?month=${currentMonth}&year=${currentYear}`);
            const expenseData = await expenseResponse.json();
            
            if (!expenseData.success) {
                console.error('Failed to load expense data');
                return;
            }
            
            const totalExpenses = expenseData.total || 0;
            const currentSavings = Math.max(0, profile.monthlyIncome - totalExpenses);
            const savingsPercentage = savingsGoal > 0 ? Math.min(100, (currentSavings / savingsGoal) * 100) : 0;
            const remainingGoal = Math.max(0, savingsGoal - currentSavings);
            
            // Update savings percentage display
            const savingsPercentageElement = document.getElementById('savingsPercentage');
            if (savingsPercentageElement) {
                savingsPercentageElement.textContent = savingsPercentage.toFixed(0) + '%';
            }
            
            // If no savings goal, show placeholder
            if (savingsGoal === 0) {
                if (window.savingsProgressChart) {
                    window.savingsProgressChart.destroy();
                }
                
                window.savingsProgressChart = new Chart(chartContext, {
                    type: 'doughnut',
                    data: {
                        labels: ['No Data'],
                        datasets: [{
                            data: [1],
                            backgroundColor: ['#e0e0e0'],
                            borderWidth: 0,
                            cutout: '75%'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                enabled: false
                            }
                        }
                    }
                });
                
                return;
            }
            
            // Get theme for styling
            const isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
            const textColor = isDarkTheme ? '#f5f5f5' : '#333333';
            
            // Get currency symbol
            const currencySymbol = CURRENCY_SYMBOLS[profile.currency] || '₹';
            
            // Destroy previous chart if it exists
            if (window.savingsProgressChart) {
                window.savingsProgressChart.destroy();
            }
            
            // Create new chart
            window.savingsProgressChart = new Chart(chartContext, {
                type: 'doughnut',
                data: {
                    labels: ['Current Savings', 'Remaining Goal'],
                    datasets: [{
                        data: [currentSavings, remainingGoal],
                        backgroundColor: [
                            '#3b82f6', // Blue for current savings
                            '#e5e7eb'  // Light gray for remaining
                        ],
                        borderWidth: 0,
                        cutout: '75%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + '₹' + context.raw.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating savings progress chart:', error);
            
            // Create fallback empty chart
            if (window.savingsProgressChart) {
                window.savingsProgressChart.destroy();
            }
            
            window.savingsProgressChart = new Chart(chartContext, {
                type: 'doughnut',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e0e0e0'],
                        borderWidth: 0,
                        cutout: '75%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: false
                        }
                    }
                }
            });
        }
    }
    
    // Initialize Financial Summary Chart (Line Chart)
    function initFinancialSummaryChart() {
        if (financialSummaryChartInstance) {
            financialSummaryChartInstance.destroy();
        }

        const ctx = financialSummaryChart.getContext('2d');
        
        // Get currency symbol
        const profileData = localStorage.getItem('userProfile');
        const profile = profileData ? JSON.parse(profileData) : { currency: 'INR' };
        const currencySymbol = CURRENCY_SYMBOLS[profile.currency] || '₹';
        
        // Get theme colors - improve visibility for both light and dark modes
        const isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDarkTheme ? '#f5f5f5' : '#333333';
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
        const backgroundColor = isDarkTheme ? '#2c2c40' : '#ffffff';

        // Create new chart with improved visibility settings
        financialSummaryChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                    {
                        label: 'Expenses',
                        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        borderColor: isDarkTheme ? '#FF8585' : '#FF6B6B',
                        backgroundColor: isDarkTheme ? 'rgba(255, 133, 133, 0.3)' : 'rgba(255, 107, 107, 0.2)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Savings',
                        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        borderColor: isDarkTheme ? '#81C784' : '#4CAF50',
                        backgroundColor: isDarkTheme ? 'rgba(129, 199, 132, 0.3)' : 'rgba(76, 175, 80, 0.2)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: textColor,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: backgroundColor,
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: gridColor,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${currencySymbol}${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: gridColor,
                            lineWidth: 1
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: gridColor,
                            lineWidth: 1
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                weight: 'bold'
                            },
                            callback: function(value) {
                                return `${currencySymbol}${value}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Update the chart with actual data
    async function updateFinancialSummaryChart() {
        if (!financialSummaryChartInstance) return;

        try {
            // Get currency info
            const profileData = localStorage.getItem('userProfile');
            const profile = profileData ? JSON.parse(profileData) : { currency: 'INR' };
            const currencySymbol = CURRENCY_SYMBOLS[profile.currency] || '₹';

            // Fetch monthly expense data for the year
            const response = await fetch('/api/yearly-summary');
            const data = await response.json();

            if (data.success) {
                // Update chart data
                financialSummaryChartInstance.data.datasets[0].data = data.expenses;
                financialSummaryChartInstance.data.datasets[1].data = data.savings;
                financialSummaryChartInstance.update();

                // Update summary metrics
                const now = new Date();
                const currentMonth = now.getMonth();
                const totalExpenses = data.expenses[currentMonth] || 0;
                const monthlySavings = data.savings[currentMonth] || 0;
                const monthlyIncome = totalExpenses + monthlySavings;

                // Update metric displays
                const expenseValue = document.querySelector('.expense-value');
                const incomeValue = document.querySelector('.income-value');
                const savingsValue = document.querySelector('.savings-value');

                if (expenseValue) expenseValue.textContent = `${currencySymbol}${totalExpenses.toFixed(2)}`;
                if (incomeValue) incomeValue.textContent = `${currencySymbol}${monthlyIncome.toFixed(2)}`;
                if (savingsValue) savingsValue.textContent = `${currencySymbol}${monthlySavings.toFixed(2)}`;
            } else {
                // If API fails, use dummy data
                const dummyExpenses = [5000, 4800, 5200, 5400, 6000, 6200, 6000, 5800, 6200, 6100, 5900, 6200];
                const dummySavings = [3000, 3200, 3100, 3300, 3500, 3400, 3600, 3800, 3900, 4000, 4200, 4380];
                const currentMonth = new Date().getMonth();
                
                financialSummaryChartInstance.data.datasets[0].data = dummyExpenses;
                financialSummaryChartInstance.data.datasets[1].data = dummySavings;
                financialSummaryChartInstance.update();

                // Update the metrics with current month's data
                const expenseValue = document.querySelector('.expense-value');
                const incomeValue = document.querySelector('.income-value');
                const savingsValue = document.querySelector('.savings-value');

                if (expenseValue) expenseValue.textContent = `${currencySymbol}${dummyExpenses[currentMonth].toFixed(2)}`;
                if (incomeValue) incomeValue.textContent = `${currencySymbol}${(dummyExpenses[currentMonth] + dummySavings[currentMonth]).toFixed(2)}`;
                if (savingsValue) savingsValue.textContent = `${currencySymbol}${dummySavings[currentMonth].toFixed(2)}`;
            }
        } catch (error) {
            console.error('Error updating financial summary chart:', error);
            
            // Use dummy data on error
            const dummyExpenses = [5000, 4800, 5200, 5400, 6000, 6200, 6000, 5800, 6200, 6100, 5900, 6200];
            const dummySavings = [3000, 3200, 3100, 3300, 3500, 3400, 3600, 3800, 3900, 4000, 4200, 4380];
            
            financialSummaryChartInstance.data.datasets[0].data = dummyExpenses;
            financialSummaryChartInstance.data.datasets[1].data = dummySavings;
            financialSummaryChartInstance.update();
        }
    }
    
    // Initialize Expense Distribution Chart (now a trend line chart)
    async function initExpenseDistributionChart(period = 'month') {
        if (!expenseDistributionChart) {
            console.error("Expense distribution chart element not found");
            return;
        }

        try {
            const response = await fetch(`/api/expense-trend?range=${period}`);
            const data = await response.json();

            if (data.success) {
                // Get user's currency symbol
            const profileData = localStorage.getItem('userProfile');
            const profile = profileData ? JSON.parse(profileData) : { currency: 'INR' };
            const currencySymbol = CURRENCY_SYMBOLS[profile.currency] || '₹';
        
        // Get theme colors
        const isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDarkTheme ? '#e0e0e0' : '#333333';
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const backgroundColor = isDarkTheme ? '#2c2c40' : '#ffffff';
        
                // Destroy existing chart if it exists
                if (expenseDistChartInstance) {
                    expenseDistChartInstance.destroy();
                }

                // Create new chart
                expenseDistChartInstance = new Chart(expenseDistributionChart.getContext('2d'), {
                type: 'line',
                data: {
                        labels: data.labels || [],
                    datasets: [{
                        label: 'Expenses',
                            data: data.values || [],
                        borderColor: '#7e57c2',
                        backgroundColor: 'rgba(126, 87, 194, 0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: '#7e57c2',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: textColor,
                                font: {
                                    size: 12,
                                    family: "'Inter', sans-serif"
                                }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: backgroundColor,
                            titleColor: textColor,
                            bodyColor: textColor,
                            borderColor: gridColor,
                            borderWidth: 1,
                            padding: 10,
                            callbacks: {
                                label: function(context) {
                                    return `${currencySymbol}${context.raw.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: gridColor
                            },
                            ticks: {
                                color: textColor,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: gridColor
                            },
                            ticks: {
                                color: textColor,
                                font: {
                                    size: 12
                                },
                                callback: function(value) {
                                    return `${currencySymbol}${value}`;
                                }
                            }
                        }
                    }
                }
            });
            
                // Hide empty state message if it exists
            const emptyMsg = document.querySelector('.empty-distribution-message');
            if (emptyMsg) {
                emptyMsg.style.display = 'none';
            }
            
                console.log("Expense distribution chart created successfully");
            } else {
                console.error("Failed to load expense trend data");
                showEmptyTrend();
            }
        } catch (error) {
            console.error('Error creating expense distribution chart:', error);
            showEmptyTrend();
        }
    }

    // Load recent expenses
    function loadRecentExpenses() {
        console.log("Loading recent expenses");
        const recentExpensesContainer = document.getElementById('recentExpensesList');
        
        // Show loading state
        recentExpensesContainer.innerHTML = '<tr><td colspan="5" class="loading">Loading recent expenses...</td></tr>';
        
        fetch('/api/recent-expenses')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch recent expenses');
                }
                return response.json();
            })
            .then(data => {
                recentExpensesContainer.innerHTML = '';
                
                if (!data || data.length === 0) {
                    recentExpensesContainer.innerHTML = '<tr><td colspan="5" class="empty-state">No recent expenses found.</td></tr>';
            return;
        }
        
                // Render each expense
                data.forEach((expense, index) => {
            // Format date
            const expenseDate = new Date(expense.date);
            const formattedDate = expenseDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
                    // Create category element with appropriate class
                    const categoryClass = expense.category.toLowerCase().replace(/\s+/g, '');
            
                    const row = document.createElement('tr');
            row.innerHTML = `
                        <td>${index + 1}</td>
                <td>${formattedDate}</td>
                        <td><span class="expense-category ${categoryClass}">${expense.category}</span></td>
                        <td>${expense.description || '-'}</td>
                        <td>₹${expense.amount.toFixed(2)}</td>
                    `;
                    
                    recentExpensesContainer.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error loading recent expenses:', error);
                recentExpensesContainer.innerHTML = '<tr><td colspan="5" class="error">Failed to load recent expenses. Please try again later.</td></tr>';
            });
    }

    // Initialize all charts and data
    async function initDashboard() {
        try {
            console.log(`[DEBUG] Initializing dashboard...`);
            
            // Load user profile first
            try {
                const profile = await loadUserProfile();
                console.log(`[DEBUG] User profile loaded:`, profile ? 'success' : 'failed');
            } catch (profileError) {
                console.error('[DEBUG] Error loading user profile:', profileError);
                // Continue initialization even if profile fails
            }
            
            // Initialize the financial summary chart
            try {
                if (typeof initFinancialSummaryChart === 'function') {
                    initFinancialSummaryChart();
                    if (typeof updateFinancialSummaryChart === 'function') {
                        await updateFinancialSummaryChart();
                        console.log(`[DEBUG] Financial summary chart updated`);
                    }
                }
            } catch (chartError) {
                console.error('[DEBUG] Error initializing financial summary chart:', chartError);
                // Continue with other initializations
            }
            
            // Set up period buttons for trend chart
            try {
                if (typeof setupPeriodButtons === 'function') {
                    setupPeriodButtons();
                }
            } catch (buttonError) {
                console.error('[DEBUG] Error setting up period buttons:', buttonError);
            }
            
            // Set default period to month
            try {
                const monthButton = document.querySelector('.trend-view .period-button[data-period="month"]');
                if (monthButton) {
                    console.log(`[DEBUG] Setting default period to monthly`);
                    document.querySelectorAll('.trend-view .period-button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    monthButton.classList.add('active');
                    
                    // Load initial trend chart with monthly data
                    if (typeof loadExpenseTrend === 'function') {
                        loadExpenseTrend('monthly');
                        console.log(`[DEBUG] Initial expense trend chart loaded (monthly)`);
                    }
                }
            } catch (trendError) {
                console.error('[DEBUG] Error setting up trend chart:', trendError);
            }
            
            // Load recent expenses
            try {
                if (typeof loadRecentExpenses === 'function') {
                    await loadRecentExpenses();
                    console.log(`[DEBUG] Recent expenses loaded`);
                }
            } catch (expensesError) {
                console.error('[DEBUG] Error loading recent expenses:', expensesError);
            }
            
            console.log(`[DEBUG] Dashboard initialization complete`);
        } catch (error) {
            console.error(`[DEBUG] Error initializing dashboard:`, error);
        }
    }

    // Set up period buttons for trend chart
    function setupPeriodButtons() {
        console.log(`[DEBUG] Setting up period buttons`);
        
        const periodButtons = document.querySelectorAll('.trend-view .period-button');
        
        // Remove any existing event listeners by cloning and replacing
        periodButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add new event listener
            newButton.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.trend-view .period-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Get period value
                const period = this.getAttribute('data-period');
                const range = period === 'week' ? 'weekly' : 
                             period === 'month' ? 'monthly' : 'yearly';
                
                console.log(`[DEBUG] Period button clicked: ${period} (${range})`);
                
                // Load trend chart with selected period
                loadExpenseTrend(range);
            });
        });
        
        console.log(`[DEBUG] Period buttons setup complete`);
    }

    // Start the dashboard when the DOM is loaded
    initDashboard();

    // Handle Update Profile button click
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', () => {
            // Check if profile dropdown exists in the layout
            const profileDropdown = document.getElementById('profileDropdown');
            if (profileDropdown) {
                // Show profile dropdown
                profileDropdown.classList.add('show');
                
                // Click the profile update menu item
                const profileUpdateLink = document.querySelector('[data-option="profile-update"]');
                if (profileUpdateLink) {
                    profileUpdateLink.click();
                }
            } else {
                // Fallback - show notification to user
                showNotification('Please use the profile icon in the header to update your profile', 'info');
            }
        });
    }

    // Show notification
    function showNotification(message, type = 'info') {
        // Use the global notification function if available
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        // Fallback notification using the standardized flash-message style
        const notification = document.createElement('div');
        notification.className = `flash-message ${type}`;
        notification.innerHTML = `
            ${message}
            <button class="close-notification" style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: white; cursor: pointer;">×</button>
        `;

        // Add to the body
        document.body.appendChild(notification);

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
    }, 5000);
}
});
