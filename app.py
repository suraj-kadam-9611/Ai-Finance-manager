import os
import logging
import sqlite3
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import json
from calendar import monthrange
from extensions import db
import random
import string
from sqlalchemy import func, extract
import calendar

# Database connection function
def get_db_connection():
    conn = sqlite3.connect('instance/financial_assistant.db')
    conn.row_factory = sqlite3.Row
    return conn

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "financial-assistant-secret-key")

# Session configuration
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)  # Session expires after 30 minutes
app.config['SESSION_COOKIE_SECURE'] = True  # Only send cookie over HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access to session cookie
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///financial_assistant.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Add connection pool settings based on database type
db_uri = app.config['SQLALCHEMY_DATABASE_URI']
if db_uri.startswith('postgresql'):
    # PostgreSQL specific settings
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_recycle': 280,
        'pool_timeout': 20,
        'pool_pre_ping': True,
        'connect_args': {
            'connect_timeout': 10
        }
    }
else:
    # SQLite and other databases
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_recycle': 280,
        'pool_timeout': 20,
        'pool_pre_ping': True
    }

# Initialize the db with the app
db.init_app(app)

# Import models after db initialization to avoid circular imports
from models import User, Expense, FinancialGoal, Income

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page', 'error')
            return redirect(url_for('login'))
        
        # Check if session is expired
        if 'last_activity' in session:
            last_activity = datetime.fromisoformat(session['last_activity'])
            if datetime.now() - last_activity > timedelta(minutes=30):
                session.clear()
                flash('Your session has expired. Please log in again.', 'info')
                return redirect(url_for('login'))
        
        # Update last activity timestamp
        session['last_activity'] = datetime.now().isoformat()
        return f(*args, **kwargs)
    return decorated_function

# Routes for authentication
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['last_activity'] = datetime.now().isoformat()
            session.permanent = True  # Use permanent session with lifetime
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            # Check if the username doesn't exist
            if not User.query.filter_by(username=username).first():
                flash('Username not found. Please register to create an account.', 'register')
            else:
                flash('Invalid username or password. Please try again.', 'error')
    
    return render_template('login.html')

@app.route('/register', methods=['POST'])
def register():
    username = request.form.get('regUsername')
    password = request.form.get('regPassword')
    confirm_password = request.form.get('confirmPassword')
    full_name = request.form.get('fullName')
    mobile = request.form.get('mobile')
    
    # Debug log to check form data
    app.logger.debug(f"Form data: {request.form}")
    
    if not username or not password or not confirm_password or not full_name or not mobile:
        flash('All fields are required', 'error')
        return redirect(url_for('login'))
    
    if password != confirm_password:
        flash('Passwords do not match', 'error')
        return redirect(url_for('login'))
    
    user = User.query.filter_by(username=username).first()
    if user:
        flash('Username already exists. Please choose another one.', 'error')
        return redirect(url_for('login'))
    
    try:
        hashed_password = generate_password_hash(password)
        new_user = User(
            username=username,
            password=hashed_password,
            full_name=full_name,
            mobile=mobile
        )
        db.session.add(new_user)
        db.session.commit()
        
        # Return to login page with show_reg_success flag to display notification
        return render_template('login.html', show_reg_success=True)
    except Exception as e:
        db.session.rollback()
        logging.error(f"Registration error: {e}")
        flash('An error occurred during registration. Please try again.', 'error')
        return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    flash('You have been logged out successfully', 'info')
    return redirect(url_for('login'))

# Main application routes
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Get some basic metrics for the dashboard
    user_id = session.get('user_id')
    
    # Get the current user
    user = User.query.get(user_id)
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('logout'))

    # Calculate monthly expenses
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Filter expenses for the current month
    monthly_expenses = Expense.query.filter(
        Expense.user_id == user_id,
        db.extract('month', Expense.date) == current_month,
        db.extract('year', Expense.date) == current_year
    ).all()
    
    total_expenses = sum(expense.amount for expense in monthly_expenses)
    
    # User's income and savings
    monthly_income = user.monthly_income or 0
    total_savings = monthly_income - total_expenses if monthly_income > 0 else 0
    
    # Count active goals
    active_goals = FinancialGoal.query.filter_by(
        user_id=user_id, 
        is_completed=False
    ).count()
    
    # Passing the user's currency preference
    currency = user.currency if user else 'INR'
    
    return render_template(
        'dashboard.html',
        total_expenses=total_expenses,
        total_savings=total_savings,
        active_goals=active_goals,
        monthly_income=monthly_income,
        currency=currency,
        css_files=['dashboard.css']
    )

