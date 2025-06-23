from extensions import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    mobile = db.Column(db.String(20), nullable=False)
    monthly_income = db.Column(db.Float, default=0.0)
    savings_goal = db.Column(db.Float, default=0.0)
    emergency_fund = db.Column(db.Float, default=0.0)
    financial_goal = db.Column(db.String(200))
    currency = db.Column(db.String(3), default='INR')  # Default currency is INR
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # OTP fields for password reset
    reset_otp = db.Column(db.String(6), nullable=True)
    reset_otp_created_at = db.Column(db.DateTime, nullable=True)
    reset_otp_attempts = db.Column(db.Integer, default=0)
    
    expenses = db.relationship('Expense', backref='user', lazy=True)
    goals = db.relationship('FinancialGoal', backref='user', lazy=True)
    incomes = db.relationship('Income', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date())
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Expense {self.id} - ${self.amount}>'

class FinancialGoal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    goal_type = db.Column(db.String(50), nullable=False)  # savings, debt_reduction, investment, etc.
    target_amount = db.Column(db.Float, nullable=False)
    current_amount = db.Column(db.Float, default=0.0)
    start_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date())
    target_date = db.Column(db.Date, nullable=False)
    priority = db.Column(db.Integer, default=1)  # 1=highest, 2=high, 3=medium, 4=low, 5=lowest
    is_completed = db.Column(db.Boolean, default=False)
    milestones_reached = db.Column(db.Integer, default=0)  # Count of milestone celebrations (25%, 50%, 75%, 100%)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<FinancialGoal {self.title} - Progress: {self.get_progress_percentage()}%>'
    
    def get_progress_percentage(self):
        if self.target_amount == 0:
            return 0
        # Calculate precise percentage without rounding
        progress = (self.current_amount / self.target_amount) * 100
        # Return exact percentage (capped at 100)
        return min(progress, 100)
    
    def get_days_remaining(self):
        if self.is_completed:
            return 0
        today = datetime.utcnow().date()
        if today > self.target_date:
            return 0
        return (self.target_date - today).days
    
    def is_on_track(self):
        """
        Determine if the goal is on track based on the time elapsed and progress made.
        Returns True if the progress percentage is greater than or equal to the time percentage that has passed.
        """
        if self.is_completed:
            return True
            
        total_days = (self.target_date - self.start_date).days
        if total_days <= 0:  # Invalid date range or same day
            return False
            
        elapsed_days = (datetime.utcnow().date() - self.start_date).days
        if elapsed_days < 0:  # Future start date
            return True  # Not started yet, so considered on track
            
        if elapsed_days > total_days:  # Past the target date
            return self.get_progress_percentage() >= 100
            
        time_percentage = (elapsed_days / total_days) * 100
        progress_percentage = self.get_progress_percentage()
        
        return progress_percentage >= time_percentage

class Income(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(100), nullable=False)
    frequency = db.Column(db.String(20), nullable=False)  # monthly, weekly, yearly
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date())
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Income {self.id} - ${self.amount} ({self.frequency})>'
