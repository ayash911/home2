from flask import Blueprint, make_response, request, jsonify
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from io import BytesIO
from datetime import datetime
from app.extensions import db
from app.models.bill import MonthlyBill
from app.models.payment import Payment

def generate_statement_pdf(resident):
    bills = MonthlyBill.query.filter_by(resident_id=resident.resident_id).all()
    payments = Payment.query.filter_by(resident_id=resident.resident_id).all()

    timeline = []

    for b in bills:
        try:
            bill_date = datetime(year=b.year, month=b.month_no, day=1)
        except ValueError:
            bill_date = b.generated_at

        is_opening = (float(b.total_cost) == 0 and float(b.rent_amount) == 0)
        desc_lines = []
        
        if is_opening:
            desc_lines.append(f"<b>OPENING BALANCE</b> (Reading: W:{b.reading.water_reading} | E:{b.reading.electricity_reading})")
        else:
            month_name = bill_date.strftime('%b')
            desc_lines.append(f"<b>Bill for {month_name}-{b.year}</b>")
            
            if float(b.rent_amount) > 0:
                desc_lines.append(f"• Rent: Rs. {float(b.rent_amount):,.2f}")
            if float(b.water_used) > 0:
                desc_lines.append(f"• Water: {float(b.water_used):.2f}L @ {float(b.w_rate)} = {float(b.water_cost):.2f}")
            if float(b.electricity_used) > 0:
                desc_lines.append(f"• Elec: {float(b.electricity_used):.2f}U @ {float(b.e_rate)} = {float(b.electricity_cost):.2f}")

        timeline.append({
            "date": bill_date,
            "desc": "<br/>".join(desc_lines),
            "debit": float(b.total_cost),
            "credit": 0.0,
            "type": "BILL"
        })

    for p in payments:
        note_str = f"<br/><i>Note: {p.notes}</i>" if p.notes else ""
        timeline.append({
            "date": p.payment_date,
            "desc": f"<b>PAYMENT RECEIVED</b><br/>Method: {p.payment_method}{note_str}",
            "debit": 0.0,
            "credit": float(p.amount),
            "type": "PAYMENT"
        })

    timeline.sort(key=lambda x: x['date'])

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(name='BillDetail', parent=styles['Normal'], fontSize=9, leading=11, spaceAfter=2))
    styles.add(ParagraphStyle(name='StatementHeader', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor("#1e3a8a"), spaceAfter=20))
    styles.add(ParagraphStyle(name='ResidentInfo', parent=styles['Normal'], fontSize=12, leading=14, textColor=colors.HexColor("#374151")))

    elements.append(Paragraph("STATEMENT OF ACCOUNT", styles['StatementHeader']))

    gen_date = datetime.now().strftime('%d-%b-%Y')
    res_info = f"""
    <b>Resident:</b> {resident.resident_name}<br/>
    <b>Property:</b> {resident.home.home_name} - Floor {resident.floor_no}<br/>
    <b>Phone:</b> {resident.phone_contact.primary_phone if resident.phone_contact else 'N/A'}<br/>
    <b>Generated On:</b> {gen_date}
    """
    elements.append(Paragraph(res_info, styles['ResidentInfo']))
    elements.append(Spacer(1, 20))

    data = [[
        'Date', 
        'Description & Breakdown', 
        'Billed (+)', 
        'Paid (-)', 
        'Balance'
    ]]

    running_balance = 0.0

    for item in timeline:
        running_balance += item['debit']
        running_balance -= item['credit']
        
        debit_str = f"{item['debit']:,.2f}" if item['debit'] > 0 else "-"
        credit_str = f"{item['credit']:,.2f}" if item['credit'] > 0 else "-"
        balance_str = f"{running_balance:,.2f}"
        
        date_str = item['date'].strftime('%d-%b-%Y')

        desc_para = Paragraph(item['desc'], styles['BillDetail'])

        data.append([
            date_str,
            desc_para,
            debit_str,
            credit_str,
            balance_str
        ])

    col_widths = [90, 250, 70, 70, 70]

    t = Table(data, colWidths=col_widths, repeatRows=1)

    tbl_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'), 
        ('ALIGN', (1, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('VALIGN', (0, 1), (-1, -1), 'TOP'),
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('FONTNAME', (2, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ])

    for i in range(1, len(data)):
        if i % 2 == 0:
            bg = colors.HexColor("#f8fafc")
        else:
            bg = colors.white
        tbl_style.add('BACKGROUND', (0, i), (-1, i), bg)
        tbl_style.add('FONTNAME', (4, i), (4, i), 'Helvetica-Bold')

    t.setStyle(tbl_style)
    elements.append(t)
    elements.append(Spacer(1, 30))

    total_style = ParagraphStyle(name='Total', parent=styles['Normal'], fontSize=14, alignment=2)

    if running_balance > 0:
        total_text = f"<font color='red'><b>Total Outstanding: Rs. {running_balance:,.2f}</b></font>"
    elif running_balance < 0:
        total_text = f"<font color='green'><b>Advance Paid (Credit): Rs. {abs(running_balance):,.2f}</b></font>"
    else:
        total_text = "<font color='green'><b>No Dues (Balance Cleared)</b></font>"
        
    elements.append(Paragraph(total_text, total_style))

    doc.build(elements)
    buffer.seek(0)

    # response = make_response(buffer.getvalue())
    # response.headers['Content-Type'] = 'application/pdf'
    # filename = f"Statement_{resident.resident_name.replace(' ', '_')}.pdf"
    # response.headers['Content-Disposition'] = f'attachment; filename={filename}'

    return buffer