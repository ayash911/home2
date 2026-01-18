from flask import Flask
from werkzeug.datastructures import auth
from app.extensions import db
from flask_cors import CORS 
from dotenv import load_dotenv
import os
load_dotenv()


def create_app():
    app = Flask(__name__)
    CORS(
        app,
        resources={r"/*": {"origins": [
            "https://home2-2r5o.onrender.com"
        ]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    
    # app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:1234@localhost/home_utility_db'
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    # app.config['SECRET_KEY'] = 'change_this_to_a_random_secret_string'
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY")

    db.init_app(app)

    with app.app_context():
        from app.models.home import Home, UtilityPrice
        from app.models.resident import Resident
        from app.models.reading import MeterReading
        from app.models.bill import MonthlyBill
        from app.models.rent import RentAgreement
        from app.models.payment import Payment
        from app.models.phone import ResidentPhone
        from app.models.admin import AdminUser
        db.create_all()

    from app.routes.reading_routes import reading_bp
    from app.routes.bill_routes import bill_bp
    from app.routes.resident_routes import resident_bp
    from app.routes.report_routes import report_bp
    from app.routes.utility_routes import utility_bp
    from app.routes.payment_routes import payment_bp
    from app.routes.home_routes import home_bp
    from app.routes.dashboard_routes import dashboard_bp
    from app.routes.auth_routes import auth_bp
    from app.routes.correction_routes import correction_bp
    from app.routes.ledger_routes import ledger_bp
    from app.routes.pdf_routes import pdf_bp
    from app.routes.mail_routes import mail_bp

    app.register_blueprint(reading_bp)
    app.register_blueprint(bill_bp)
    app.register_blueprint(resident_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(utility_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(home_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(correction_bp)
    app.register_blueprint(ledger_bp)
    app.register_blueprint(pdf_bp)
    app.register_blueprint(mail_bp)
    return app