@app.route('/expenses')
@login_required
def expenses():
    # Get the current user
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('logout'))
        
    # Get user's currency
    currency = user.currency if user else 'INR'
    
    return render_template('expenses.html', 
                          currency=currency,
                          css_files=['expenses.css'])

@app.route('/goals')
@login_required
def goals():
    # Get the current user
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('logout'))
        
    # Get user's currency
    currency = user.currency if user else 'INR'
    
    return render_template('goals.html',
                          currency=currency,
                          css_files=['goals.css'])

# API Routes for expenses
@app.route('/api/expenses', methods=['GET'])
@login_required
def get_expenses():
    user_id = session.get('user_id')
    limit = request.args.get('limit', None)
    month = request.args.get('month', None)
    year = request.args.get('year', None)
    
    # Base query
    query = Expense.query.filter_by(user_id=user_id)
    
    # Apply month/year filter if provided
    if month and year:
        try:
            month = int(month)
            year = int(year)
            query = query.filter(
                db.extract('month', Expense.date) == month,
                db.extract('year', Expense.date) == year
            )
        except ValueError:
            pass
    
    # Get expenses
    expenses = query.order_by(Expense.date.desc()).all()
    
    # Apply limit if provided
    if limit:
        try:
            limit = int(limit)
            expenses = expenses[:limit]
        except ValueError:
            pass
    
    expense_list = []
    for expense in expenses:
        expense_list.append({
            'id': expense.id,
            'amount': expense.amount,
            'category': expense.category,
            'description': expense.description,
            'date': expense.date.strftime('%Y-%m-%d')
        })
    
    return jsonify({
        'success': True,
        'expenses': expense_list
    })

@app.route('/api/monthly-expenses', methods=['GET'])
@login_required
def get_monthly_expenses():
    user_id = session.get('user_id')
    
    # Get month and year from query params or use current month/year
    try:
        month = int(request.args.get('month', datetime.now().month))
        year = int(request.args.get('year', datetime.now().year))
    except ValueError:
        month = datetime.now().month
        year = datetime.now().year
    
    # Filter expenses for the specified month
    expenses = Expense.query.filter(
        Expense.user_id == user_id,
        db.extract('month', Expense.date) == month,
        db.extract('year', Expense.date) == year
    ).all()
    
    # Calculate total and group by category
    total_amount = sum(expense.amount for expense in expenses)
    
    # Group expenses by category
    categories = {}
    for expense in expenses:
        if expense.category in categories:
            categories[expense.category] += expense.amount
        else:
            categories[expense.category] = expense.amount
    
    # Convert to list of objects
    category_data = [
        {'category': category, 'amount': amount}
        for category, amount in categories.items()
    ]
    
    return jsonify({
        'success': True,
        'total': total_amount,
        'month': month,
        'year': year,
        'categories': category_data
    })

@app.route('/api/expenses', methods=['POST'])
@login_required
def add_expense():
    user_id = session.get('user_id')
    data = request.json
    
    try:
        amount = float(data.get('amount'))
        category = data.get('category')
        description = data.get('description', '')
        date_str = data.get('date')
        
        if not amount or not category or not date_str:
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Parse date
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid date format. Use YYYY-MM-DD.'
            }), 400
        
        # Create and save expense
        new_expense = Expense(
            user_id=user_id,
            amount=amount,
            category=category,
            description=description,
            date=date
        )
        db.session.add(new_expense)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'expense': {
                'id': new_expense.id,
                'amount': new_expense.amount,
                'category': new_expense.category,
                'description': new_expense.description,
                'date': new_expense.date.strftime('%Y-%m-%d')
            }
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error adding expense: {e}")
        return jsonify({
            'success': False,
            'message': f'Error adding expense: {str(e)}'
        }), 500

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
def delete_expense(expense_id):
    user_id = session.get('user_id')
    
    try:
        expense = Expense.query.filter_by(id=expense_id, user_id=user_id).first()
        
        if not expense:
            return jsonify({
                'success': False,
                'message': 'Expense not found or not authorized'
            }), 404
        
        db.session.delete(expense)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Expense deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting expense: {e}")
        return jsonify({
            'success': False,
            'message': f'Error deleting expense: {str(e)}'
        }), 500

