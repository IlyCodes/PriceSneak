import os
import sys
from sqlalchemy import text
from sqlalchemy.orm import Session

# Add the root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.database import SessionLocal, engine

def run_migration():
    print("Running migration to add alert_type column to alerts table...")
    with engine.connect() as conn:
        try:
            # Check if column exists first
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='alerts' AND column_name='alert_type';"
            ))
            if not result.first():
                conn.execute(text("ALTER TABLE alerts ADD COLUMN alert_type VARCHAR(50);"))
                conn.commit()
                print("Successfully added alert_type column.")
            else:
                print("Column alert_type already exists.")
        except Exception as e:
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    run_migration()
