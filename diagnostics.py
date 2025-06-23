import sqlite3
import datetime
import json

# Connect to the database
def get_db_connection():
    conn = sqlite3.connect('instance/financial_assistant.db')
    conn.row_factory = sqlite3.Row
    return conn

def check_database_tables():
    print("Checking database tables...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all tables in the database
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in database:")
    for table in tables:
        print(f"  - {table['name']}")
        
        # Get column info for each table
        cursor.execute(f"PRAGMA table_info({table['name']})")
        columns = cursor.fetchall()
        print(f"    Columns: {', '.join([col['name'] for col in columns])}")
        
        # Get record count for each table
        cursor.execute(f"SELECT COUNT(*) FROM {table['name']}")
        count = cursor.fetchone()[0]
        print(f"    Records: {count}")
    
    conn.close()

def check_expenses():
    print("\nChecking expenses data...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Find the correct name for the user table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%user%';")
        user_tables = cursor.fetchall()
        user_table = user_tables[0]['name'] if user_tables else None
        
        # Find the correct name for the expense table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%expense%';")
        expense_tables = cursor.fetchall()
        expense_table = expense_tables[0]['name'] if expense_tables else None
        
        print(f"User table: {user_table}")
        print(f"Expense table: {expense_table}")
        
        if not user_table or not expense_table:
            print("Could not find user or expense tables - database may be empty")
            return
        
        # Get table schema
        cursor.execute(f"PRAGMA table_info({user_table})")
        user_columns = [col['name'] for col in cursor.fetchall()]
        print(f"User columns: {user_columns}")
        
        cursor.execute(f"PRAGMA table_info({expense_table})")
        expense_columns = [col['name'] for col in cursor.fetchall()]
        print(f"Expense columns: {expense_columns}")
        
        # Find the user ID column
        user_id_col = 'id' if 'id' in user_columns else 'user_id'
        
        # Get users
        cursor.execute(f"SELECT {user_id_col}, username FROM {user_table} LIMIT 5")
        users = cursor.fetchall()
        print("Users:")
        for user in users:
            print(f"  - User ID: {user[user_id_col]}, Username: {user['username']}")
        
        # Get current expenses
        cursor.execute(f"SELECT * FROM {expense_table} LIMIT 5")
        expenses = cursor.fetchall()
        print("\nSample expenses:")
        for expense in expenses:
            expense_dict = {column: expense[column] for column in expense.keys()}
            print(f"  - {expense_dict}")
        
        # Add a sample expense for testing
        user_id = users[0][user_id_col] if users else 1
        print(f"\nAdding a sample expense for user_id {user_id}")
        
        expense_columns_str = ", ".join([col for col in expense_columns if col != 'id'])
        placeholders = ", ".join(["?"] * (len(expense_columns) - 1))
        
        values = []
        for col in expense_columns:
            if col == 'id':
                continue
            elif col == 'user_id':
                values.append(user_id)
            elif col == 'amount':
                values.append(5000)
            elif col == 'category':
                values.append('Test')
            elif col == 'description':
                values.append('Diagnostic test expense')
            elif col == 'date':
                values.append(datetime.datetime.now().strftime('%Y-%m-%d'))
            else:
                values.append(None)
        
        query = f"INSERT INTO {expense_table} ({expense_columns_str}) VALUES ({placeholders})"
        print(f"Query: {query}")
        print(f"Values: {values}")
        
        cursor.execute(query, values)
        conn.commit()
        print("Sample expense added successfully")
        
        # Verify it was added
        cursor.execute(f"SELECT * FROM {expense_table} WHERE category = 'Test' ORDER BY id DESC LIMIT 1")
        new_expense = cursor.fetchone()
        if new_expense:
            expense_dict = {column: new_expense[column] for column in new_expense.keys()}
            print(f"New expense: {expense_dict}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

def check_monthly_summary():
    print("\nChecking monthly summary data...")
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        current_year = datetime.datetime.now().year
        current_month = datetime.datetime.now().month

        # Check monthly expenses
        cursor.execute("""
            SELECT SUM(amount) as total, COUNT(*) as count 
            FROM expense 
            WHERE strftime('%Y', date) = ? 
            AND strftime('%m', date) = ?
        """, (str(current_year), str(current_month).zfill(2)))

        result = cursor.fetchone()
        print(f"Current month expenses:")
        print(f"  Total amount: {result['total'] or 0}")
        print(f"  Number of transactions: {result['count'] or 0}")

        # Check user savings goals
        cursor.execute("SELECT COUNT(*) as count FROM financial_goal WHERE is_completed = 0")
        active_goals = cursor.fetchone()['count']
        print(f"\nActive financial goals: {active_goals}")

    except Exception as e:
        print(f"Error checking monthly summary: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    check_database_tables()
    check_expenses()
    check_monthly_summary()