@app.route('/api/expense-trend')
@login_required
def expense_trend():
    """Get expense trend data for visualization."""
    try:
        # Get request parameters
        range_param = request.args.get('range', 'month')
        user_id = session.get('user_id')
        
        print(f"[DEBUG] Expense trend API called with: range={range_param}, user_id={user_id}")
        print(f"[DEBUG] Request args: {request.args}")
        print(f"[DEBUG] Request URL: {request.url}")
        
        # Initialize empty values
        labels = []
        values = []
        
        # Check if we have any expenses, but only for the current year to avoid showing last year's data
        current_year = datetime.now().year
        total_count = Expense.query.filter(
            Expense.user_id == user_id,
            extract('year', Expense.date) == current_year
        ).count()
        print(f"[DEBUG] Total expense count for user {user_id} in current year: {total_count}")
        
        if total_count == 0:
            print(f"[DEBUG] No expenses found for user {user_id}")
            return jsonify({
                'success': True,
                'labels': labels,
                'values': values,
                'message': 'No expense data available'
            })
        
        if range_param == 'week':
            # Get daily expenses for the last 7 days
            today = datetime.now().date()
            start_date = today - timedelta(days=6)
            print(f"[DEBUG] Fetching weekly data from {start_date} to {today}")
            
            # Query daily expenses - ensure we only get current year data
            daily_expenses = db.session.query(
                func.date(Expense.date).label('date'),
                func.sum(Expense.amount).label('total')
            ).filter(
                Expense.user_id == user_id,
                Expense.date >= start_date,
                Expense.date <= today,  # Ensure we don't include future expenses
                extract('year', Expense.date) == current_year  # Only include current year
            ).group_by(
                func.date(Expense.date)
            ).order_by(
                func.date(Expense.date)
            ).all()
            
            print(f"[DEBUG] Found {len(daily_expenses)} days with expenses")
            
            # Create dict for quick lookup with all days initialized to 0
            all_days = {}
            for i in range(7):
                day = (today - timedelta(days=6-i))
                all_days[day.strftime('%Y-%m-%d')] = 0
            
            # Fill in actual data
            for expense in daily_expenses:
                # Handle date object properly - check if it's a string or date object
                if isinstance(expense.date, str):
                    date_str = expense.date
                else:
                    date_str = expense.date.strftime('%Y-%m-%d')
                
                if date_str in all_days:
                    all_days[date_str] = float(expense.total)
            
            # Convert to arrays for chart.js
            for date_str, amount in all_days.items():
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                labels.append(date_obj.strftime('%a'))
                values.append(amount)
            
        elif range_param == 'month':
            # Get current month and year
            today = datetime.now()
            current_month = today.month
            current_year = today.year
            print(f"[DEBUG] Fetching monthly data for {current_month}/{current_year}")
            
            # Get number of days in current month
            last_day = calendar.monthrange(current_year, current_month)[1]
            
            # Create dict for all days in month initialized to 0
            all_days = {}
            for day in range(1, last_day + 1):
                date = datetime(current_year, current_month, day).date()
                all_days[date.strftime('%Y-%m-%d')] = 0
            
            # Query daily expenses for current month
            daily_expenses = db.session.query(
                func.date(Expense.date).label('date'),
                func.sum(Expense.amount).label('total')
            ).filter(
                Expense.user_id == user_id,
                extract('month', Expense.date) == current_month,
                extract('year', Expense.date) == current_year
            ).group_by(
                func.date(Expense.date)
            ).all()
            
            print(f"[DEBUG] Found {len(daily_expenses)} days with expenses in current month")
            
            # Fill in actual data
            for expense in daily_expenses:
                # Handle date object properly - check if it's a string or date object
                if isinstance(expense.date, str):
                    date_str = expense.date
                else:
                    date_str = expense.date.strftime('%Y-%m-%d')
                
                if date_str in all_days:
                    all_days[date_str] = float(expense.total)
                    print(f"[DEBUG] Date {date_str}: Amount {expense.total}")
            
            # Convert to arrays for chart.js
            for date_str, amount in sorted(all_days.items()):
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                labels.append(date_obj.strftime('%d'))  # Day of month
                values.append(amount)
            
        else:  # yearly
            # Get monthly expenses for the current year
            current_year = datetime.now().year
            print(f"[DEBUG] Fetching yearly data for {current_year}")
            
            # Query monthly expenses
            monthly_expenses = db.session.query(
                extract('month', Expense.date).label('month'),
                func.sum(Expense.amount).label('total')
            ).filter(
                Expense.user_id == user_id,
                extract('year', Expense.date) == current_year
            ).group_by(
                extract('month', Expense.date)
            ).order_by(
                extract('month', Expense.date)
            ).all()
            
            print(f"[DEBUG] Found {len(monthly_expenses)} months with expenses")
            
            # Initialize all months to 0
            all_months = {i: 0 for i in range(1, 13)}
            
            # Fill in actual data
            for expense in monthly_expenses:
                month_num = int(expense.month)
                all_months[month_num] = float(expense.total)
                print(f"[DEBUG] Month {month_num}: Amount {expense.total}")
            
            # Convert to arrays for chart.js
            month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            for month_num, amount in all_months.items():
                labels.append(month_names[month_num - 1])
                values.append(amount)
        
        print(f"[DEBUG] Final labels: {labels}")
        print(f"[DEBUG] Final values: {values}")
        
        return jsonify({
            'success': True,
            'labels': labels,
            'values': values
        })
        
    except Exception as e:
        print(f"[DEBUG] Error in expense trend API: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to fetch expense trend data',
            'error': str(e)
        })

