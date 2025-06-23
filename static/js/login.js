document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tabs = document.querySelectorAll('.tab');
    const forms = document.querySelectorAll('.form');
    const toggleButtons = document.querySelectorAll('.toggle-password');
    const notification = document.getElementById('notification');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');
    const regUsername = document.getElementById('regUsername');
    const regSubmitBtn = registerForm.querySelector('.submit-btn');
    let usernameTimeout;

    // Validation Rules
    const VALIDATION_RULES = {
        fullName: {
            min: 2,
            pattern: /^[a-zA-Z\s]+$/,
            message: 'Please enter a valid name (letters and spaces only)'
        },
        mobile: {
            pattern: /^\d{10}$/,
            message: 'Please enter a valid 10-digit mobile number'
        },
        username: {
            min: 3,
            pattern: /^[a-zA-Z0-9_]+$/,
            message: 'Username must be at least 3 characters (letters, numbers, underscore)'
        },
        password: {
            min: 8,
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character'
        }
    };

    // Helper Functions
    const showError = (input, message) => {
        const formGroup = input.closest('.form-group');
        formGroup.classList.add('error');
        formGroup.classList.remove('success');
        formGroup.querySelector('.validation-message').textContent = message;
    };

    const showSuccess = (input) => {
        const formGroup = input.closest('.form-group');
        formGroup.classList.remove('error');
        formGroup.classList.add('success');
        formGroup.querySelector('.validation-message').textContent = '';
    };

    const showAlert = (formId, message, type) => {
        const alert = document.getElementById(`${formId}Alert`);
        if (alert) {
            alert.textContent = message;
            alert.className = `alert ${type}`;
        }
    };

    const clearAlert = (formId) => {
        const alert = document.getElementById(`${formId}Alert`);
        if (alert) {
            alert.textContent = '';
            alert.className = 'alert';
        }
    };

    const validateField = (input, rules) => {
        const value = input.value.trim();

        if (!value) {
            showError(input, 'This field is required');
            return false;
        }

        if (rules && rules.min && value.length < rules.min) {
            showError(input, `Must be at least ${rules.min} characters`);
            return false;
        }

        if (rules && rules.pattern && !rules.pattern.test(value)) {
            showError(input, rules.message);
            return false;
        }

        showSuccess(input);
        return true;
    };

    const checkPasswordStrength = (password) => {
        const strengthIndicator = document.querySelector('.password-strength');
        if (!strengthIndicator) return;
        
        const value = password.value;

        if (!value) {
            strengthIndicator.className = 'password-strength';
            return;
        }

        const hasLower = /[a-z]/.test(value);
        const hasUpper = /[A-Z]/.test(value);
        const hasNumber = /\d/.test(value);
        const hasSpecial = /[@$!%*?&]/.test(value);
        const length = value.length >= 8;

        const strength = [hasLower, hasUpper, hasNumber, hasSpecial, length]
            .filter(Boolean).length;

        strengthIndicator.className = 'password-strength ' +
            (strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong');
    };

    // Tab switching with smooth transitions
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const formType = tab.getAttribute('data-form');
            
            // First update tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Then animate forms
            forms.forEach(form => {
                form.classList.remove('active');
            });
            
            // Small delay for better animation
            setTimeout(() => {
                document.getElementById(`${formType}Form`).classList.add('active');
            }, 50);
            
            // Clear only form-specific alerts, not server flash messages
            document.querySelectorAll('.alert:not(.alert-error):not(.alert-success):not(.alert-register):not(.alert-info):not(.alert-warning)').forEach(alert => {
                if (!alert.closest('.flashed-messages')) {
                    alert.textContent = '';
                    alert.className = 'alert';
                }
            });
            
            // Clear form validation styles
            document.querySelectorAll('.form-group').forEach(group => {
                group.classList.remove('error', 'success');
                const validationMessage = group.querySelector('.validation-message');
                if (validationMessage) {
                    validationMessage.textContent = '';
                }
            });
        });
    });

    // Password visibility toggle
    toggleButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent form submission
            const input = button.parentElement.querySelector('input');
            const eyeOpen = button.querySelector('.eye-open');
            const eyeClosed = button.querySelector('.eye-closed');
            
            if (input.type === 'password') {
                input.type = 'text';
                if (eyeOpen) eyeOpen.style.display = 'none';
                if (eyeClosed) eyeClosed.style.display = 'block';
            } else {
                input.type = 'password';
                if (eyeOpen) eyeOpen.style.display = 'block';
                if (eyeClosed) eyeClosed.style.display = 'none';
            }
        });
    });

    // Real-time validation
    document.querySelectorAll('input').forEach(input => {
        // Only validate on blur (when user leaves the field) or on input after user has interacted with the field
        input.addEventListener('blur', () => {
            validateInputField(input);
        });

        input.addEventListener('input', () => {
            // Only validate if user has already interacted with this field
            if (input.dataset.interacted === 'true') {
                validateInputField(input);
            }
        });

        // Mark the field as interacted when user focuses on it
        input.addEventListener('focus', () => {
            input.dataset.interacted = 'true';
        });
    });

    // Function to validate input fields
    function validateInputField(input) {
        if (input.id === 'regPassword') {
            checkPasswordStrength(input);
        }
        
        // Get rule key based on input id
        let ruleKey = input.id.toLowerCase();
        if (ruleKey.startsWith('reg')) {
            ruleKey = ruleKey.substring(3);
        }
        
        if (input.id !== 'confirmPassword' && VALIDATION_RULES[ruleKey]) {
            validateField(input, VALIDATION_RULES[ruleKey]);
        }
        
        // Check password match for confirm password field
        if (input.id === 'confirmPassword' || input.id === 'regPassword') {
            const password = document.getElementById('regPassword');
            const confirmPassword = document.getElementById('confirmPassword');
            
            if (confirmPassword.value && password.value !== confirmPassword.value) {
                showError(confirmPassword, 'Passwords do not match');
            } else if (confirmPassword.value) {
                showSuccess(confirmPassword);
            }
        }
    }

    // Login form submission with basic validation
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Always prevent default to handle validation

            const username = document.getElementById('username');
            const password = document.getElementById('password');
            
            // Mark fields as interacted for validation
            username.dataset.interacted = 'true';
            password.dataset.interacted = 'true';

            const isUsernameValid = validateField(username, VALIDATION_RULES.username);
            // For login, we'll be more lenient with password validation
            const isPasswordValid = password.value.trim() !== '';
            
            if (!isPasswordValid) {
                showError(password, 'Password is required');
            } else {
                showSuccess(password);
            }

            if (!isUsernameValid || !isPasswordValid) {
                showAlert('login', 'Please fix the errors above', 'error');
            } else {
                // Clear any previous error messages
                clearAlert('login');
                
                // If validation passes, submit the form
                loginForm.submit();
            }
        });
    }

    // Registration form submission with basic validation
    if (registerForm) {
        // Function to validate all fields and update submit button state
        const validateRegisterForm = () => {
            const fullName = document.getElementById('fullName');
            const mobile = document.getElementById('mobile');
            const username = document.getElementById('regUsername');
            const password = document.getElementById('regPassword');
            const confirmPassword = document.getElementById('confirmPassword');
            const submitBtn = registerForm.querySelector('.submit-btn');
            
            let isValid = true;
            
            // Only validate fields that have been interacted with
            // unless we're in submission mode (submitBtn.dataset.submitting === 'true')
            const shouldValidate = (field) => {
                return field.dataset.interacted === 'true' || submitBtn.dataset.submitting === 'true';
            };
            
            // Validate full name
            if (shouldValidate(fullName) && !validateField(fullName, VALIDATION_RULES.fullName)) {
                isValid = false;
            }
            
            // Validate mobile
            if (shouldValidate(mobile) && !validateField(mobile, VALIDATION_RULES.mobile)) {
                isValid = false;
            }
            
            // Validate username
            if (shouldValidate(username) && !validateField(username, VALIDATION_RULES.username)) {
                isValid = false;
            }
            
            // Check if the username field has an error class (which would be set by the validateUsername function)
            if (username.closest('.form-group').classList.contains('error') && 
                username.closest('.form-group').querySelector('.validation-message').textContent.includes('already exists')) {
                isValid = false;
            }
            
            // Validate password
            if (shouldValidate(password) && !validateField(password, VALIDATION_RULES.password)) {
                isValid = false;
            }
            
            // Check password strength
            if (shouldValidate(password)) {
                checkPasswordStrength(password);
            }
            
            // Validate confirm password
            if (shouldValidate(confirmPassword)) {
                if (!confirmPassword.value) {
                    showError(confirmPassword, 'Confirm password is required');
                    isValid = false;
                } else if (confirmPassword.value !== password.value) {
                    showError(confirmPassword, 'Passwords do not match');
                    isValid = false;
                } else {
                    showSuccess(confirmPassword);
                }
            }
            
            // Update submit button state
            if (isValid) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            } else {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
                submitBtn.style.cursor = 'not-allowed';
            }
            
            return isValid;
        };

        // Validate all fields on input change
        registerForm.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', validateRegisterForm);
        });

        registerForm.addEventListener('submit', async (e) => {
            // Prevent default submission and validate all fields
            e.preventDefault();
            
            // Mark all fields as interacted for validation
            registerForm.querySelectorAll('input').forEach(input => {
                input.dataset.interacted = 'true';
            });
            
            // Mark form as submitting to ensure all fields are validated
            const submitBtn = registerForm.querySelector('.submit-btn');
            submitBtn.dataset.submitting = 'true';
            
            // Show alert for missing fields at the beginning
            const fullName = document.getElementById('fullName');
            const mobile = document.getElementById('mobile');
            const username = document.getElementById('regUsername');
            const password = document.getElementById('regPassword');
            const confirmPassword = document.getElementById('confirmPassword');

            // Log form data for debugging
            console.log("Form data:", {
                fullName: fullName.value,
                mobile: mobile.value,
                username: username.value,
                password: password.value,
                confirmPassword: confirmPassword.value
            });

            if (!fullName.value.trim() || !mobile.value.trim() || 
                !username.value.trim() || !password.value.trim() || 
                !confirmPassword.value.trim()) {
                
                showAlert('register', 'All fields are required', 'error');
                // Reset submitting state
                submitBtn.dataset.submitting = 'false';
                return;
            }
            
            // First check if the username is available
            try {
                const usernameResponse = await fetch('/api/check-username', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username: username.value.trim() })
                });
                
                const usernameData = await usernameResponse.json();
                
                if (!usernameData.available) {
                    // Username is already taken, show error
                    showAlert('register', 'Username already exists. Please choose another one.', 'error');
                    showError(username, 'Username already exists');
                    // Reset submitting state
                    submitBtn.dataset.submitting = 'false';
                    return;
                }
                
                // Username is available, continue with validation
                // Validate all form fields
                if (validateRegisterForm()) {
                    // Clear any previous error messages
                    clearAlert('register');
                    
                    // Form is valid, submit it manually via normal form submission
                    registerForm.submit();
                } else {
                    // Show error message
                    showAlert('register', 'Please fix the errors above', 'error');
                    
                    // Reset submitting state
                    submitBtn.dataset.submitting = 'false';
                }
            } catch (error) {
                console.error('Error checking username:', error);
                showAlert('register', 'An error occurred. Please try again.', 'error');
                submitBtn.dataset.submitting = 'false';
            }
        });
    }

    // Function to validate username
    async function validateUsername(username) {
        try {
            const response = await fetch('/api/check-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: username })
            });
            const data = await response.json();
            
            const validationMessage = regUsername.parentElement.querySelector('.validation-message');
            
            if (!data.available) {
                validationMessage.style.display = 'block';
                validationMessage.textContent = 'Username already exists';
                validationMessage.style.color = 'var(--danger)';
                regUsername.parentElement.classList.add('error');
                regUsername.parentElement.classList.remove('success');
                regSubmitBtn.disabled = true;
                regSubmitBtn.style.opacity = '0.5';
                regSubmitBtn.style.cursor = 'not-allowed';
                // Store that this username is taken
                regUsername.dataset.taken = 'true';
            } else {
                validationMessage.style.display = 'block';
                validationMessage.textContent = 'Username is available';
                validationMessage.style.color = 'var(--success)';
                regUsername.parentElement.classList.remove('error');
                regUsername.parentElement.classList.add('success');
                regSubmitBtn.disabled = false;
                regSubmitBtn.style.opacity = '1';
                regSubmitBtn.style.cursor = 'pointer';
                // Clear the taken flag
                regUsername.dataset.taken = 'false';
            }
        } catch (error) {
            console.error('Error checking username:', error);
        }
    }

    // Add input event listener with debounce
    regUsername.addEventListener('input', function(e) {
        const username = e.target.value.trim();
        
        // Clear any existing timeout
        if (usernameTimeout) {
            clearTimeout(usernameTimeout);
        }
        
        // If username is empty, clear validation
        if (!username) {
            const validationMessage = regUsername.parentElement.querySelector('.validation-message');
            validationMessage.style.display = 'none';
            regUsername.parentElement.classList.remove('error');
            regUsername.parentElement.classList.remove('success');
            regUsername.dataset.taken = '';
            return;
        }
        
        // Set new timeout for validation
        usernameTimeout = setTimeout(() => {
            validateUsername(username);
        }, 500); // Wait 500ms after user stops typing
    });

    // Add an event listener for when the username field loses focus
    regUsername.addEventListener('blur', function() {
        // If the field has a taken flag, re-validate
        if (regUsername.dataset.taken === 'true') {
            // Keep the error state
            const validationMessage = regUsername.parentElement.querySelector('.validation-message');
            validationMessage.style.display = 'block';
            validationMessage.textContent = 'Username already exists';
            validationMessage.style.color = 'var(--danger)';
            regUsername.parentElement.classList.add('error');
            regUsername.parentElement.classList.remove('success');
            regSubmitBtn.disabled = true;
            regSubmitBtn.style.opacity = '0.5';
            regSubmitBtn.style.cursor = 'not-allowed';
        }
    });

    // Add input event listener to mobile field to prevent non-numeric characters
    const mobileField = document.getElementById('mobile');
    if (mobileField) {
        mobileField.addEventListener('input', function(e) {
            // Replace any non-digit character with empty string
            this.value = this.value.replace(/\D/g, '');
            
            // Limit to 10 digits
            if (this.value.length > 10) {
                this.value = this.value.substring(0, 10);
            }
            
            // Mark as interacted
            this.dataset.interacted = 'true';
            
            // Validate after change
            validateRegisterForm();
        });
    }

    // Handle flashed messages
    const flashedMessages = document.querySelector('.flashed-messages');
    if (flashedMessages && flashedMessages.innerHTML.trim() !== '') {
        // Add animation to flashed messages
        flashedMessages.style.animation = 'fadeIn 0.5s ease-out';
        
        // Check if there's a register message and switch to register tab
        const registerMessage = document.querySelector('.alert.alert-register');
        if (registerMessage) {
            // Highlight the register tab
            const registerTab = document.querySelector('.tab[data-form="register"]');
            if (registerTab) {
                // Trigger click on register tab
                setTimeout(() => {
                    registerTab.click();
                }, 300);
            }
        }

        // Check if there's a success message and move it to the notification display
        const successMessage = document.querySelector('.flash-success');
        if (successMessage && notification) {
            // Copy the text to the notification
            notification.textContent = successMessage.textContent;
            
            // Remove the original success message
            successMessage.remove();
            
            // Show notification with animation
            notification.style.display = 'block';
            notification.classList.add('show');
            notification.classList.add('animate');
            
            // Remove the notification after animation ends
            notification.addEventListener('animationend', () => {
                notification.classList.remove('show');
                notification.classList.remove('animate');
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 300);
            }, { once: true });
        }
        
        // Automatically clear flashed error messages after a delay
        setTimeout(() => {
            const errorMessages = document.querySelectorAll('.alert.alert-error');
            errorMessages.forEach(message => {
                message.style.animation = 'fadeOut 0.5s ease-out';
                setTimeout(() => {
                    message.remove();
                }, 500);
            });
        }, 5000);
    }

    // Forgot Password link
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Hide login form
            loginForm.classList.remove('active');
            
            // Show forgot password form after a small delay
            setTimeout(() => {
                forgotPasswordForm.classList.add('active');
            }, 100);
        });
    }

    // Back to Login link
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Hide forgot password form
            forgotPasswordForm.classList.remove('active');
            
            // Show login form after a small delay
            setTimeout(() => {
                loginForm.classList.add('active');
            }, 100);
        });
    }
});
