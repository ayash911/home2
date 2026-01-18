from app.extensions import db
from datetime import datetime
from sqlalchemy.dialects.mysql import INTEGER

class MeterReading(db.Model):
    __tablename__ = 'meter_readings'
    __table_args__ = (
        db.UniqueConstraint('resident_id', 'year', 'month_no', name='unique_reading_period'),
    )
    reading_id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('residents.resident_id'), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    month_no = db.Column(db.Integer, nullable=False)
    water_reading = db.Column(db.Numeric(15, 3), nullable=False)
    electricity_reading = db.Column(db.Numeric(15, 3), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)