@app.route('/api/expense-categories', methods=['GET'])
@login_required
def get_expense_categories():
    user_id = session.get('user_id')
    
    # Get current year for filtering
    current_year = datetime.now().year
    
    # Get expenses for the current user - only for the current year
    expenses = Expense.query.filter(
        Expense.user_id == user_id,
        extract('year', Expense.date) == current_year  # Only include current year data
    ).all()
    
    # Group expenses by category
    categories = {}
    for expense in expenses:
        if expense.category in categories:
            categories[expense.category] += expense.amount
        else:
            categories[expense.category] = expense.amount
    
    # Convert to list of objects
    result = [
        {'category': category, 'amount': amount}
        for category, amount in categories.items()
    ]
    
    return jsonify({
        'success': True,
        'categories': result
    })

@app.route('/api/update-profile', methods=['POST'])
@login_required
def update_profile():
    user_id = session.get('user_id')
    data = request.json
    
    try:
        monthly_income = data.get('monthlyIncome')
        savings_goal = data.get('savingsGoal')
        emergency_fund = data.get('emergencyFund')
        financial_goal = data.get('financialGoal')
        currency = data.get('currency')
        
        user = User.query.get(user_id)
        if user:
            user.monthly_income = float(monthly_income) if monthly_income else 0
            user.savings_goal = float(savings_goal) if savings_goal else 0
            user.emergency_fund = float(emergency_fund) if emergency_fund else 0
            user.financial_goal = financial_goal
            
            # Update currency if provided
            if currency and currency in ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']:
                user.currency = currency
                
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Profile updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating profile: {e}")
        return jsonify({
            'success': False,
            'message': f'Error updating profile: {str(e)}'
        }), 500
        
# Get user profile data
@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({
            'success': False,
            'message': 'User not found'
        }), 404
    
    return jsonify({
        'success': True,
        'profile': {
            'username': user.username,
            'fullName': user.full_name,
            'mobile': user.mobile,
            'monthlyIncome': user.monthly_income,
            'savingsGoal': user.savings_goal,
            'emergencyFund': user.emergency_fund,
            'financialGoal': user.financial_goal,
            'currency': user.currency
        }
    })

# Currency options API
@app.route('/api/currency-options', methods=['GET'])
def get_currency_options():
    currencies = [
        {'code': 'INR', 'name': 'Indian Rupee', 'symbol': '₹'},
        {'code': 'USD', 'name': 'US Dollar', 'symbol': '$'},
        {'code': 'EUR', 'name': 'Euro', 'symbol': '€'},
        {'code': 'GBP', 'name': 'British Pound', 'symbol': '£'},
        {'code': 'JPY', 'name': 'Japanese Yen', 'symbol': '¥'},
        {'code': 'CAD', 'name': 'Canadian Dollar', 'symbol': 'CA$'},
        {'code': 'AUD', 'name': 'Australian Dollar', 'symbol': 'A$'}
    ]
    
    return jsonify({
        'success': True,
        'currencies': currencies
    })

