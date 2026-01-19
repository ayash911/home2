from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import os
import base64
import requests

from app.models.resident import Resident
from app.pdf_generator import generate_statement_pdf
from app.utils import login_required
from app.extensions import db

mail_bp = Blueprint("mail_bp", __name__)

@mail_bp.route("/email-statements", methods=["POST", "OPTIONS"])
@cross_origin(
    origins=["https://home2-2r5o.onrender.com"],
    supports_credentials=True
)
@login_required
def email_statements():
    data = request.get_json(silent=True) or {}
    res_id = data.get("resident_id")

    if res_id:
        resident = db.session.get(Resident, int(res_id))
        if not resident:
            return jsonify({"error": "Resident not found"}), 404
        residents = [resident]
    else:
        residents = Resident.query.all()

    if not residents:
        return jsonify({"error": "No residents found"}), 400

    to_email = "iit2023232@iiita.ac.in"

    attachments = []
    for r in residents:
        pdf_buffer = generate_statement_pdf(r)
        attachments.append({
            "name": f"{r.resident_name.replace(' ', '_')}.pdf",
            "content": base64.b64encode(pdf_buffer.getvalue()).decode()
        })

    payload = {
        "sender": {
            "email": os.environ["BREVO_SENDER"],
            "name": "Home Utility System"
        },
        "to": [{"email": to_email}],
        "subject": "Monthly Ledger Statements",
        "htmlContent": "<p>Please find attached your ledger statement.</p>",
        "attachment": attachments
    }

    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={
            "api-key": os.environ["BREVO_API_KEY"],
            "Content-Type": "application/json"
        },
        json=payload,
        timeout=15
    )

    if response.status_code not in (200, 201):
        return jsonify({
            "error": "Email sending failed",
            "details": response.text
        }), 500

    return jsonify({
        "status": "sent",
        "count": len(residents)
    }), 200
