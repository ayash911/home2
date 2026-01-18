from app.extensions import db
from sqlalchemy.dialects.mysql import INTEGER
class Resident(db.Model):
    __tablename__ = 'residents'
    resident_id = db.Column(INTEGER(unsigned=True), primary_key=True)
    home_id = db.Column(db.Integer, db.ForeignKey('homes.home_id'), nullable=False)
    resident_name = db.Column(db.String(100), nullable=False)
    floor_no = db.Column(db.Integer, nullable=False)
    home = db.relationship('Home')