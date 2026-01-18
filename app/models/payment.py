from app.extensions import db
from datetime import datetime
from sqlalchemy.dialects.mysql import INTEGER 

class Payment(db.Model):
    __tablename__ = 'payments'
    
    payment_id = db.Column(db.Integer, primary_key=True)
    INTEGER(unsigned=True)
    resident_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('residents.resident_id'), nullable=False)
    
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(50), default="Cash") 
    notes = db.Column(db.String(200), nullable=True)
    
    payment_date = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    resident = db.relationship('Resident')