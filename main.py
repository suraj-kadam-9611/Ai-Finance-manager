from app import app, db
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create database tables if they don't exist
try:
    with app.app_context():
        logger.info("Creating database tables if they don't exist...")
        db.create_all()
        logger.info("Database tables created successfully.")
except Exception as e:
    logger.error(f"Error creating database tables: {e}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
