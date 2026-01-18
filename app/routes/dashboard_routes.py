from flask import Blueprint, jsonify
from sqlalchemy import func
from app.extensions import db
from app.models.home import Home
from app.models.resident import Resident
from app.models.bill import MonthlyBill
from app.models.payment import Payment
from app.utils import login_required
dashboard_bp = Blueprint('dashboard_bp', __name__)
 
@dashboard_bp.route('/dashboard-summary', methods=['GET'])
@login_required
def dashboard_summary():
    try:
        total_homes = Home.query.count()
        total_residents = Resident.query.count()

        total_invoiced = db.session.query(func.sum(MonthlyBill.total_cost)).scalar() or 0
        total_collected = db.session.query(func.sum(Payment.amount)).scalar() or 0
        
        total_outstanding = float(total_invoiced) - float(total_collected)

        residents = Resident.query.all()
        overdue_list = []

        for r in residents:
            r_bills = db.session.query(func.sum(MonthlyBill.total_cost)).filter_by(resident_id=r.resident_id).scalar() or 0
            r_paid = db.session.query(func.sum(Payment.amount)).filter_by(resident_id=r.resident_id).scalar() or 0
            
            balance = float(r_bills) - float(r_paid)
            
            
            overdue_list.append({
                "resident_id": r.resident_id,
                "name": r.resident_name,
                "home": r.home.home_name,
                "amount_due": balance
            })

        overdue_list = sorted(overdue_list, key=lambda x: x['amount_due'], reverse=True)

        return jsonify({
            "status": "success",
            "operations": {
                "total_homes": total_homes,
                "total_residents": total_residents
            },
            "financials": {
                "total_invoiced_lifetime": float(total_invoiced),
                "total_collected_lifetime": float(total_collected),
                "current_outstanding_debt": total_outstanding
            },
            "alerts": {
                "count_overdue": len(overdue_list),
                "overdue_residents": overdue_list
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500