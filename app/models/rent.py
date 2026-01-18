from app.extensions import db
from datetime import datetime
from sqlalchemy.dialects.mysql import INTEGER
class RentAgreement(db.Model):
    __tablename__ = 'rent'
    resident_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('residents.resident_id'), primary_key=True)
    rent_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    previous_rent_amount = db.Column(db.Numeric(10, 2), nullable=True, default=0.00)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    resident = db.relationship('Resident', backref=db.backref('rent_agreement', uselist=False))