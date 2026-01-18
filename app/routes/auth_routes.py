from flask import Blueprint, request, jsonify, current_app
import jwt
import datetime
from app.extensions import db
from app.models.admin import AdminUser

auth_bp = Blueprint('auth_bp', __name__)


@auth_bp.route('/register-admin', methods=['POST'])
def register_admin():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if AdminUser.query.filter_by(username=username).first():
        return jsonify({"error": "User already exists"}), 400

    new_admin = AdminUser(username=username)
    new_admin.set_password(password)
    db.session.add(new_admin)
    db.session.commit()

    return jsonify({"message": "Admin registered"}), 201
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = AdminUser.query.filter_by(username=username).first()

    if user and user.check_password(password):
        payload = {
            'user_id': user.user_id,
            'username': user.username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        
        token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            "message": "Login successful", 
            "token": token
        }), 200
    
    return jsonify({"error": "Invalid credentials"}), 401