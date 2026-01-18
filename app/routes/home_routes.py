from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.home import Home, UtilityPrice
from app.utils import login_required


home_bp = Blueprint('home_bp', __name__)

@home_bp.route('/add-home', methods=['POST'])
@login_required
def add_home():
    data = request.json
    name = data.get('home_name')
    w_price = data.get('water_price')
    e_price = data.get('electricity_price')
    if not all([name, w_price is not None, e_price is not None]):
        return jsonify({
            "error": "Missing required fields: home_name, water_price, electricity_price"
        }), 400
    try:
        new_home = Home(home_name=name)
        db.session.add(new_home)
        db.session.flush()
        new_prices = UtilityPrice(
            home_id=new_home.home_id,
            water_price_per_liter=w_price,
            electricity_price_per_unit=e_price
        )
        db.session.add(new_prices)
        db.session.commit()
        return jsonify({
            "message": "Home and Pricing configured successfully",
            "home_id": new_home.home_id,
            "home_name": new_home.home_name,
            "pricing": {
                "water": w_price,
                "electricity": e_price
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@home_bp.route('/get-homes', methods=['GET'])
@login_required
def get_homes():
    homes = Home.query.all()
    result = []
    for h in homes:
        price_info = {}
        if h.pricing:
            price_info = {
                "water_price": float(h.pricing.water_price_per_liter),
                "electricity_price": float(h.pricing.electricity_price_per_unit)
            }
            
        result.append({
            "home_id": h.home_id,
            "home_name": h.home_name,
            **price_info 
        })
        
    return jsonify(result), 200