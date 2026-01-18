from flask import Blueprint, request, jsonify
from sqlalchemy import desc
from app.extensions import db
from app.models.resident import Resident
from app.models.reading import MeterReading
from app.models.bill import MonthlyBill
from app.models.rent import RentAgreement
from app.utils import login_required

reading_bp = Blueprint('reading_bp', __name__)

def calculate_and_save_bill(res_id, year, month, curr_water, curr_elec, prev_reading, prices, current_reading_id):
    """
    Standard Bill Calculation (Normal Month)
    """
    w_used = curr_water - float(prev_reading.water_reading)
    e_used = curr_elec - float(prev_reading.electricity_reading)

    if w_used < 0 or e_used < 0:
        raise ValueError("New reading is lower than previous reading.")

    w_rate = float(prices.water_price_per_liter)
    e_rate = float(prices.electricity_price_per_unit)
    w_cost = w_used * w_rate
    e_cost = e_used * e_rate
    
    rent_entry = RentAgreement.query.filter_by(resident_id=res_id).first()
    rent_amount = float(rent_entry.rent_amount) if rent_entry else 0.0
    
    total = w_cost + e_cost + rent_amount

    new_bill = MonthlyBill(
        resident_id=res_id, 
        year=year, 
        month_no=month,
        reading_id=current_reading_id, 
        water_used=w_used, 
        electricity_used=e_used, 
        w_rate=w_rate,
        e_rate=e_rate,
        water_cost=w_cost,
        electricity_cost=e_cost,
        rent_amount=rent_amount,
        total_cost=total
    )
    db.session.add(new_bill)
    return total

@reading_bp.route('/add-reading', methods=['POST'])
@login_required
def add_reading():
    data = request.json
    try:
        res_id = data['resident_id']
        year = int(data['year'])
        month = int(data['month'])
        curr_water = float(data['water_reading'])
        curr_elec = float(data['electricity_reading'])

        # 1. Check Resident & Pricing
        resident = db.session.get(Resident, res_id)
        if not resident or not resident.home.pricing:
            return jsonify({"error": "Resident or Pricing not found"}), 404

        # 2. Check for Duplicates
        if MeterReading.query.filter_by(resident_id=res_id, year=year, month_no=month).first():
             return jsonify({"error": "Reading already exists for this month"}), 409

        # 3. Create Reading First
        new_reading = MeterReading(
            resident_id=res_id, year=year, month_no=month,
            water_reading=curr_water, electricity_reading=curr_elec
        )
        db.session.add(new_reading)
        db.session.flush()

        # 4. Check for Previous Reading
        prices = resident.home.pricing
        prev_reading = MeterReading.query.filter(
                MeterReading.resident_id == res_id,
                (MeterReading.year < year) | 
                ((MeterReading.year == year) & (MeterReading.month_no < month))
            ).order_by(desc(MeterReading.year), desc(MeterReading.month_no)).first()

        total_cost = 0
        response_msg = ""

        if prev_reading:
            # --- SCENARIO A: NORMAL BILL (Charge Rent + Utils) ---
            try:
                total_cost = calculate_and_save_bill(
                    res_id, year, month, curr_water, curr_elec, 
                    prev_reading, prices, new_reading.reading_id
                )
                response_msg = "Bill generated successfully"
            except ValueError as e:
                db.session.rollback() 
                return jsonify({"error": str(e)}), 400
        else:
            # --- SCENARIO B: OPENING BALANCE (Zero Cost) ---
            # This is just to set the meter start point.
            
            w_rate = float(prices.water_price_per_liter)
            e_rate = float(prices.electricity_price_per_unit)

            baseline_bill = MonthlyBill(
                resident_id=res_id,
                year=year,
                month_no=month,
                reading_id=new_reading.reading_id,
                
                # Zero Usage
                water_used=0.0,
                electricity_used=0.0,
                
                # Record rates for history, but 0 cost
                w_rate=w_rate,
                e_rate=e_rate,
                water_cost=0.0,
                electricity_cost=0.0,
                
                # --- FIX: ZERO RENT FOR OPENING BALANCE ---
                rent_amount=0.0, 
                total_cost=0.0
            )
            db.session.add(baseline_bill)
            total_cost = 0.0
            response_msg = "Opening Balance Recorded (No Charge)"

        # 5. Commit
        db.session.commit()
        
        return jsonify({
            "message": response_msg,
            "reading_id": new_reading.reading_id,
            "total_cost": total_cost
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500