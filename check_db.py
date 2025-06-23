import os
import sys
import traceback
import datetime

print("Script starting...")
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")

try:
    print("Importing from app.py...")
    from app import app, db
    print("Successfully imported from app.py")
    
    print("Importing from models.py...")
    try:
        from models import User, Expense
        print("Successfully imported from models.py")
    except ImportError:
        print("Failed to import from models.py directly, trying from app...")
        try:
            from app import User, Expense
            print("Successfully imported User and Expense from app")
        except ImportError:
            print("Could not import User and Expense models.")
            print("Looking for model classes in app.py...")
            import inspect
            from app import *
            for name, obj in inspect.getmembers(sys.modules['app']):
                if inspect.isclass(obj):
                    print(f"Found class: {name}")
            sys.exit(1)

    def main():
        print("Entering main function...")
        try:
            with app.app_context():
                print("Entered app context")
                
                # Check users
                print("\nChecking Users table:")
                try:
                    users = User.query.all()
                    print(f"Retrieved {len(users)} users")
                    
                    if not users:
                        print("  No users found in database")
                    else:
                        for user in users:
                            print(f"  User ID: {user.id}, Username: {user.username}")
                            
                            # Check expenses for this user
                            try:
                                expenses = Expense.query.filter_by(user_id=user.id).all()
                                print(f"    User has {len(expenses)} expenses")
                                
                                # If no expenses, create a sample expense
                                if len(expenses) == 0:
                                    print(f"    Creating sample expense for user {user.id}")
                                    
                                    try:
                                        # Create a new expense
                                        new_expense = Expense(
                                            user_id=user.id,
                                            amount=5000,
                                            category="Test",
                                            description="Sample expense from diagnostic script",
                                            date=datetime.datetime.now().date()
                                        )
                                        
                                        db.session.add(new_expense)
                                        db.session.commit()
                                        print(f"    Sample expense created with ID: {new_expense.id}")
                                    except Exception as e:
                                        print(f"    Error creating sample expense: {str(e)}")
                                        db.session.rollback()
                                else:
                                    # Show some sample expenses
                                    print("    Recent expenses:")
                                    for expense in expenses[:3]:
                                        print(f"      ID: {expense.id}, Amount: {expense.amount}, Category: {expense.category}, Date: {expense.date}")
                            except Exception as e:
                                print(f"    Error retrieving expenses: {str(e)}")
                
                except Exception as e:
                    print(f"Error querying users: {str(e)}")
                    traceback.print_exc()
                
                # Check expense table directly
                print("\nChecking Expense table directly:")
                try:
                    expenses = Expense.query.limit(5).all()
                    print(f"  Found {len(expenses)} expenses in direct query")
                    
                    for expense in expenses:
                        print(f"    Expense ID: {expense.id}, User: {expense.user_id}, Amount: {expense.amount}, Category: {expense.category}")
                except Exception as e:
                    print(f"  Error querying expenses directly: {str(e)}")
                    traceback.print_exc()
                
                # Check if we can manually get expense trend data
                print("\nTrying to fetch expense trend data:")
                try:
                    # Try to import the function
                    from app import get_expense_trend_data
                    print("  Successfully imported get_expense_trend_data function")
                    
                    # Get first user id
                    user_id = User.query.first().id if User.query.first() else 1
                    print(f"  Using user_id: {user_id}")
                    
                    try:
                        monthly_data = get_expense_trend_data(user_id, "month")
                        print(f"  Monthly expense trend data: {monthly_data}")
                    except Exception as e:
                        print(f"  Error fetching monthly trend data: {str(e)}")
                        traceback.print_exc()
                    
                    try:
                        weekly_data = get_expense_trend_data(user_id, "week")
                        print(f"  Weekly expense trend data: {weekly_data}")
                    except Exception as e:
                        print(f"  Error fetching weekly trend data: {str(e)}")
                        traceback.print_exc()
                except Exception as e:
                    print(f"  Error with expense trend function: {str(e)}")
                    traceback.print_exc()
                
        except Exception as e:
            print(f"Error in app context: {str(e)}")
            traceback.print_exc()

    if __name__ == "__main__":
        try:
            main()
            print("\nScript completed successfully.")
        except Exception as e:
            print(f"Unhandled exception in main: {str(e)}")
            traceback.print_exc()
except Exception as e:
    print(f"Error during imports: {str(e)}")
    traceback.print_exc() 