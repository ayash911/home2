from math import log
from flask import Blueprint, request, jsonify
from app.models.bill import MonthlyBill
from app.utils import login_required


bill_bp = Blueprint('bill_bp', __name__)

@bill_bp.route('/get-bill', methods=['GET'])
@login_required
def get_bill():
    bill = MonthlyBill.query.filter_by(
        resident_id=request.args.get('resident_id'),
        year=request.args.get('year'),
        month_no=request.args.get('month')
    ).first() 

    if bill:
        return jsonify({
            "resident_id": bill.resident_id,
            "period": f"{bill.year}-{bill.month_no}",
            "water_cost": float(bill.water_cost),
            "electricity_cost": float(bill.electricity_cost),
            "total_cost": float(bill.total_cost),
            "w_rate": float(bill.w_rate),
            "e_rate": float(bill.e_rate)

        })
    else:
        return jsonify({"error": "Bill not found"}), 404