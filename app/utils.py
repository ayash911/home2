from functools import wraps
from flask import request, jsonify, current_app
import jwt
from app.models.admin import AdminUser
from app.extensions import db

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == "OPTIONS":
            return "", 200
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "Authorization header missing"}), 401
        
        try:
            parts = auth_header.split()
            if parts[0] != 'Bearer' or len(parts) != 2:
                raise ValueError
            
            token = parts[1]
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            
            user = db.session.get(AdminUser, payload.get('user_id'))
            if not user:
                return jsonify({"error": "Invalid Token User"}), 403
                
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except Exception:
            return jsonify({"error": "Authentication error"}), 401

        return f(*args, **kwargs)
    return decorated_function