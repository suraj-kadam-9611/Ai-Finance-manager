from app import app, db, User

# Use the application context
with app.app_context():
    try:
        # Get count before deletion
        user_count = User.query.count()
        print(f"Found {user_count} users in the database")
        
        # Delete all users
        User.query.delete()
        
        # Commit the changes
        db.session.commit()
        
        # Verify deletion
        remaining = User.query.count()
        print(f"Successfully deleted all users. Remaining users: {remaining}")
        
    except Exception as e:
        # Roll back in case of error
        db.session.rollback()
        print(f"Error deleting users: {e}")
