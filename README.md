# BBQ Booking App

This app lets restaurant staff manage barbecue reservations by day, shift, and BBQ type.

## Local run

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py
```

Then open:

```text
http://localhost:5000
```

## Cloud deployment

This project is prepared for deployment to services like Render, Railway, or any provider that supports a Python web app.

### Required environment variables

- `PORT` (set automatically by most cloud providers)
- `HOST` (optional, usually default is `0.0.0.0`)

### Example start command

```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```
