from flask import Blueprint, request, jsonify
from sqlalchemy import func
from app.extensions import db
from app.models.payment import Payment
from app.models.bill import MonthlyBill
from app.models.resident import Resident
from app.utils import login_required

payment_bp = Blueprint('payment_bp', __name__)

@payment_bp.route('/add-payment', methods=['POST'])
@login_required
def add_payment():
    data = request.json
    resident_id = data.get('resident_id')
    amount = data.get('amount')
    method = data.get('method', 'Cash')

    if not resident_id or not amount:
        return jsonify({"error": "Missing resident_id or amount"}), 400

    try:
        if not db.session.get(Resident, resident_id):
            return jsonify({"error": "Resident not found"}), 404

        new_payment = Payment(
            resident_id=resident_id,
            amount=amount,
            payment_method=method,
            notes=data.get('notes', '')
        )
        
        db.session.add(new_payment)
        db.session.commit()
        
        return jsonify({
            "message": "Payment accepted",
            "amount_credited": amount,
            "resident_id": resident_id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@payment_bp.route('/check-balance', methods=['GET'])
@login_required
def check_balance():
    resident_id = request.args.get('resident_id')
    
    total_billed = db.session.query(func.sum(MonthlyBill.total_cost))\
        .filter_by(resident_id=resident_id).scalar() or 0
        
    total_paid = db.session.query(func.sum(Payment.amount))\
        .filter_by(resident_id=resident_id).scalar() or 0
    
    current_balance = float(total_billed) - float(total_paid)
    
    return jsonify({
        "resident_id": resident_id,
        "total_billed": float(total_billed),
        "total_paid": float(total_paid),
        "current_balance_due": current_balance,
        "status": "OVERDUE" if current_balance > 0 else "CLEARED"
    }), 200


@payment_bp.route('/get-payments', methods=['GET'])
@login_required
def get_payments():
    resident_id = request.args.get('resident_id')

    query = db.session.query(Payment)

    if resident_id:
        query = query.filter(Payment.resident_id == resident_id)

    payments = query.all()
    
    results = []
    for p in payments:
        results.append({
            "payment_id": p.payment_id,
            "resident_id": p.resident_id,
            "amount": float(p.amount),
            "payment_method": p.payment_method,
            "notes": p.notes,
            "payment_date": p.payment_date.strftime("%Y-%m-%d %H:%M:%S") if p.payment_date else None
        })

    return jsonify(results), 200