# API Routes for Financial Goals
@app.route('/api/goals', methods=['GET'])
@login_required
def get_goals():
    user_id = session.get('user_id')
    goals = FinancialGoal.query.filter_by(user_id=user_id).all()
    
    goal_list = []
    for goal in goals:
        goal_list.append({
            'id': goal.id,
            'title': goal.title,
            'description': goal.description,
            'goalType': goal.goal_type,
            'targetAmount': goal.target_amount,
            'currentAmount': goal.current_amount,
            'startDate': goal.start_date.strftime('%Y-%m-%d'),
            'targetDate': goal.target_date.strftime('%Y-%m-%d'),
            'priority': goal.priority,
            'isCompleted': goal.is_completed,
            'milestonesReached': goal.milestones_reached,
            'progressPercentage': goal.get_progress_percentage(),
            'daysRemaining': goal.get_days_remaining(),
            'isOnTrack': goal.is_on_track()
        })
    
    return jsonify({
        'success': True,
        'goals': goal_list
    })

@app.route('/api/goals', methods=['POST'])
@login_required
def add_goal():
    user_id = session.get('user_id')
    data = request.json
    
    try:
        title = data.get('title')
        description = data.get('description', '')
        goal_type = data.get('goalType')
        target_amount = float(data.get('targetAmount', 0))
        current_amount = float(data.get('currentAmount', 0))
        target_date_str = data.get('targetDate')
        priority = int(data.get('priority', 3))
        
        if not title or not goal_type or not target_amount or not target_date_str:
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Parse date
        try:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid date format. Use YYYY-MM-DD.'
            }), 400
        
        # Create and save goal
        new_goal = FinancialGoal(
            user_id=user_id,
            title=title,
            description=description,
            goal_type=goal_type,
            target_amount=target_amount,
            current_amount=current_amount,
            target_date=target_date,
            priority=priority
        )
        db.session.add(new_goal)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'goal': {
                'id': new_goal.id,
                'title': new_goal.title,
                'goalType': new_goal.goal_type,
                'targetAmount': new_goal.target_amount,
                'progressPercentage': new_goal.get_progress_percentage(),
                'daysRemaining': new_goal.get_days_remaining()
            }
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error adding goal: {e}")
        return jsonify({
            'success': False,
            'message': f'Error adding goal: {str(e)}'
        }), 500

@app.route('/api/goals/<int:goal_id>', methods=['PUT'])
@login_required
def update_goal(goal_id):
    user_id = session.get('user_id')
    data = request.json
    
    try:
        goal = FinancialGoal.query.filter_by(id=goal_id, user_id=user_id).first()
        
        if not goal:
            return jsonify({
                'success': False,
                'message': 'Goal not found or unauthorized access'
            }), 404
        
        # Update fields
        if 'title' in data:
            goal.title = data.get('title')
        if 'description' in data:
            goal.description = data.get('description', '')
        if 'goalType' in data:
            goal.goal_type = data.get('goalType')
        if 'targetAmount' in data:
            goal.target_amount = float(data.get('targetAmount', 0))
        if 'currentAmount' in data:
            goal.current_amount = float(data.get('currentAmount', 0))
        if 'targetDate' in data:
            try:
                goal.target_date = datetime.strptime(data.get('targetDate'), '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid date format. Use YYYY-MM-DD.'
                }), 400
        if 'priority' in data:
            goal.priority = int(data.get('priority', 3))
        
        # Check if goal is completed
        if goal.current_amount >= goal.target_amount:
            goal.is_completed = True
            goal.current_amount = goal.target_amount  # Cap at target amount
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'goal': {
                'id': goal.id,
                'title': goal.title,
                'goalType': goal.goal_type,
                'targetAmount': goal.target_amount,
                'currentAmount': goal.current_amount,
                'progressPercentage': goal.get_progress_percentage(),
                'daysRemaining': goal.get_days_remaining(),
                'isCompleted': goal.is_completed
            }
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating goal: {e}")
        return jsonify({
            'success': False,
            'message': f'Error updating goal: {str(e)}'
        }), 500

