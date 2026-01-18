from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.home import UtilityPrice, Home
from app.utils import login_required

utility_bp = Blueprint('utility_bp', __name__)
 
@utility_bp.route('/set-pricing', methods=['POST'])
@login_required
def set_pricing():
    data = request.json
    try:
        home_id = data.get('home_id')
        water_price = data.get('water_price')
        elec_price = data.get('electricity_price')

        if not all([home_id, water_price, elec_price]):
            return jsonify({"error": "Missing required fields: home_id, water_price, electricity_price"}), 400

        home = db.session.get(Home, home_id)
        if not home:
            return jsonify({"error": "Home ID not found"}), 404

        existing_price = db.session.get(UtilityPrice, home_id)

        if existing_price:
            existing_price.water_price_per_liter = water_price
            existing_price.electricity_price_per_unit = elec_price
            message = "Utility prices updated successfully"
        else:
            new_price = UtilityPrice(
                home_id=home_id,
                water_price_per_liter=water_price,
                electricity_price_per_unit=elec_price
            )
            db.session.add(new_price)
            message = "Utility prices set successfully"

        db.session.commit()
        
        return jsonify({
            "message": message,
            "home_id": home_id,
            "new_rates": {
                "water": float(water_price),
                "electricity": float(elec_price)
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@utility_bp.route('/get-pricing', methods=['GET'])
@login_required
def get_pricing():
    home_id = request.args.get('home_id')
    
    if not home_id:
        return jsonify({"error": "home_id query parameter is required"}), 400

    try:
        home = db.session.get(Home, home_id)
        if not home:
            return jsonify({"error": "Home ID not found"}), 404

        pricing = db.session.get(UtilityPrice, home_id)
        
        if pricing:
            return jsonify({
                "home_id": pricing.home_id,
                "home_name": home.home_name,
                "rates": {
                    "water_price_per_liter": float(pricing.water_price_per_liter),
                    "electricity_price_per_unit": float(pricing.electricity_price_per_unit)
                }
            }), 200
        else:
            return jsonify({
                "home_id": home_id,
                "home_name": home.home_name,
                "message": "No pricing configuration found for this home",
                "rates": None
            }), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500