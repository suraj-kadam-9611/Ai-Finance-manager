document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const expenseForm = document.getElementById('expenseForm');
    const expensesTable = document.querySelector('.expenses-table tbody');
    const categoryFilter = document.getElementById('categoryFilter');
    const expenseSort = document.getElementById('expenseSort');
    const paginationContainer = document.getElementById('expensesPagination');
    const dateInput = document.getElementById('date');
    const totalMonthlyExpenses = document.getElementById('totalMonthlyExpenses');
    const expenseCategoryChart = document.getElementById('expenseCategoryChart');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const bulkActionsModal = document.getElementById('bulkActionsModal');
    const selectAllExpenses = document.getElementById('selectAllExpenses');
    const selectAllHeader = document.getElementById('selectAllHeader');
    const bulkActionBtn = document.getElementById('bulkActionBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    // Chart instance
    let categoryChart = null;
    
    // Set today's date
    if (dateInput) {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        dateInput.value = formattedDate;
    }
    
    // State variables
    let allExpenses = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentFilter = 'all';
    let currentSort = 'date-desc';
    let currentDateFilter = 'this-month';
    let selectedExpenseIds = [];
    
    // Initialize chart
    function initializeChart() {
        if (categoryChart) {
            categoryChart.destroy();
        }
        
        const ctx = expenseCategoryChart.getContext('2d');
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#4CAF50', // Food
                        '#2196F3', // Transport
                        '#9C27B0', // Shopping
                        '#FF9800', // Bills
                        '#E91E63', // Entertainment
                        '#9E9E9E'  // Other
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Update expense summary with current month data
    function updateExpenseSummary(expenses) {
        updateExpenseSummaryWithDateFilter(expenses);
    }
    
    // Update expense summary with selected date filter
    function updateExpenseSummaryWithDateFilter(expensesData = null) {
        const expenses = expensesData || allExpenses;
        // Get current date information
        const today = new Date();
        const currentMonth = today.getMonth(); // 0-11
        const currentYear = today.getFullYear();
        
        // Filter expenses based on date filter
        let filteredExpenses = [];
        let periodLabel = 'This Month';
        
        switch(currentDateFilter) {
            case 'this-month':
                filteredExpenses = expenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getMonth() === currentMonth && 
                          expenseDate.getFullYear() === currentYear;
                });
                periodLabel = 'This Month';
                break;
            case 'last-month':
                const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                filteredExpenses = expenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getMonth() === lastMonth && 
                          expenseDate.getFullYear() === lastMonthYear;
                });
                periodLabel = 'Last Month';
                break;
            case '3-months':
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(currentMonth - 3);
                filteredExpenses = expenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate >= threeMonthsAgo;
                });
                periodLabel = 'Last 3 Months';
                break;
            case '6-months':
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(currentMonth - 6);
                filteredExpenses = expenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate >= sixMonthsAgo;
                });
                periodLabel = 'Last 6 Months';
                break;
            case 'this-year':
                filteredExpenses = expenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getFullYear() === currentYear;
                });
                periodLabel = 'This Year';
                break;
            case 'all':
                filteredExpenses = expenses;
                periodLabel = 'All Time';
                break;
            default:
                filteredExpenses = expenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getMonth() === currentMonth && 
                          expenseDate.getFullYear() === currentYear;
                });
                periodLabel = 'This Month';
        }
        
        // Calculate total expenses for the filtered period
        const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        // Update the total label to reflect time period
        const totalLabel = document.querySelector('.expense-summary h3');
        if (totalLabel) {
            totalLabel.textContent = `Total Expenses: ${periodLabel}`;
        }
        
        // Update the total amount
        if (totalMonthlyExpenses) {
            totalMonthlyExpenses.textContent = `₹${total.toFixed(2)}`;
        }
        
        // Calculate expenses by category for the filtered period
        const categoryTotals = filteredExpenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
        }, {});
        
        // Update chart data
        const categories = Object.keys(categoryTotals);
        const amounts = Object.values(categoryTotals);
        
        console.log(`Chart data updated for ${periodLabel} with ${categories.length} categories`);
        
        // Update the chart if it exists
        if (categoryChart) {
            categoryChart.data.labels = categories;
            categoryChart.data.datasets[0].data = amounts;
            categoryChart.update();
        }
    }
    
    // Expense form submission
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // Get form values
                const amount = document.getElementById('amount').value;
                const category = document.getElementById('category').value;
                const description = document.getElementById('description').value || ''; // Ensure empty string if no description
                const date = document.getElementById('date').value;
                
                // Validate inputs
                if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
                    alert('Please enter a valid amount');
                    return;
                }
                
                if (!category) {
                    alert('Please select a category');
                    return;
                }
                
                if (!date) {
                    alert('Please select a date');
                    return;
                }
                
                console.log('Submitting expense with data:', {
                    amount: parseFloat(amount),
                    category,
                    description,
                    date
                });
                
                // Send request
                const response = await fetch('/api/expenses', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        amount: parseFloat(amount),
                        category,
                        description,
                        date
                    })
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error response:', response.status, errorText);
                    throw new Error(`Server responded with ${response.status}: ${errorText}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    // Reset form
                    expenseForm.reset();
                    
                    // Set today's date again
                    const today = new Date();
                    const formattedDate = today.toISOString().split('T')[0];
                    dateInput.value = formattedDate;
                    
                    // Update expenses list
                    loadExpenses();
                    
                    // Show success message using alert for now (guaranteed to work)
                    setTimeout(() => {
                        // Create custom notification with black background and green text
                        const notification = document.createElement('div');
                        notification.style.position = 'fixed';
                        notification.style.top = '20px';
                        notification.style.right = '20px';
                        notification.style.backgroundColor = 'black';
                        notification.style.color = 'green';
                        notification.style.padding = '15px 25px';
                        notification.style.borderRadius = '8px';
                        notification.style.zIndex = '9999';
                        notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                        notification.textContent = 'Expense added successfully';
                        
                        document.body.appendChild(notification);
                        
                        // Auto remove after 5 seconds
                        setTimeout(() => {
                            notification.style.opacity = '0';
                            notification.style.transition = 'opacity 0.3s';
                            setTimeout(() => notification.remove(), 300);
                        }, 5000);
                    }, 100);
                } else {
                    showNotification(data.message || 'Error adding expense', 'error');
                }
            } catch (error) {
                console.error('Error adding expense:', error);
                showNotification('Failed to add expense: ' + error.message, 'error');
            }
        });
    }
    
    // Load expenses
    async function loadExpenses() {
        if (!expensesTable) return;
        
        try {
            const response = await fetch('/api/expenses');
            const data = await response.json();
            
            if (data.success) {
                allExpenses = data.expenses;
                applyFilterAndSort();
                updateExpenseSummary(allExpenses);
            } else {
                showNotification('Failed to load expenses. Please refresh the page.', 'error');
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
            renderExpenses([]); // Show empty state
        }
    }
    
    // Apply filter and sort
    function applyFilterAndSort() {
        // Get current date information
        const today = new Date();
        const currentMonth = today.getMonth(); // 0-11
        const currentYear = today.getFullYear();

        // Apply date filter based on selected option
        let filteredExpenses = allExpenses.filter(expense => {
            // Parse the expense date
            const expenseDate = new Date(expense.date);
            const expenseMonth = expenseDate.getMonth();
            const expenseYear = expenseDate.getFullYear();
            
            // Apply different date filters based on selection
            let passesDateFilter = false;
            
            switch(currentDateFilter) {
                case 'this-month':
                    passesDateFilter = (expenseMonth === currentMonth && expenseYear === currentYear);
                    break;
                case 'last-month':
                    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                    passesDateFilter = (expenseMonth === lastMonth && expenseYear === lastMonthYear);
                    break;
                case '3-months':
                    // Calculate date 3 months ago
                    const threeMonthsAgo = new Date();
                    threeMonthsAgo.setMonth(currentMonth - 3);
                    passesDateFilter = expenseDate >= threeMonthsAgo;
                    break;
                case '6-months':
                    // Calculate date 6 months ago
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(currentMonth - 6);
                    passesDateFilter = expenseDate >= sixMonthsAgo;
                    break;
                case 'this-year':
                    passesDateFilter = expenseYear === currentYear;
                    break;
                case 'all':
                    passesDateFilter = true;
                    break;
                default:
                    passesDateFilter = (expenseMonth === currentMonth && expenseYear === currentYear);
            }
            
            // Apply category filter if selected
            const matchesCategory = (currentFilter === 'all' || expense.category === currentFilter);
            
            // Include expense if it matches both filters
            return passesDateFilter && matchesCategory;
        });
        
        console.log(`Filtered to ${filteredExpenses.length} expenses with date filter: ${currentDateFilter} and category: ${currentFilter}`);
        
        // Apply sorting
        const [sortBy, sortOrder] = currentSort.split('-');
        
        filteredExpenses.sort((a, b) => {
            if (sortBy === 'date') {
                return sortOrder === 'asc' 
                    ? new Date(a.date) - new Date(b.date)
                    : new Date(b.date) - new Date(a.date);
            } else if (sortBy === 'amount') {
                return sortOrder === 'asc'
                    ? a.amount - b.amount
                    : b.amount - a.amount;
            }
            return 0;
        });
        
        // Render with pagination
        renderPaginatedExpenses(filteredExpenses);
    }
    
    // Render paginated expenses
    function renderPaginatedExpenses(expenses) {
        const totalPages = Math.ceil(expenses.length / itemsPerPage);
        
        // Adjust current page if needed
        if (currentPage > totalPages) {
            currentPage = totalPages || 1;
        }
        
        // Calculate slice indices
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        // Get expenses for current page
        const paginatedExpenses = expenses.slice(startIndex, endIndex);
        
        // Render expenses
        renderExpenses(paginatedExpenses);
        
        // Render pagination controls
        renderPagination(totalPages);
    }
    
    // Render expenses in table
    function renderExpenses(expenses) {
        if (!expensesTable) return;
        
        expensesTable.innerHTML = '';
        
        if (!expenses || expenses.length === 0) {
            const emptyState = document.createElement('tr');
            emptyState.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 40px 20px;">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto; width: 100%; max-width: 300px;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 48px; height: 48px; margin-bottom: 16px;">
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                        <p style="text-align: center; margin: 0;">No expenses found. Add your first expense or adjust your filters.</p>
                    </div>
                </td>
            `;
            expensesTable.appendChild(emptyState);
            
            // Disable bulk action controls when no expenses
            document.getElementById('selectAllExpenses').disabled = true;
            document.getElementById('selectAllHeader').disabled = true;
            document.getElementById('bulkActionBtn').disabled = true;
            return;
        }
        
        // Enable bulk action controls when expenses exist
        document.getElementById('selectAllExpenses').disabled = false;
        document.getElementById('selectAllHeader').disabled = false;
        
        expenses.forEach((expense, index) => {
            const row = document.createElement('tr');
            row.className = 'expense-row';
            row.dataset.id = expense.id;
            
            // Format date
            const expenseDate = new Date(expense.date);
            const formattedDate = expenseDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Create category element with appropriate class
            const categoryClass = expense.category.toLowerCase().replace(/\s+/g, '');
            
            // Calculate S.No. based on current page
            const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
            
            row.innerHTML = `
                <td class="checkbox-column">
                    <input type="checkbox" class="expense-checkbox checkbox-custom" data-id="${expense.id}">
                </td>
                <td>${serialNumber}</td>
                <td>${formattedDate}</td>
                <td><span class="expense-category ${categoryClass}">${expense.category}</span></td>
                <td>${expense.description || '-'}</td>
                <td>₹${expense.amount.toFixed(2)}</td>
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
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row selection
                const id = button.getAttribute('data-id');
                openDeleteConfirmModal(id);
            });
        });
        
        // Add checkbox event listeners
        document.querySelectorAll('.expense-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateSelectedCount();
                updateRowSelection(checkbox);
            });
            
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row selection when clicking checkbox
            });
        });
        
        // Add row click event for selection
        document.querySelectorAll('.expense-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SVG' && e.target.tagName !== 'PATH' && e.target.tagName !== 'LINE') {
                    const checkbox = row.querySelector('.expense-checkbox');
                    checkbox.checked = !checkbox.checked;
                    updateRowSelection(checkbox);
                    updateSelectedCount();
                }
            });
        });
    }
    
    // Render pagination controls
    function renderPagination(totalPages) {
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = `pagination-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        `;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                applyFilterAndSort();
            }
        });
        paginationContainer.appendChild(prevButton);
        
        // Page buttons
        const maxButtonsToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtonsToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxButtonsToShow - 1);
        
        // Adjust start page if needed
        if (endPage - startPage + 1 < maxButtonsToShow) {
            startPage = Math.max(1, endPage - maxButtonsToShow + 1);
        }
        
        // First page button if needed
        if (startPage > 1) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.className = 'pagination-item';
            firstPageBtn.textContent = '1';
            firstPageBtn.addEventListener('click', () => {
                currentPage = 1;
                applyFilterAndSort();
            });
            paginationContainer.appendChild(firstPageBtn);
            
            // Add ellipsis if needed
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
        }
        
        // Page number buttons
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-item ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                applyFilterAndSort();
            });
            paginationContainer.appendChild(pageBtn);
        }
        
        // Last page button if needed
        if (endPage < totalPages) {
            // Add ellipsis if needed
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
            
            const lastPageBtn = document.createElement('button');
            lastPageBtn.className = 'pagination-item';
            lastPageBtn.textContent = totalPages;
            lastPageBtn.addEventListener('click', () => {
                currentPage = totalPages;
                applyFilterAndSort();
            });
            paginationContainer.appendChild(lastPageBtn);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = `pagination-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        `;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                applyFilterAndSort();
            }
        });
        paginationContainer.appendChild(nextButton);
    }
    
    // Category filter change
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            currentFilter = categoryFilter.value;
            currentPage = 1; // Reset to first page
            applyFilterAndSort();
        });
    }
    
    // Date filter change
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            currentDateFilter = dateFilter.value;
            currentPage = 1; // Reset to first page
            applyFilterAndSort();
            
            // Update expense summary based on date filter
            updateExpenseSummaryWithDateFilter();
        });
    }
    
    // Sort order change
    if (expenseSort) {
        expenseSort.addEventListener('change', () => {
            currentSort = expenseSort.value;
            applyFilterAndSort();
        });
    }
    
    // Open delete confirmation modal for a single expense
    function openDeleteConfirmModal(expenseId) {
        const modal = document.getElementById('deleteConfirmModal');
        const idInput = document.getElementById('deleteExpenseId');
        const multipleInput = document.getElementById('deleteMultiple');
        const message = document.getElementById('deleteConfirmMessage');
        
        // Set up for single delete
        idInput.value = expenseId;
        multipleInput.value = 'false';
        message.textContent = 'Are you sure you want to delete this expense?';
        
        // Open modal
        modal.classList.add('show');
    }
    
    // Open delete confirmation modal for multiple expenses
    function openDeleteMultipleConfirmModal(selectedIds) {
        const modal = document.getElementById('deleteConfirmModal');
        const idInput = document.getElementById('deleteExpenseId');
        const multipleInput = document.getElementById('deleteMultiple');
        const message = document.getElementById('deleteConfirmMessage');
        
        // Set up for multiple delete
        idInput.value = JSON.stringify(selectedIds);
        multipleInput.value = 'true';
        message.textContent = `Are you sure you want to delete ${selectedIds.length} expenses?`;
        
        // Open modal
        modal.classList.add('show');
    }
    
    // Update row selection visual state
    function updateRowSelection(checkbox) {
        const row = checkbox.closest('.expense-row');
        if (checkbox.checked) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    }
    
    // Update selected count and buttons state
    function updateSelectedCount() {
        const selectedCheckboxes = document.querySelectorAll('.expense-checkbox:checked');
        const count = selectedCheckboxes.length;
        const countBadge = document.getElementById('selectedCountBadge');
        const bulkActionBtn = document.getElementById('bulkActionBtn');
        const selectedCountElement = document.getElementById('selectedCount');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        
        // Update count badges
        countBadge.textContent = count;
        if (selectedCountElement) {
            selectedCountElement.textContent = count;
        }
        
        // Enable/disable bulk action button
        bulkActionBtn.disabled = count === 0;
        
        // Enable/disable delete selected button in bulk actions modal
        if (deleteSelectedBtn) {
            deleteSelectedBtn.disabled = count === 0;
        }
        
        // Update "Select All" checkboxes state
        const allCheckboxes = document.querySelectorAll('.expense-checkbox');
        const selectAllHeader = document.getElementById('selectAllHeader');
        const selectAllExpenses = document.getElementById('selectAllExpenses');
        
        if (count > 0 && count === allCheckboxes.length) {
            selectAllHeader.checked = true;
            selectAllExpenses.checked = true;
            selectAllHeader.indeterminate = false;
            selectAllExpenses.indeterminate = false;
        } else if (count > 0) {
            selectAllHeader.indeterminate = true;
            selectAllExpenses.indeterminate = true;
        } else {
            selectAllHeader.checked = false;
            selectAllExpenses.checked = false;
            selectAllHeader.indeterminate = false;
            selectAllExpenses.indeterminate = false;
        }
        
        // Update selectedExpenseIds array
        selectedExpenseIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
    }
    
    // Initialize modal functionality
    function initializeModals() {
        // Close modals when clicking close button
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('show');
                });
            });
        });
        
        // Close modals when clicking outside content
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
        
        // Confirm delete button event
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', async () => {
                const idInput = document.getElementById('deleteExpenseId');
                const multipleInput = document.getElementById('deleteMultiple');
                const isMultiple = multipleInput.value === 'true';
                
                try {
                    if (isMultiple) {
                        // Handle multiple delete
                        const idsToDelete = JSON.parse(idInput.value);
                        let successCount = 0;
                        
                        for (const id of idsToDelete) {
                            const response = await fetch(`/api/expenses/${id}`, {
                                method: 'DELETE'
                            });
                            
                            if (response.ok) {
                                successCount++;
                            }
                        }
                        
                        // Close the modal
                        deleteConfirmModal.classList.remove('show');
                        
                        // Reload expenses
                        loadExpenses();
                        
                        // Show success notification
                        if (successCount === idsToDelete.length) {
                            showNotification(`Successfully deleted ${successCount} expenses`, 'success');
                        } else {
                            showNotification(`Deleted ${successCount} out of ${idsToDelete.length} expenses`, 'warning');
                        }
                        
                        // Clear selection
                        selectedExpenseIds = [];
                    } else {
                        // Handle single delete
                        const id = idInput.value;
                        const response = await fetch(`/api/expenses/${id}`, {
                            method: 'DELETE'
                        });
                        
                        const data = await response.json();
                        
                        // Close the modal
                        deleteConfirmModal.classList.remove('show');
                        
                        if (data.success) {
                            // Reload expenses
                            loadExpenses();
                            
                            // Show success notification
                            showNotification('Expense deleted successfully', 'success');
                        } else {
                            showNotification('Failed to delete expense. Please try again.', 'error');
                        }
                    }
                } catch (error) {
                    console.error('Error deleting expense(s):', error);
                    showNotification('Failed to delete expense(s). Please try again.', 'error');
                    deleteConfirmModal.classList.remove('show');
                }
            });
        }
        
        // Bulk action button
        if (bulkActionBtn) {
            bulkActionBtn.addEventListener('click', () => {
                bulkActionsModal.classList.add('show');
            });
        }
        
        // Delete selected button in bulk actions modal
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => {
                // Close bulk actions modal
                bulkActionsModal.classList.remove('show');
                
                // Open delete confirmation modal
                openDeleteMultipleConfirmModal(selectedExpenseIds);
            });
        }
        
        // Clear selection button
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => {
                // Uncheck all checkboxes
                document.querySelectorAll('.expense-checkbox').forEach(cb => {
                    cb.checked = false;
                });
                
                // Remove selected class from all rows
                document.querySelectorAll('.expense-row').forEach(row => {
                    row.classList.remove('selected');
                });
                
                // Update selected count and reset state
                selectedExpenseIds = [];
                updateSelectedCount();
                
                // Close bulk actions modal
                bulkActionsModal.classList.remove('show');
            });
        }
    }
    
    // Select all expenses handler
    if (selectAllExpenses) {
        selectAllExpenses.addEventListener('change', () => {
            document.querySelectorAll('.expense-checkbox').forEach(cb => {
                cb.checked = selectAllExpenses.checked;
                updateRowSelection(cb);
            });
            updateSelectedCount();
        });
    }
    
    // Select all header checkbox handler
    if (selectAllHeader) {
        selectAllHeader.addEventListener('change', () => {
            document.querySelectorAll('.expense-checkbox').forEach(cb => {
                cb.checked = selectAllHeader.checked;
                updateRowSelection(cb);
            });
            selectAllExpenses.checked = selectAllHeader.checked;
            updateSelectedCount();
        });
    }
    
    // Initialize page
    initializeChart();
    initializeModals();
    loadExpenses();
});

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
