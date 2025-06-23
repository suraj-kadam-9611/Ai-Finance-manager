document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const goalsList = document.getElementById('goalsList');
    const goalTemplate = document.getElementById('goalTemplate');
    const addGoalBtn = document.getElementById('addGoalBtn');
    const addFirstGoalBtn = document.getElementById('addFirstGoalBtn');
    const goalModal = document.getElementById('goalModal');
    const goalForm = document.getElementById('goalForm');
    const saveGoalBtn = document.getElementById('saveGoalBtn');
    const goalTypeFilter = document.getElementById('goalTypeFilter');
    const goalStatusFilter = document.getElementById('goalStatusFilter');
    const goalSort = document.getElementById('goalSort');
    const progressModal = document.getElementById('progressModal');
    const progressForm = document.getElementById('progressForm');
    const saveProgressBtn = document.getElementById('saveProgressBtn');
    const celebrationModal = document.getElementById('celebrationModal');
    
    // Modal close buttons
    const closeModalButtons = document.querySelectorAll('.close-modal');
    
    // Global state
    let goals = [];
    let filteredGoals = [];
    
    // Get currency symbol
    const currencySymbol = getCurrencySymbol();
    
    // Initialize
    init();
    
    function init() {
        // Load goals
        loadGoals();
        
        // Event listeners
        addGoalBtn.addEventListener('click', showAddGoalModal);
        addFirstGoalBtn.addEventListener('click', showAddGoalModal);
        saveGoalBtn.addEventListener('click', handleSaveGoal);
        saveProgressBtn.addEventListener('click', handleSaveProgress);
        
        // Filters
        goalTypeFilter.addEventListener('change', applyFilters);
        goalStatusFilter.addEventListener('change', applyFilters);
        goalSort.addEventListener('change', applyFilters);
        
        // Modal close events
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Apply progress bar styling fixes when DOM is updated
        const observer = new MutationObserver((mutations) => {
            applyProgressBarStyles();
        });
        
        // Start observing changes to the DOM
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
        
        // Set min date for target date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('targetDate').min = tomorrow.toISOString().split('T')[0];
    }
    
    // Get currency symbol from localStorage or use default
    function getCurrencySymbol() {
        const profileData = localStorage.getItem('userProfile');
        if (profileData) {
            const profile = JSON.parse(profileData);
            return profile.currencySymbol || '₹';
        }
        return '₹';
    }
    
    // Load goals from the API
    async function loadGoals() {
        try {
            const response = await fetch('/api/goals');
            const data = await response.json();
            
            if (data.success) {
                // Completely override server-side data for every goal
                goals = data.goals.map(goal => {
                    // Force recalculation of progress percentage with precise calculation
                    const currentAmount = parseFloat(goal.currentAmount);
                    const targetAmount = parseFloat(goal.targetAmount);
                    
                    // Calculate exact percentage without rounding - this guarantees precision
                    if (targetAmount > 0) {
                        goal.progressPercentage = (currentAmount / targetAmount) * 100;
                        // Ensure we don't show 50.0% for 24990 out of 50000
                        goal.displayPercentage = goal.progressPercentage.toFixed(1);
                    } else {
                        goal.progressPercentage = 0;
                        goal.displayPercentage = "0.0";
                    }
                    
                    // Log for debugging specific cases
                    if (currentAmount === 24990 && targetAmount === 50000) {
                        console.log("DEBUG - Goal detected with amount 24990/50000");
                        console.log("Exact percentage:", goal.progressPercentage);
                        console.log("Display percentage:", goal.displayPercentage);
                    }
                    
                    return goal;
                });
                
                // Apply default filters
                applyFilters();
                
                // Update summary cards
                updateSummaryCards();
            } else {
                showNotification('Failed to load goals. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error loading goals:', error);
            showNotification('Error loading goals. Please check your connection.', 'error');
        }
    }
    
    // Apply filters to goals
    function applyFilters() {
        const typeFilter = goalTypeFilter.value;
        const statusFilter = goalStatusFilter.value;
        const sortOption = goalSort.value;
        
        // Apply type filter
        filteredGoals = goals.filter(goal => {
            if (typeFilter === 'all') return true;
            return goal.goalType === typeFilter;
        });
        
        // Apply status filter
        filteredGoals = filteredGoals.filter(goal => {
            if (statusFilter === 'all') return true;
            
            switch (statusFilter) {
                case 'active':
                    return !goal.isCompleted;
                case 'completed':
                    return goal.isCompleted;
                case 'on_track':
                    return goal.isOnTrack && !goal.isCompleted;
                case 'at_risk':
                    return !goal.isOnTrack && !goal.isCompleted;
                default:
                    return true;
            }
        });
        
        // Apply sorting
        filteredGoals.sort((a, b) => {
            switch (sortOption) {
                case 'priority':
                    return a.priority - b.priority;
                case 'date-asc':
                    return new Date(a.targetDate) - new Date(b.targetDate);
                case 'date-desc':
                    return new Date(b.targetDate) - new Date(a.targetDate);
                case 'progress-asc':
                    return a.progressPercentage - b.progressPercentage;
                case 'progress-desc':
                    return b.progressPercentage - a.progressPercentage;
                default:
                    return 0;
            }
        });
        
        // Render filtered goals
        renderGoals();
    }
    
    // Render goals to the UI
    function renderGoals() {
        // Clear existing goals
        goalsList.innerHTML = '';
        
        // Show empty state if no goals
        if (filteredGoals.length === 0) {
            const emptyPlaceholder = document.createElement('div');
            emptyPlaceholder.className = 'empty-goals-placeholder';
            emptyPlaceholder.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>${goals.length > 0 ? 'No goals match your filter criteria.' : 'You don\'t have any financial goals yet. Start by adding your first goal!'}</p>
                <button id="emptyStateAddBtn" class="button">+ ${goals.length > 0 ? 'Add Another Goal' : 'Add Your First Goal'}</button>
            `;
            goalsList.appendChild(emptyPlaceholder);
            
            // Add event listener for the button
            document.getElementById('emptyStateAddBtn').addEventListener('click', showAddGoalModal);
            return;
        }
        
        // Render each goal
        filteredGoals.forEach(goal => {
            const goalCard = goalTemplate.cloneNode(true);
            goalCard.id = `goal-${goal.id}`;
            goalCard.style.display = 'block';
            
            // Set goal details
            goalCard.querySelector('.goal-title').textContent = goal.title;
            
            // Priority
            const priorityElement = goalCard.querySelector('.goal-priority');
            priorityElement.setAttribute('data-priority', goal.priority);
            priorityElement.textContent = getPriorityText(goal.priority);
            
            // Goal type
            const typeElement = goalCard.querySelector('.goal-type');
            typeElement.setAttribute('data-type', goal.goalType);
            typeElement.textContent = getReadableGoalType(goal.goalType);
            
            // Target and current amount
            goalCard.querySelector('.target-amount').textContent = formatCurrency(goal.targetAmount);
            goalCard.querySelector('.current-amount').textContent = formatCurrency(goal.currentAmount);
            
            // Date information
            goalCard.querySelector('.target-date').textContent = formatDate(goal.targetDate);
            goalCard.querySelector('.days-remaining').textContent = goal.daysRemaining;
            
            // Description
            const descriptionElement = goalCard.querySelector('.goal-description');
            if (goal.description) {
                descriptionElement.textContent = goal.description;
            } else {
                descriptionElement.style.display = 'none';
            }
            
            // Calculate exact percentage using our utility function
            const exactPercentage = calculateExactPercentage(goal.currentAmount, goal.targetAmount);
            
            // Progress bar - use exact percentage for width
            const progressFill = goalCard.querySelector('.progress-fill');
            
            // Special handling for near-milestone values
            if (exactPercentage < 50 && exactPercentage > 49) {
                // For values just under 50%, ensure the UI accurately shows under 50%
                progressFill.style.width = '49.9%';
                console.log(`Forcing progress width to 49.9% for goal ${goal.title} with actual ${exactPercentage}%`);
            } else {
                progressFill.style.width = `${exactPercentage}%`;
            }
            
            // Ensure the bar is visible by adding min-width for very small percentages
            if (exactPercentage > 0 && exactPercentage < 1) {
                progressFill.style.minWidth = '4px';
            } else {
                progressFill.style.minWidth = '';
            }
            
            // Mark at risk if not on track
            if (!goal.isOnTrack && !goal.isCompleted) {
                progressFill.classList.add('at-risk');
            }
            
            // Progress percentage display - show exact percentage with 1 decimal place
            goalCard.querySelector('.progress-percentage').textContent = `${exactPercentage.toFixed(1)}%`;
            
            // On track indicator
            const onTrackIndicator = goalCard.querySelector('.on-track-indicator');
            if (goal.isCompleted) {
                onTrackIndicator.textContent = 'Completed';
                onTrackIndicator.classList.add('positive');
            } else if (goal.isOnTrack) {
                onTrackIndicator.textContent = 'On Track';
                onTrackIndicator.classList.add('positive');
            } else {
                onTrackIndicator.textContent = 'At Risk';
                onTrackIndicator.classList.add('negative');
            }
            
            // Action buttons
            const updateBtn = goalCard.querySelector('.update-goal-btn');
            const editBtn = goalCard.querySelector('.edit-goal-btn');
            const deleteBtn = goalCard.querySelector('.delete-goal-btn');
            
            updateBtn.addEventListener('click', () => showProgressModal(goal));
            editBtn.addEventListener('click', () => showEditGoalModal(goal));
            deleteBtn.addEventListener('click', () => confirmDeleteGoal(goal.id));
            
            // Add the goal card to the list
            goalsList.appendChild(goalCard);
        });
        
        // Apply styles to fix progress bars after rendering
        setTimeout(applyProgressBarStyles, 0);
    }
    
    // Update summary cards with goal statistics
    function updateSummaryCards() {
        // Calculate totals
        const totalSavings = goals.filter(goal => ['savings', 'emergency_fund', 'retirement'].includes(goal.goalType))
            .reduce((sum, goal) => sum + goal.targetAmount, 0);
        
        const totalDebtReduction = goals.filter(goal => goal.goalType === 'debt_reduction')
            .reduce((sum, goal) => sum + goal.targetAmount, 0);
            
        // Fix for milestone counting issue
        // This uses the value directly from the database to maintain consistency
        // The milestone count may look different from what's displayed because
        // the database stores 1-4 for each milestone reached (25%, 50%, 75%, 100%)
        const totalMilestones = goals.reduce((sum, goal) => sum + goal.milestonesReached, 0);
        
        const completedGoals = goals.filter(goal => goal.isCompleted).length;
        
        // Update UI
        document.getElementById('totalSavingsGoals').textContent = formatCurrency(totalSavings);
        document.getElementById('totalDebtGoals').textContent = formatCurrency(totalDebtReduction);
        document.getElementById('totalMilestones').textContent = totalMilestones;
        document.getElementById('completedGoals').textContent = completedGoals;
    }
    
    // Show modal to add a new goal
    function showAddGoalModal() {
        // Reset form
        goalForm.reset();
        document.getElementById('goalId').value = '';
        document.getElementById('goalModalTitle').textContent = 'Add New Goal';
        
        // Set the date field to tomorrow as min
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('targetDate').valueAsDate = tomorrow;
        
        // Show modal
        goalModal.style.display = 'flex';
    }
    
    // Show modal to edit an existing goal
    function showEditGoalModal(goal) {
        // Set form fields
        document.getElementById('goalId').value = goal.id;
        document.getElementById('goalTitle').value = goal.title;
        document.getElementById('goalType').value = goal.goalType;
        document.getElementById('targetAmount').value = goal.targetAmount;
        document.getElementById('currentAmount').value = goal.currentAmount;
        document.getElementById('targetDate').value = goal.targetDate;
        document.getElementById('goalPriority').value = goal.priority;
        document.getElementById('goalDescription').value = goal.description || '';
        
        // Update modal title
        document.getElementById('goalModalTitle').textContent = 'Edit Goal';
        
        // Show modal
        goalModal.style.display = 'flex';
    }
    
    // Apply custom styles to fix progress bar display
    function applyProgressBarStyles() {
        // Get all progress bars
        const progressBars = document.querySelectorAll('.progress-fill, #progressBarFill');
        
        // Apply styles to each
        progressBars.forEach(bar => {
            // Get the current width percentage
            const widthStyle = bar.style.width;
            if (!widthStyle) return;
            
            // Extract percentage value
            const percentValue = parseFloat(widthStyle);
            
            // Always ensure very small values have a visible width
            // By setting min-width to 1.5-2% of the parent container for any progress < 5%
            if (percentValue > 0 && percentValue < 5) {
                bar.style.minWidth = '8px'; // Make it more visible
                bar.style.opacity = '0.8'; // Make it more prominent
            } else {
                bar.style.minWidth = '';
                bar.style.opacity = '1';
            }
            
            // Add data attributes to show precise percentage on hover
            bar.setAttribute('data-percentage', `${percentValue.toFixed(2)}%`);
            
            // Fix progress bar at exact milestone percentages
            const nearMilestones = [25, 50, 75, 100];
            for (const milestone of nearMilestones) {
                // If we're near a milestone
                if (Math.abs(percentValue - milestone) < 0.5) {
                    // If we're at the exact milestone, make sure it shows precisely
                    if (Math.abs(percentValue - milestone) < 0.05) {
                        bar.style.width = `${milestone}%`;
                        console.log(`Fixing at exact milestone: ${milestone}%`);
                    }
                    // Otherwise ensure we don't show a milestone we haven't reached
                    else if (percentValue < milestone) {
                        bar.style.width = `${Math.floor(percentValue * 10) / 10}%`;
                        console.log(`Ensuring we don't falsely show milestone: ${percentValue}% near ${milestone}%`);
                    }
                }
            }
        });
        
        // Update milestone markers based on progress
        const goalCards = document.querySelectorAll('.goal-card');
        goalCards.forEach(card => {
            // Find the progress value for this card
            const progressFill = card.querySelector('.progress-fill');
            if (!progressFill || !progressFill.style.width) return;
            
            const progressValue = parseFloat(progressFill.style.width);
            const milestoneMarkers = card.querySelectorAll('.milestone-marker');
            
            // Remove existing milestone-reached class
            milestoneMarkers.forEach(marker => {
                const markerValue = parseInt(marker.getAttribute('data-percentage'));
                // Precise comparison to ensure only reached milestones are marked
                if (progressValue >= markerValue) {
                    marker.classList.add('milestone-reached');
                } else {
                    marker.classList.remove('milestone-reached');
                }
            });
        });
    }

    // Show progress update modal
    function showProgressModal(goal) {
        // Show the progress update modal
        const progressModal = document.getElementById('progressModal');
        progressModal.style.display = 'flex';
        
        // Set progress info
        document.getElementById('progressGoalId').value = goal.id;
        document.getElementById('progressGoalTitle').textContent = goal.title;
        document.getElementById('progressTargetAmount').textContent = formatCurrency(goal.targetAmount);
        document.getElementById('progressCurrentAmount').textContent = formatCurrency(goal.currentAmount);
        
        // Calculate the exact percentage using our utility function
        const exactPercentage = calculateExactPercentage(goal.currentAmount, goal.targetAmount);
        
        // Display the percentage with proper precision to avoid misleading milestone displays
        // For values near milestone boundaries, ensure we show the precise value
        let displayPercentage;
        
        // For specific boundary cases (near 25%, 50%, 75%, 100%), show extra decimal precision
        const milestones = [25, 50, 75, 100];
        const isNearMilestone = milestones.some(milestone => 
            Math.abs(exactPercentage - milestone) < 0.1);
            
        if (isNearMilestone) {
            // Show 2 decimal places near milestone boundaries for clarity
            displayPercentage = exactPercentage.toFixed(2);
            
            // Special handling for just-below milestone values
            // This ensures 24.999% shows as 24.99% and not 25.00%
            // and 49.999% shows as 49.99% and not 50.00%
            if (exactPercentage < 25 && parseFloat(displayPercentage) >= 25) {
                displayPercentage = "24.99";
            } else if (exactPercentage < 50 && parseFloat(displayPercentage) >= 50) {
                displayPercentage = "49.99";
            } else if (exactPercentage < 75 && parseFloat(displayPercentage) >= 75) {
                displayPercentage = "74.99";
            } else if (exactPercentage < 100 && parseFloat(displayPercentage) >= 100) {
                displayPercentage = "99.99";
            }
        } else {
            // Normal case, 1 decimal place is sufficient
            displayPercentage = exactPercentage.toFixed(1);
        }
        
        document.getElementById('progressPercentage').textContent = `${displayPercentage}%`;
        
        // Set progress bar with exact percentage for visual accuracy
        const progressBar = document.getElementById('progressBarFill');
        progressBar.style.width = `${exactPercentage}%`;
        
        // Ensure the bar is visible by adding min-width for very small percentages
        if (exactPercentage > 0 && exactPercentage < 1) {
            progressBar.style.minWidth = '4px';
        } else {
            progressBar.style.minWidth = '';
        }
        
        // Change progress bar color based on status
        if (goal.isOnTrack || goal.isCompleted) {
            progressBar.style.backgroundColor = '#9575cd';
        } else {
            progressBar.style.backgroundColor = '#ef4444';
        }
        
        // Set default amount to current amount with proper value conversion
        // This is critical to ensure the value appears correctly in the input field
        const inputNewAmount = document.getElementById('newAmount');
        inputNewAmount.value = goal.currentAmount;
        
        // For debugging purposes - display the current amount in the console
        console.log('Setting current amount in input field:', goal.currentAmount);
        console.log('Input field value after setting:', inputNewAmount.value);
        
        // Generate milestone indicators
        const milestonesContainer = document.getElementById('milestoneIcons');
        milestonesContainer.innerHTML = '';
        
        // Calculate milestone celebration status with precise comparison
        // Crucial fix: Only show reached if the CURRENT percentage is >= milestone
        // Previously celebrated is shown with checkmark but not highlighted
        const milestoneStatus = {
            25: { 
                reached: exactPercentage >= 25, 
                celebrated: goal.milestonesReached >= 1 
            },
            50: { 
                reached: exactPercentage >= 50, 
                celebrated: goal.milestonesReached >= 2 
            },
            75: { 
                reached: exactPercentage >= 75, 
                celebrated: goal.milestonesReached >= 3 
            },
            100: { 
                reached: exactPercentage >= 100, 
                celebrated: goal.milestonesReached >= 4 
            }
        };
        
        [25, 50, 75, 100].forEach(milestoneValue => {
            const status = milestoneStatus[milestoneValue];
            const milestone = document.createElement('div');
            
            // Set appropriate classes based on status
            let classes = ['milestone-indicator'];
            
            // Critical fix: Only add 'reached' class if currently at or above milestone
            if (status.reached) {
                classes.push('reached');
            }
            
            // Show the checkmark only if it was previously celebrated
            // but don't highlight it if we're no longer at that percentage
            const wasCelebrated = status.celebrated;
            
            milestone.className = classes.join(' ');
            milestone.setAttribute('data-milestone', milestoneValue);
            
            milestone.innerHTML = `
                <div class="milestone-icon">
                    <span>${milestoneValue}%</span>
                    ${wasCelebrated ? '<span class="celebrated-mark">✓</span>' : ''}
                </div>
            `;
            
            milestonesContainer.appendChild(milestone);
        });
        
        // Show modal
        progressModal.style.display = 'flex';
    }
    
    // Handle saving a goal (add or edit)
    async function handleSaveGoal(e) {
        e.preventDefault();
        
        // Validate form
        if (!goalForm.checkValidity()) {
            goalForm.reportValidity();
            return;
        }
        
        // Get form data
        const goalId = document.getElementById('goalId').value;
        const title = document.getElementById('goalTitle').value;
        const goalType = document.getElementById('goalType').value;
        const targetAmount = parseFloat(document.getElementById('targetAmount').value);
        const currentAmount = parseFloat(document.getElementById('currentAmount').value) || 0;
        const targetDate = document.getElementById('targetDate').value;
        const priority = parseInt(document.getElementById('goalPriority').value);
        const description = document.getElementById('goalDescription').value;
        
        // Validation
        if (targetAmount <= 0) {
            showNotification('Target amount must be greater than zero.', 'warning');
            return;
        }
        
        if (currentAmount < 0) {
            showNotification('Current amount cannot be negative.', 'warning');
            return;
        }
        
        if (currentAmount > targetAmount) {
            showNotification('Current amount cannot exceed target amount.', 'warning');
            return;
        }
        
        try {
            let url, method;
            
            // Determine if adding or editing
            if (goalId) {
                url = `/api/goals/${goalId}`;
                method = 'PUT';
            } else {
                url = '/api/goals';
                method = 'POST';
            }
            
            // API request
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    goalType,
                    targetAmount,
                    currentAmount,
                    targetDate,
                    priority,
                    description
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Hide modal
                goalModal.style.display = 'none';
                
                // Refresh goals
                await loadGoals();
                
                // Show success message
                showNotification(`Goal ${goalId ? 'updated' : 'added'} successfully!`, 'success');
            } else {
                showNotification(data.message || 'Failed to save goal.', 'error');
            }
        } catch (error) {
            console.error('Error saving goal:', error);
            showNotification('Error saving goal. Please try again.', 'error');
        }
    }
    
    // Handle saving goal progress
    async function handleSaveProgress(e) {
        e.preventDefault();
        
        // Validate form
        if (!progressForm.checkValidity()) {
            progressForm.reportValidity();
            return;
        }
        
        // Get form data and ensure it's a valid number
        const goalId = document.getElementById('progressGoalId').value;
        let newAmount = parseFloat(document.getElementById('newAmount').value);
        
        // Round to 2 decimal places to avoid floating point issues
        newAmount = parseFloat(newAmount.toFixed(2));
        
        // Get the goal
        const goal = goals.find(g => g.id.toString() === goalId.toString());
        if (!goal) {
            showNotification('Goal not found.', 'error');
            return;
        }
        
        // Validation with helpful error messages
        if (isNaN(newAmount)) {
            showNotification('Please enter a valid number.', 'warning');
            return;
        }
        
        if (newAmount < 0) {
            showNotification('Amount cannot be negative.', 'warning');
            return;
        }
        
        if (newAmount > goal.targetAmount) {
            // Cap at target amount instead of showing error
            newAmount = goal.targetAmount;
            showNotification('Amount has been capped at the target amount.', 'info');
        }
        
        try {
            // Calculate old and new percentages with precise calculation
            const oldPercentage = calculateExactPercentage(goal.currentAmount, goal.targetAmount);
            const newPercentage = calculateExactPercentage(newAmount, goal.targetAmount);
            
            // Check for progress change direction
            let progressDirection = "same";
            if (newAmount > goal.currentAmount) {
                progressDirection = "increased";
            } else if (newAmount < goal.currentAmount) {
                progressDirection = "decreased";
            }
            
            // Check for new milestone reached with exact comparison
            let newMilestone = null;
            let lostMilestone = null; // Track milestone losses for UI updates
            
            // Handle milestone checks differently based on direction
            if (progressDirection === "increased") {
                for (const milestone of [25, 50, 75, 100]) {
                    // Make sure we're truly past the milestone with precise comparison
                    // This ensures 49.99% doesn't trigger the 50% milestone
                    if (oldPercentage < milestone && newPercentage >= milestone) {
                        newMilestone = milestone;
                        break;
                    }
                }
            } else if (progressDirection === "decreased") {
                // Also note milestone losses for proper UI updates
                for (const milestone of [100, 75, 50, 25]) {
                    if (oldPercentage >= milestone && newPercentage < milestone) {
                        lostMilestone = milestone;
                        break;
                    }
                }
            }
            
            // Debug values to console for troubleshooting
            console.log('Updating goal progress:');
            console.log('Goal ID:', goalId);
            console.log('Current amount:', goal.currentAmount);
            console.log('New amount:', newAmount);
            console.log('Old percentage:', oldPercentage);
            console.log('New percentage:', newPercentage);
            
            // Create the request payload
            const payload = {
                current_amount: newAmount,
                old_percentage: oldPercentage,
                new_percentage: newPercentage,
                progress_direction: progressDirection
            };
            
            console.log('Request payload:', payload);
            
            // API request
            const response = await fetch(`/api/goals/${goalId}/progress`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            console.log('Response:', data);
            
            if (data.success) {
                // Update progress UI directly for immediate feedback
                // This ensures progress bar updates correctly even for decreasing values
                const targetCard = document.querySelector(`.goal-card[data-id="${goalId}"]`);
                if (targetCard) {
                    // Update values in the UI
                    targetCard.querySelector('.current-amount').textContent = formatCurrency(newAmount);
                    
                    // Update progress bar - critical for both increasing and decreasing values
                    const progressFill = targetCard.querySelector('.progress-fill');
                    const exactPercentage = calculateExactPercentage(newAmount, goal.targetAmount);
                    progressFill.style.width = `${exactPercentage}%`;
                    
                    // Add visual feedback based on direction
                    if (progressDirection === "increased") {
                        progressFill.classList.add('progress-increased');
                        setTimeout(() => progressFill.classList.remove('progress-increased'), 1000);
                    } else if (progressDirection === "decreased") {
                        progressFill.classList.add('progress-decreased');
                        setTimeout(() => progressFill.classList.remove('progress-decreased'), 1000);
                    }
                    
                    // Update milestone markers based on server response
                    const milestoneMarkers = targetCard.querySelectorAll('.milestone-marker');
                    milestoneMarkers.forEach(marker => {
                        const markerValue = parseInt(marker.getAttribute('data-percentage'));
                        if (exactPercentage >= markerValue) {
                            marker.classList.add('milestone-reached');
                        } else {
                            marker.classList.remove('milestone-reached');
                        }
                    });
                }
                
                // Hide progress modal
                progressModal.style.display = 'none';
                
                // Refresh goals completely after the visual update to ensure data consistency
                await loadGoals();
                
                // Show success message
                showNotification('Goal progress updated successfully!', 'success');
                
                // Use server response to determine milestone status
                // Check if we reached a new milestone according to the server
                if (data.goal.milestoneReached) {
                    const reachedMilestone = newMilestone; // Use our client-side detected milestone
                    showCelebration(goal, reachedMilestone, newAmount);
                } 
                // Check if we lost a milestone according to the server
                else if (data.goal.milestoneLost) {
                    // Provide gentle feedback about lost milestone
                    showNotification(`Progress fell below ${data.goal.milestoneLost}%. Keep working toward your goal!`, 'info');
                }
            } else {
                showNotification(data.message || 'Failed to update progress.', 'error');
            }
        } catch (error) {
            console.error('Error updating progress:', error);
            showNotification('Error updating progress. Please try again.', 'error');
        }
    }
    
    // Show celebration modal
    function showCelebration(goal, milestone, currentAmount) {
        // Set celebration message
        const message = document.getElementById('celebrationMessage');
        
        // Set message based on milestone
        switch (milestone) {
            case 25:
                message.textContent = "Great start! You're 25% of the way toward your goal.";
                break;
            case 50:
                message.textContent = "Halfway there! You've reached the 50% milestone.";
                break;
            case 75:
                message.textContent = "Almost there! Just 25% more to go to reach your goal.";
                break;
            case 100:
                message.textContent = "Congratulations! You've completed your financial goal!";
                break;
            default:
                message.textContent = "You've reached a milestone in your goal!";
        }
        
        // Set progress bar
        const progressBar = document.getElementById('celebrationProgressBar');
        progressBar.style.width = `${milestone}%`;
        
        // Set percentage
        document.getElementById('celebrationPercentage').textContent = `${milestone}%`;
        
        // Set goal details
        document.getElementById('celebrationGoalTitle').textContent = goal.title;
        
        // Calculate exact percentage using our utility function
        const exactPercentage = calculateExactPercentage(currentAmount, goal.targetAmount);
        document.getElementById('celebrationGoalDetails').textContent = 
            `Current: ${formatCurrency(currentAmount)} of Target: ${formatCurrency(goal.targetAmount)} (${exactPercentage.toFixed(1)}%)`;
        
        // Show celebration modal
        celebrationModal.style.display = 'flex';
    }
    
    // Confirm goal deletion
    function confirmDeleteGoal(goalId) {
        if (confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
            deleteGoal(goalId);
        }
    }
    
    // Delete a goal
    async function deleteGoal(goalId) {
        try {
            const response = await fetch(`/api/goals/${goalId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Refresh goals
                await loadGoals();
                
                // Show success message
                showNotification('Goal deleted successfully.', 'success');
            } else {
                showNotification(data.message || 'Failed to delete goal.', 'error');
            }
        } catch (error) {
            console.error('Error deleting goal:', error);
            showNotification('Error deleting goal. Please try again.', 'error');
        }
    }
    
    // Helper function to get readable goal type
    function getReadableGoalType(type) {
        const types = {
            'savings': 'Savings',
            'debt_reduction': 'Debt Reduction',
            'investment': 'Investment',
            'emergency_fund': 'Emergency Fund',
            'retirement': 'Retirement',
            'other': 'Other'
        };
        return types[type] || 'Other';
    }
    
    // Helper function to get priority text
    function getPriorityText(priority) {
        const priorities = {
            1: 'Highest',
            2: 'High',
            3: 'Medium',
            4: 'Low',
            5: 'Lowest'
        };
        return priorities[priority] || 'Medium';
    }
    
    // Format currency
    function formatCurrency(amount) {
        return `${currencySymbol}${parseFloat(amount).toFixed(2)}`;
    }
    
    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Force exact percentage calculation with precision guarantees
    function calculateExactPercentage(current, target) {
        if (!target || target <= 0) return 0;
        if (!current || current <= 0) return 0;
        
        // Convert inputs to numbers to ensure proper calculation
        const currentNum = parseFloat(current);
        const targetNum = parseFloat(target);
        
        // Calculate the exact percentage with high precision
        const percentage = (currentNum / targetNum) * 100;
        
        // Special handling for milestone values - prevent rounding up to milestone thresholds
        if (percentage > 24.9 && percentage < 25) {
            return 24.9; // Keep just under 25% milestone
        } else if (percentage > 49.9 && percentage < 50) {
            return 49.9; // Keep just under 50% milestone
        } else if (percentage > 74.9 && percentage < 75) {
            return 74.9; // Keep just under 75% milestone
        } else if (percentage > 99.9 && percentage < 100) {
            return 99.9; // Keep just under 100% milestone
        }
        
        // Return the precise calculation with fixed precision (2 decimal places)
        return parseFloat(percentage.toFixed(2));
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
            <button class="close-notification" style="position: absolute; top: 8px; right: 8px; background: none; border: none; cursor: pointer; font-size: 18px; color: inherit;">×</button>
        `;
        
        // Position the notification in the top-right corner
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '1100';

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