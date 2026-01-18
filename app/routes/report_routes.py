from flask import Blueprint, request, jsonify
from app.models.bill import MonthlyBill
from app.models.resident import Resident
from sqlalchemy import func

from app.utils import login_required

report_bp = Blueprint('report_bp', __name__)
 
@report_bp.route('/monthly-summary', methods=['GET'])
@login_required
def monthly_summary():
    home_id = request.args.get('home_id')
    year = request.args.get('year')
    month = request.args.get('month')

    bills = MonthlyBill.query.join(Resident).filter(
        Resident.home_id == home_id,
        MonthlyBill.year == year,
        MonthlyBill.month_no == month
    ).all()

    if not bills:
        return jsonify({"message": "No bills generated for this period"}), 404

    total_revenue = sum(b.total_cost for b in bills)
    total_water_vol = sum(b.water_used for b in bills)
    total_elec_vol = sum(b.electricity_used for b in bills)

    return jsonify({
        "period": f"{year}-{month}",
        "home_id": home_id,
        "bill_count": len(bills),
        "total_revenue": float(total_revenue),
        "total_consumption": {
            "water_liters": float(total_water_vol),
            "electricity_units": float(total_elec_vol)
        },
        "billed_residents": [b.resident_id for b in bills]
    }), 200