@app.route('/api/goals/<int:goal_id>/progress', methods=['PUT'])
@login_required
def update_goal_progress(goal_id):
    user_id = session.get('user_id')
    data = request.json
    
    try:
        goal = FinancialGoal.query.filter_by(id=goal_id, user_id=user_id).first()
        
        if not goal:
            return jsonify({
                'success': False,
                'message': 'Goal not found or unauthorized access'
            }), 404
        
        # Get the new amount
        # Support both camelCase and snake_case for client compatibility
        new_amount = float(data.get('current_amount', data.get('currentAmount', 0)))
        
        # Validate amount
        if new_amount < 0:
            return jsonify({
                'success': False,
                'message': 'Current amount cannot be negative'
            }), 400
        
        if new_amount > goal.target_amount:
            new_amount = goal.target_amount  # Cap at target amount
        
        # Calculate old and new percentages
        old_percentage = goal.get_progress_percentage()
        
        # Update the amount
        goal.current_amount = new_amount
        
        # Calculate new percentage
        new_percentage = goal.get_progress_percentage()
        
        # Check if milestone reached
        milestone_reached = False
        milestone_lost = False
        
        # Handle milestone changes
        # First check if the progress decreased
        if new_percentage < old_percentage:
            # Reset milestones based on new percentage, but only if they need to change
            # Use precise comparisons to avoid floating point issues (new_percentage should be exactly < 25.0)
            if new_percentage < 25.0:
                if goal.milestones_reached > 0:
                    # If previously we had any milestones, now we have none
                    goal.milestones_reached = 0
                    milestone_lost = 25
            elif new_percentage < 50.0:
                if goal.milestones_reached > 1:
                    # If we had 50%, 75% or 100% milestone, now we only have 25%
                    goal.milestones_reached = 1
                    milestone_lost = 50
            elif new_percentage < 75.0:
                if goal.milestones_reached > 2:
                    # If we had 75% or 100% milestone, now we only have 25% and 50%
                    goal.milestones_reached = 2
                    milestone_lost = 75
            elif new_percentage < 100.0:
                if goal.milestones_reached > 3:
                    # If we had 100% milestone, now we have 25%, 50%, and 75%
                    goal.milestones_reached = 3
                    milestone_lost = 100
        else:
            # Check for milestone increases (25%, 50%, 75%, 100%)
            # Use a more precise comparison to avoid triggering at 24.998%
            for milestone in [25, 50, 75, 100]:
                # The key is to use a precise threshold - only trigger when we're truly past the milestone
                # Adding a small buffer (0.01%) to ensure we're definitely past the milestone
                if old_percentage < milestone and new_percentage >= milestone:
                    milestone_reached = True
                    if milestone == 25 and goal.milestones_reached < 1:
                        goal.milestones_reached = 1
                    elif milestone == 50 and goal.milestones_reached < 2:
                        goal.milestones_reached = 2
                    elif milestone == 75 and goal.milestones_reached < 3:
                        goal.milestones_reached = 3
                    elif milestone == 100 and goal.milestones_reached < 4:
                        goal.milestones_reached = 4
        
        # Set completed status based on percentage
        if new_percentage >= 100:
            goal.is_completed = True
        else:
            # If percentage is below 100%, ensure is_completed is False
            goal.is_completed = False
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'goal': {
                'id': goal.id,
                'currentAmount': goal.current_amount,
                'progressPercentage': goal.get_progress_percentage(),
                'isCompleted': goal.is_completed,
                'milestonesReached': goal.milestones_reached,
                'milestoneReached': milestone_reached,
                'milestoneLost': milestone_lost
            }
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating goal progress: {e}")
        return jsonify({
            'success': False,
            'message': f'Error updating goal progress: {str(e)}'
        }), 500

@app.route('/api/goals/<int:goal_id>', methods=['DELETE'])
@login_required
def delete_goal(goal_id):
    user_id = session.get('user_id')
    
    try:
        goal = FinancialGoal.query.filter_by(id=goal_id, user_id=user_id).first()
        
        if not goal:
            return jsonify({
                'success': False,
                'message': 'Goal not found or not authorized'
            }), 404
        
        db.session.delete(goal)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Goal deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting goal: {e}")
        return jsonify({
            'success': False,
            'message': f'Error deleting goal: {str(e)}'
        }), 500

@app.route('/api/check-username', methods=['POST'])
def check_username():
    username = request.json.get('username')
    if not username:
        return jsonify({
            'available': False,
            'message': 'Username is required'
        })
    
    # Check if username exists
    user_exists = User.query.filter_by(username=username).first() is not None
    
    return jsonify({
        'available': not user_exists,
        'message': 'Username is already taken' if user_exists else 'Username is available'
    })

