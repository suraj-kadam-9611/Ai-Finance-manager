"""
Utility functions for the financial assistant application
"""

def generate_financial_advice(user_profile):
    """
    Generate simple financial advice based on user's profile data
    
    Args:
        user_profile: A dictionary containing user financial information
    
    Returns:
        str: Personalized financial advice
    """
    advice = "Welcome to your personal financial assistant! "
    
    # If no profile data, provide generic advice
    if not user_profile:
        return advice + "To get personalized advice, please update your financial profile."
    
    try:
        monthly_income = user_profile.get('monthlyIncome', 0)
        savings_goal = user_profile.get('savingsGoal', 0)
        emergency_fund = user_profile.get('emergencyFund', 0)
        
        # Emergency fund advice
        if emergency_fund < monthly_income * 3:
            advice += "Consider building an emergency fund that covers at least 3-6 months of expenses. "
        elif emergency_fund >= monthly_income * 3 and emergency_fund < monthly_income * 6:
            advice += "Good job on your emergency fund! Consider increasing it to 6 months of expenses for better security. "
        else:
            advice += "Your emergency fund looks great! "
        
        # Savings advice
        if savings_goal > 0:
            savings_rate = (savings_goal / monthly_income) * 100 if monthly_income > 0 else 0
            if savings_rate < 15:
                advice += "Try to save at least 15% of your income to meet long-term goals. "
            elif savings_rate >= 15 and savings_rate < 25:
                advice += "Your savings rate is good, but increasing it can help you reach financial independence faster. "
            else:
                advice += "Excellent savings rate! You're on track for financial success. "
        else:
            advice += "Setting a specific savings goal can help you stay motivated. "
        
        # Spending advice
        if monthly_income > 0:
            advice += "Remember to track your expenses regularly to identify areas where you can reduce spending. "
            
        return advice
        
    except Exception as e:
        # If anything goes wrong, return generic advice
        return "Track your expenses regularly and aim to save at least 15-20% of your income for long-term financial security."

def analyze_spending_patterns(expenses):
    """
    Analyze spending patterns from expense data
    
    Args:
        expenses: List of expense records
        
    Returns:
        dict: Analysis of spending patterns
    """
    if not expenses:
        return None
        
    try:
        # Group expenses by category
        categories = {}
        for expense in expenses:
            category = expense.get('category', 'Other')
            amount = float(expense.get('amount', 0))
            if category in categories:
                categories[category] += amount
            else:
                categories[category] = amount
                
        # Find top spending categories
        sorted_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)
        
        # Calculate percentage distribution
        total_spend = sum(categories.values())
        distribution = {cat: (amt/total_spend)*100 for cat, amt in categories.items()}
        
        return {
            'top_categories': sorted_categories[:3],
            'distribution': distribution,
            'total_spend': total_spend
        }
        
    except Exception as e:
        logging.error(f"Error analyzing spending patterns: {e}")
        return None
