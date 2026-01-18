from app.extensions import db
from sqlalchemy.dialects.mysql import INTEGER


class ResidentPhone(db.Model):
    __tablename__ = 'resident_phones'
    resident_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('residents.resident_id'), nullable=False, primary_key=True)
    primary_phone = db.Column(db.String(20), nullable=False)
    secondary_phone = db.Column(db.String(20), nullable=True)
    
    resident = db.relationship('Resident', backref=db.backref('phone_contact', uselist=False))