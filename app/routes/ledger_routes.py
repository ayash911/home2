from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.resident import Resident
from app.models.bill import MonthlyBill
from app.models.payment import Payment
from app.models.phone import ResidentPhone
from app.models.rent import RentAgreement
from app.models.home import Home
from app.utils import login_required

ledger_bp = Blueprint('ledger_bp', __name__)

@ledger_bp.route('/get-ledger', methods=['GET'])
@login_required
def get_ledger():
    res_id = request.args.get('resident_id')
    if not res_id:
        return jsonify({"error": "resident_id is required"}), 400

    resident = db.session.get(Resident, res_id)
    if not resident:
        return jsonify({"error": "Resident not found"}), 404

    bills = MonthlyBill.query.filter_by(resident_id=res_id).all()
    payments = Payment.query.filter_by(resident_id=res_id).all()

    ledger = []

    for b in bills:
        ledger.append({
            "date": b.generated_at,
            "type": "BILL",
            "description": f"Bill for {b.year}-{b.month_no}",
            "amount_due": float(b.total_cost),
            "amount_paid": 0.0,
            "details": {
                "rent": float(b.rent_amount),
                "water_usage": float(b.water_used),
                "water_rate": float(b.w_rate),
                "water_cost": float(b.water_cost),
                "water_reading": float(b.reading.water_reading) if b.reading else 0,
                "electricity_reading": float(b.reading.electricity_reading) if b.reading else 0,
                "electricity_usage": float(b.electricity_used),
                "electricity_rate": float(b.e_rate),
                "electricity_cost": float(b.electricity_cost)
            }
        })

    for p in payments:
        ledger.append({
            "date": p.payment_date,
            "payment_id": p.payment_id,
            "type": "PAYMENT",
            "description": f"Payment ({p.payment_method})",
            "amount_due": 0.0,
            "amount_paid": float(p.amount),
            "details": {
                "notes": p.notes
            }
        })

    ledger.sort(key=lambda x: x['date'])

    running_balance = 0.0
    total_billed = 0.0
    total_paid = 0.0
    final_ledger = []

    for item in ledger:
        if item['type'] == 'BILL':
            running_balance += item['amount_due']
            total_billed += item['amount_due']
        elif item['type'] == 'PAYMENT':
            running_balance -= item['amount_paid']
            total_paid += item['amount_paid']
        
        item['running_balance'] = running_balance
        item['date'] = item['date'].strftime('%Y-%m-%d %H:%M:%S')
        final_ledger.append(item)

    phone_data = {}
    if resident.phone_contact:
        phone_data = {
            "primary": resident.phone_contact.primary_phone,
            "secondary": resident.phone_contact.secondary_phone
        }

    current_rent = 0.0
    if resident.rent_agreement:
        current_rent = float(resident.rent_agreement.rent_amount)

    home_details = {}
    if resident.home:
        home_details = {
            "home_id": resident.home.home_id,
            "home_name": resident.home.home_name
        }

    return jsonify({
        "profile": {
            "resident_id": resident.resident_id,
            "name": resident.resident_name,
            "floor_no": resident.floor_no,
            "phones": phone_data,
            "current_base_rent": current_rent,
            "home": home_details
        },
        "financial_summary": {
            "total_billed": total_billed,
            "total_paid": total_paid,
            "current_outstanding_balance": running_balance
        },
        "ledger_entries": final_ledger
    }), 200