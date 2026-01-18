from flask import Blueprint, make_response, request, jsonify
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from io import BytesIO
from datetime import datetime
from app.extensions import db
from app.models.resident import Resident
from app.models.bill import MonthlyBill
from app.models.payment import Payment
from app.utils import login_required
from app.pdf_generator import generate_statement_pdf


pdf_bp = Blueprint('pdf_bp', __name__)

@pdf_bp.route('/download-statement', methods=['GET'])
@login_required
def download_statement():
    res_id = request.args.get('resident_id')
    if not res_id:
        return jsonify({"error": "resident_id is required"}), 400

    resident = db.session.get(Resident, res_id)
    if not resident:
        return jsonify({"error": "Resident not found"}), 404

    buffer = generate_statement_pdf(resident)

    response = make_response(buffer.getvalue())
    response.headers["Content-Type"] = "application/pdf"
    response.headers["Content-Disposition"] = (
        f"attachment; filename=Statement_{resident.resident_name}.pdf"
    )

    return response
