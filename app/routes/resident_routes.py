import json
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.resident import Resident
from app.models.home import Home
from app.models.rent import RentAgreement
from app.models.phone import ResidentPhone

from decimal import Decimal

from app.utils import login_required

resident_bp = Blueprint('resident_bp', __name__)

@resident_bp.route('/add-resident', methods=['POST'])
@login_required
def add_resident():
    data = request.json
    
    home_id = data.get('home_id')
    name = data.get('name')
    floor = data.get('floor')
    rent = data.get('rent')

    if not all([home_id, name, floor, rent is not None]):
        return jsonify({"error": "Missing required fields: home_id, name, floor, rent"}), 400

    try:
        if not db.session.get(Home, home_id):
            return jsonify({"error": "Home ID not found"}), 404

        new_res = Resident(
            home_id=home_id,
            resident_name=name,
            floor_no=floor
        )
        db.session.add(new_res)
        db.session.flush() 

        new_rent = RentAgreement(
            resident_id=new_res.resident_id,
            rent_amount=rent
        )
        db.session.add(new_rent)

        db.session.commit()
        
        return jsonify({
            "message": "Resident and Rent added successfully", 
            "id": new_res.resident_id,
            "rent_set": rent
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@resident_bp.route('/list-residents', methods=['GET'])
@login_required
def list_residents():
    home_id = request.args.get('home_id')
    if not home_id:
        residents = Resident.query.all()
        return jsonify([{
            "resident_id": r.resident_id,
            "name": r.resident_name,
            "floor": r.floor_no,
            "home_id": r.home_id

        } for r in residents]), 200
    else:
        residents = Resident.query.filter_by(home_id=home_id).all()
        return jsonify([{
            "resident_id": r.resident_id,
            "name": r.resident_name,
            "floor": r.floor_no
        } for r in residents]), 200

@resident_bp.route('/set-rent', methods=['POST'])
@login_required
def set_rent():
    data = request.json
    res_id = data.get('resident_id')
    amount = data.get('rent_amount')
    percentage = data.get('percentage')

    if res_id is None:
        return jsonify({"error": "Missing resident_id"}), 400

    if amount is None and percentage is None:
        return jsonify({"error": "Must provide either 'rent_amount' or 'percentage'"}), 400
    
    if amount is not None and percentage is not None:
        return jsonify({"error": "Provide only one: either 'rent_amount' or 'percentage', not both"}), 400

    try:
        resident = db.session.get(Resident, res_id)
        if not resident:
            return jsonify({"error": "Resident not found"}), 404

        agreement = db.session.get(RentAgreement, res_id)
        
        final_rent = 0.0

        if amount is not None:
            final_rent = float(amount)
        
        elif percentage is not None:
            if not agreement:
                return jsonify({"error": "Cannot apply percentage. No existing rent found. Set a fixed amount first."}), 400
            
            current_rent = float(agreement.rent_amount)
            final_rent = current_rent + (current_rent * float(percentage) / 100.0)

        if agreement:
            agreement.previous_rent_amount = agreement.rent_amount
            agreement.rent_amount = final_rent
            msg = "Rent updated successfully"
        else:
            agreement = RentAgreement(resident_id=res_id, rent_amount=final_rent)
            db.session.add(agreement)
            msg = "Rent set successfully"

        db.session.commit()
        
        return jsonify({
            "message": msg, 
            "resident_id": res_id, 
            "new_rent_amount": round(final_rent, 2),
            "previous_rent_amount": float(agreement.previous_rent_amount) if agreement.previous_rent_amount else 0
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500      

@resident_bp.route('/remove-resident', methods=['GET'])
@login_required
def remove_resident():
    resident_id = request.args.get('resident_id')
    residents = Resident.query.filter_by(resident_id=resident_id).all()
    if not residents:
        return jsonify({"message": "No residents found"}), 404
    for r in residents:
        db.session.delete(r)
    db.session.commit()
    return jsonify({"message": "Resident removed"}), 200

@resident_bp.route('/set-phones', methods=['POST'])
@login_required
def set_phones():
    data = request.json
    res_id = data.get('resident_id')
    primary = data.get('primary_phone')
    secondary = data.get('secondary_phone')

    if not res_id or not primary:
        return jsonify({"error": "resident_id and primary_phone are required"}), 400

    try:
        if not db.session.get(Resident, res_id):
            return jsonify({"error": "Resident not found"}), 404

        phones = db.session.get(ResidentPhone, res_id)
        
        if phones:
            phones.primary_phone = primary
            phones.secondary_phone = secondary
            msg = "Phone numbers updated"
        else:
            phones = ResidentPhone(
                resident_id=res_id,
                primary_phone=primary,
                secondary_phone=secondary
            )
            db.session.add(phones)
            msg = "Phone numbers saved"

        db.session.commit()
        
        return jsonify({
            "message": msg,
            "resident_id": res_id,
            "primary": primary,
            "secondary": secondary
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500