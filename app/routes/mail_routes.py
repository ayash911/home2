from flask import Blueprint, request, jsonify
from email.message import EmailMessage
import smtplib
import os
from app.models import resident
from app.models.resident import Resident
from app.pdf_generator import generate_statement_pdf
from app.utils import login_required
from app.extensions import db

mail_bp = Blueprint("mail_bp", __name__)

@mail_bp.route("/email-statements", methods=["POST"])
@login_required
def email_statements():
    res_id = (request.get_json() or {}).get("resident_id")
    if (res_id):
        print(res_id)
        resident = db.session.get(Resident, res_id)
        residents = Resident.query.filter_by(resident_id=resident.resident_id).all()
    else:
        print(res_id)
        residents = Resident.query.all()
    
    to_email = "iit2023232@iiita.ac.in"
    if not to_email:
        return jsonify({"error": "email is required"}), 400

    if not residents:
        return jsonify({"error": "No residents found"}), 400

    msg = EmailMessage()
    msg["Subject"] = "Monthly Ledger Statements"
    msg["From"] = os.environ["SMTP_USER"]
    msg["To"] = to_email
    msg.set_content("Attached are the consolidated ledger statements.")

    for r in residents:
        pdf_buffer = generate_statement_pdf(r)
        msg.add_attachment(
            pdf_buffer.getvalue(),
            maintype="application",
            subtype="pdf",
            filename=f"{r.resident_name.replace(' ', '_')}.pdf"
        )

    with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.environ["SMTP_PORT"])) as server:
        server.starttls()
        server.login(
            os.environ["SMTP_USER"],
            os.environ["SMTP_PASSWORD"]
        )
        server.send_message(msg)

    return jsonify({
        "status": "sent",
        "count": len(residents)
    }), 200