@app.route('/api/dashboard-data')
@login_required
def get_dashboard_data():
    period = request.args.get('period', 'week')
    
    # Get current date and start date based on period
    end_date = datetime.now()
    if period == 'week':
        start_date = end_date - timedelta(days=7)
    else:  # month
        start_date = end_date - timedelta(days=30)
    
    # Query expenses for the period
    expenses = Expense.query.filter(
        Expense.user_id == session.get('user_id'),
        Expense.date >= start_date,
        Expense.date <= end_date
    ).all()
    
    # Calculate metrics
    total_expenses = sum(expense.amount for expense in expenses)
    monthly_income = Income.query.filter_by(user_id=session.get('user_id')).first()
    monthly_income_amount = monthly_income.amount if monthly_income else 0
    savings = monthly_income_amount - total_expenses if monthly_income_amount > 0 else 0
    
    # Group expenses by date for distribution chart
    expense_distribution = {}
    for expense in expenses:
        date_str = expense.date.strftime('%Y-%m-%d')
        expense_distribution[date_str] = expense_distribution.get(date_str, 0) + expense.amount
    
    # Sort expenses by date for the chart
    sorted_dates = sorted(expense_distribution.keys())
    
    # Get recent expenses (last 5)
    recent_expenses = Expense.query.filter_by(user_id=session.get('user_id')) \
        .order_by(Expense.date.desc()) \
        .limit(5) \
        .all()
    
    return jsonify({
        'metrics': {
            'totalExpenses': total_expenses,
            'monthlyIncome': monthly_income_amount,
            'savings': savings
        },
        'expenseDistribution': {
            'labels': sorted_dates,
            'values': [expense_distribution[date] for date in sorted_dates]
        },
        'recentExpenses': [{
            'date': expense.date.strftime('%Y-%m-%d'),
            'category': expense.category,
            'amount': expense.amount
        } for expense in recent_expenses]
    })

@app.route('/api/expense-distribution', methods=['GET'])
@login_required
def get_expense_distribution():
    user_id = session.get('user_id')
    period = request.args.get('period', 'week')
    
    # Calculate date range based on period
    end_date = datetime.now()
    current_year = end_date.year
    
    # Determine appropriate time range based on period selection
    if period == 'week':
        start_date = end_date - timedelta(days=7)
    elif period == 'month':
        start_date = end_date.replace(day=1)
    elif period == 'last_6_months':
        # Last 6 months from current date
        start_date = end_date - timedelta(days=180)
    else:
        # Default to week if invalid period
        start_date = end_date - timedelta(days=7)
    
    # Get expenses within the date range AND only for the current year
    expenses = Expense.query.filter(
        Expense.user_id == user_id,
        Expense.date >= start_date,
        Expense.date <= end_date,
        extract('year', Expense.date) == current_year  # Ensure we only get current year data
    ).all()
    
    # Group expenses by category
    categories = {}
    for expense in expenses:
        category = expense.category
        if category in categories:
            categories[category] += expense.amount
        else:
            categories[category] = expense.amount
    
    # Sort by amount (descending)
    sorted_categories = dict(sorted(categories.items(), key=lambda item: item[1], reverse=True))
    
    return jsonify({
        'success': True,
        'distribution': sorted_categories,
        'period': period
    })

@app.route('/api/recent-expenses')
@login_required
def get_recent_expenses():
    user_id = session.get('user_id')
    current_year = datetime.now().year
    
    try:
        # Get only current year expenses for consistency
        expenses = Expense.query.filter(
            Expense.user_id == user_id, 
            extract('year', Expense.date) == current_year
        ).order_by(Expense.date.desc()).limit(5).all()
        
        expense_list = []
        for expense in expenses:
            expense_list.append({
                'id': expense.id,
                'date': expense.date.strftime('%Y-%m-%d'),
                'category': expense.category,
                'description': expense.description,
                'amount': expense.amount
            })
        
        return jsonify(expense_list)
    except Exception as e:
        logging.error(f"Error fetching recent expenses: {e}")
        return jsonify([])

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    username = request.form.get('recover_username')
    mobile = request.form.get('recover_mobile')
    
    # Find user by username and mobile number
    user = User.query.filter_by(username=username).first()
    
    if not user or user.mobile != mobile:
        flash('No account found with that username and mobile number', 'error')
        return redirect(url_for('login'))
    
    # Generate a 6-digit OTP
    otp = ''.join(random.choices(string.digits, k=6))
    
    # Store OTP in database
    user.reset_otp = otp
    user.reset_otp_created_at = datetime.now()
    user.reset_otp_attempts = 0
    
    try:
        db.session.commit()
        
        # In a real app, send the OTP via SMS to the user's mobile number
        # For demonstration, we'll just flash it on screen
        flash(f'Your OTP is: {otp} (In a real app, this would be sent to your mobile number)', 'info')
        
        # Store username in session for the verify_otp route
        session['reset_username'] = username
        
        return redirect(url_for('verify_otp'))
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error generating OTP: {e}")
        flash('An error occurred. Please try again.', 'error')
        return redirect(url_for('login'))

