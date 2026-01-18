from doctest import debug
from app import create_app, db

app = create_app()

if __name__ == '__main__':
    print("Starting Home Utility Accounting System...")
    app.run()


