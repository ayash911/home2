from app.extensions import db

class Home(db.Model):
    __tablename__ = 'homes'
    home_id = db.Column(db.Integer, primary_key=True)
    home_name = db.Column(db.String(100), nullable=False)
    pricing = db.relationship('UtilityPrice', backref='home', uselist=False)

class UtilityPrice(db.Model):
    __tablename__ = 'utility_prices'
    home_id = db.Column(db.Integer, db.ForeignKey('homes.home_id'), primary_key=True)
    water_price_per_liter = db.Column(db.Numeric(10, 4), nullable=False)
    electricity_price_per_unit = db.Column(db.Numeric(10, 4), nullable=False)