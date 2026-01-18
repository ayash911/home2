from app.extensions import db
from datetime import datetime
from sqlalchemy.dialects.mysql import INTEGER

class MonthlyBill(db.Model):
    __tablename__ = 'monthly_bills'
    __table_args__ = (
        db.UniqueConstraint('resident_id', 'year', 'month_no', name='unique_bill_period'),
    )
    bill_id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('residents.resident_id'), nullable=False)

    reading_id = db.Column(db.Integer, db.ForeignKey('meter_readings.reading_id', ondelete='CASCADE'), nullable=True)
    

    year = db.Column(db.Integer, nullable=False)
    month_no = db.Column(db.Integer, nullable=False)
    rent_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    
    water_used = db.Column(db.Numeric(15, 3), nullable=False)
    water_cost = db.Column(db.Numeric(12, 2), nullable=False)
    electricity_used = db.Column(db.Numeric(15, 3), nullable=False)
    electricity_cost = db.Column(db.Numeric(12, 2), nullable=False)
    total_cost = db.Column(db.Numeric(12, 2), nullable=False)

    e_rate = db.Column(db.Numeric(10, 4), nullable=False)
    w_rate = db.Column(db.Numeric(10, 4), nullable=False)
    
    generated_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    reading = db.relationship('MeterReading', backref=db.backref('bill', uselist=False))