#!/usr/bin/env python3
"""
Check and optionally reset a user's password
"""

import sys
from api.database import SessionLocal
from api import models
from api.simple_auth import verify_password, get_password_hash

def check_user(username: str, test_password: str = None):
    """Check user authentication and password hash format"""
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user:
            print(f"❌ User '{username}' not found in database")
            return
        
        print(f"✅ User found: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.role}")
        print(f"   Password hash length: {len(user.password)}")
        print(f"   Password hash preview: {user.password[:30]}...")
        
        # Check hash format
        if user.password.startswith("$2"):
            print(f"   Hash format: bcrypt")
        elif len(user.password) == 64:
            print(f"   Hash format: SHA256 (old format)")
        else:
            print(f"   Hash format: Unknown")
        
        if test_password:
            print(f"\nTesting password: '{test_password}'")
            is_valid = verify_password(test_password, user.password)
            if is_valid:
                print(f"✅ Password is CORRECT")
            else:
                print(f"❌ Password is INCORRECT")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def reset_password(username: str, new_password: str):
    """Reset a user's password"""
    import hashlib
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user:
            print(f"❌ User '{username}' not found")
            return
        
        # Try bcrypt first, fallback to SHA256 if it fails
        try:
            user.password = get_password_hash(new_password)
        except Exception:
            # Fallback to SHA256 if bcrypt fails
            print("⚠️  Bcrypt failed, using SHA256 (less secure but functional)")
            user.password = hashlib.sha256(new_password.encode()).hexdigest()
        
        db.commit()
        db.refresh(user)
        
        print(f"✅ Password reset successfully for user: {username}")
        print(f"   New password: {new_password}")
        print(f"   New password hash: {user.password[:30]}...")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python check_user_password.py <username> [test_password]")
        print("  python check_user_password.py <username> --reset <new_password>")
        print("\nExamples:")
        print("  python check_user_password.py dittomohan22")
        print("  python check_user_password.py dittomohan22 password123")
        print("  python check_user_password.py dittomohan22 --reset newpassword123")
        sys.exit(1)
    
    username = sys.argv[1]
    
    if len(sys.argv) > 2 and sys.argv[2] == "--reset":
        if len(sys.argv) < 4:
            print("Error: New password required for reset")
            sys.exit(1)
        new_password = sys.argv[3]
        reset_password(username, new_password)
    elif len(sys.argv) > 2:
        test_password = sys.argv[2]
        check_user(username, test_password)
    else:
        check_user(username)

