from flask import Blueprint, request, jsonify
from sqlalchemy import desc, asc
from app.extensions import db
from app.models.reading import MeterReading
from app.models.bill import MonthlyBill
from app.models.payment import Payment
from app.utils import login_required

correction_bp = Blueprint('correction_bp', __name__)

@correction_bp.route('/update-transaction', methods=['POST'])
@login_required
def update_transaction():
    data = request.json
    txn_type = data.get('type') 

    if txn_type == 'PAYMENT':
        pay_id = data.get('payment_id')
        if not pay_id:
            return jsonify({"error": "payment_id is required"}), 400
        
        try:
            payment = db.session.get(Payment, pay_id)
            if not payment:
                return jsonify({"error": "Payment not found"}), 404
            
            if 'amount' in data:
                payment.amount = float(data['amount'])
            if 'notes' in data:
                payment.notes = data['notes']
            if 'method' in data:
                payment.payment_method = data['method']
            
            db.session.commit()
            return jsonify({"message": "Payment updated successfully"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    res_id = data.get('resident_id')
    try:
        year = int(data.get('year'))
        month = int(data.get('month'))
    except (TypeError, ValueError):
        return jsonify({"error": "year and month are required for bill updates"}), 400

    if not res_id:
        return jsonify({"error": "resident_id is required"}), 400

    try:
        reading = MeterReading.query.filter_by(resident_id=res_id, year=year, month_no=month).first()
        if not reading:
            return jsonify({"error": "No reading found for this period"}), 404

        bill = MonthlyBill.query.filter_by(reading_id=reading.reading_id).first()
        
        if 'water_reading' in data:
            reading.water_reading = float(data['water_reading'])
        if 'electricity_reading' in data:
            reading.electricity_reading = float(data['electricity_reading'])

        prev = MeterReading.query.filter(
            MeterReading.resident_id == res_id,
            (MeterReading.year < year) | 
            ((MeterReading.year == year) & (MeterReading.month_no < month))
        ).order_by(desc(MeterReading.year), desc(MeterReading.month_no)).first()

        base_w = float(prev.water_reading) if prev else 0.0
        base_e = float(prev.electricity_reading) if prev else 0.0

        next_reading = MeterReading.query.filter(
            MeterReading.resident_id == res_id,
            (MeterReading.year > year) | 
            ((MeterReading.year == year) & (MeterReading.month_no > month))
        ).order_by(asc(MeterReading.year), asc(MeterReading.month_no)).first()

        if reading.water_reading < base_w:
            return jsonify({"error": f"Water reading cannot be lower than previous month ({base_w})"}), 400
        if reading.electricity_reading < base_e:
            return jsonify({"error": f"Electricity reading cannot be lower than previous month ({base_e})"}), 400
        
        if next_reading:
            if reading.water_reading > float(next_reading.water_reading):
                return jsonify({"error": f"New reading cannot be higher than NEXT month ({next_reading.water_reading})"}), 400
            if reading.electricity_reading > float(next_reading.electricity_reading):
                return jsonify({"error": f"New reading cannot be higher than NEXT month ({next_reading.electricity_reading})"}), 400

        if bill:
            if 'water_rate' in data: bill.w_rate = float(data['water_rate'])
            if 'electricity_rate' in data: bill.e_rate = float(data['electricity_rate'])

            bill.water_used = reading.water_reading - base_w
            bill.electricity_used = reading.electricity_reading - base_e
            
            bill.water_cost = bill.water_used * float(bill.w_rate)
            bill.electricity_cost = bill.electricity_used * float(bill.e_rate)
            bill.total_cost = bill.water_cost + bill.electricity_cost + float(bill.rent_amount)

        if next_reading:
            next_bill = MonthlyBill.query.filter_by(reading_id=next_reading.reading_id).first()
            if next_bill:
                next_bill.water_used = float(next_reading.water_reading) - reading.water_reading
                next_bill.electricity_used = float(next_reading.electricity_reading) - reading.electricity_reading
                
                next_bill.water_cost = next_bill.water_used * float(next_bill.w_rate)
                next_bill.electricity_cost = next_bill.electricity_used * float(next_bill.e_rate)
                next_bill.total_cost = next_bill.water_cost + next_bill.electricity_cost + float(next_bill.rent_amount)

        db.session.commit()
        return jsonify({"message": "Transaction and subsequent months updated successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500