@app.route('/verify-otp', methods=['GET', 'POST'])
def verify_otp():
    if 'reset_username' not in session:
        flash('Please start the password reset process again', 'error')
        return redirect(url_for('login'))
    
    username = session['reset_username']
    user = User.query.filter_by(username=username).first()
    
    if not user:
        session.pop('reset_username', None)
        flash('User not found. Please try again.', 'error')
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        otp = request.form.get('otp')
        
        # Check if OTP is valid
        if not user.reset_otp or user.reset_otp != otp:
            user.reset_otp_attempts += 1
            db.session.commit()
            
            # Limit failed attempts
            if user.reset_otp_attempts >= 3:
                user.reset_otp = None
                user.reset_otp_created_at = None
                user.reset_otp_attempts = 0
                db.session.commit()
                
                session.pop('reset_username', None)
                flash('Too many failed attempts. Please restart the password reset process.', 'error')
                return redirect(url_for('login'))
            
            flash('Invalid OTP. Please try again.', 'error')
            return render_template('verify_otp.html')
        
        # Check if OTP is expired (15 minutes)
        if datetime.now() - user.reset_otp_created_at > timedelta(minutes=15):
            user.reset_otp = None
            user.reset_otp_created_at = None
            user.reset_otp_attempts = 0
            db.session.commit()
            
            session.pop('reset_username', None)
            flash('OTP has expired. Please restart the password reset process.', 'error')
            return redirect(url_for('login'))
        
        # OTP is valid, proceed to reset password
        session['otp_verified'] = True
        return redirect(url_for('reset_password'))
    
    return render_template('verify_otp.html')

@app.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    if 'reset_username' not in session or 'otp_verified' not in session:
        flash('Please complete the verification process first', 'error')
        return redirect(url_for('login'))
    
    username = session['reset_username']
    user = User.query.filter_by(username=username).first()
    
    if not user:
        session.pop('reset_username', None)
        session.pop('otp_verified', None)
        flash('User not found. Please try again.', 'error')
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')
        
        if new_password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('reset_password.html')
        
        # Update password
        user.password = generate_password_hash(new_password)
        user.reset_otp = None
        user.reset_otp_created_at = None
        user.reset_otp_attempts = 0
        
        try:
            db.session.commit()
            
            # Clear session
            session.pop('reset_username', None)
            session.pop('otp_verified', None)
            
            flash('Password has been reset successfully. You can now log in with your new password.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error resetting password: {e}")
            flash('An error occurred. Please try again.', 'error')
            return redirect(url_for('login'))
    
    return render_template('reset_password.html')

@app.route('/api/yearly-summary')
@login_required
def yearly_summary():
    """Get yearly expense and savings summary for the current year."""
    try:
        current_year = datetime.now().year
        user_id = session.get('user_id')
        
        # Get user's monthly income from SQLAlchemy
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'})
        
        monthly_income = user.monthly_income or 0
        
        # Initialize arrays for each month (index 0 = January)
        expenses_by_month = [0] * 12
        savings_by_month = [0] * 12
        
        # Query monthly expenses using SQLAlchemy
        monthly_expenses = db.session.query(
            extract('month', Expense.date).label('month'),
            func.sum(Expense.amount).label('total')
        ).filter(
            Expense.user_id == user_id,
            extract('year', Expense.date) == current_year
        ).group_by(
            extract('month', Expense.date)
        ).all()
        
        # Fill in expenses data
        for expense in monthly_expenses:
            month_idx = int(expense.month) - 1  # Convert from 1-12 to 0-11
            expenses_by_month[month_idx] = float(expense.total)
        
        # Calculate savings for each month (income - expenses)
        for i in range(12):
            savings_by_month[i] = max(0, monthly_income - expenses_by_month[i])
        
        return jsonify({
            'success': True,
            'expenses': expenses_by_month,
            'savings': savings_by_month,
            'year': current_year
        })
        
    except Exception as e:
        app.logger.error(f"Error fetching yearly summary: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch yearly summary data'})

# Achievements API endpoint
@app.route('/api/achievements', methods=['GET'])
@login_required
def get_achievements():
    user_id = session.get('user_id')
    
    # This is a placeholder API that will return an empty list
    # In a real implementation, we would query the database for user achievements
    
    return jsonify({
        'success': True,
        'achievements': []  # Empty array as placeholder until achievement system is fully implemented
    })

# Handle 404 errors
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404
