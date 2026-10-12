import os
import sqlite3
from datetime import date

from flask import Flask, Response, jsonify, render_template, request

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, "bookings.db")
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "5000"))
BOOKING_USERNAME = os.environ.get("BOOKING_USERNAME")
BOOKING_PASSWORD = os.environ.get("BOOKING_PASSWORD")

SHIFT_OPTIONS = ["morning", "afternoon"]
SLOT_OPTIONS = ["bbp-1", "bbp-2", "bbm-1", "bbm-2", "bbg-1", "bbg-2"]
SLOT_LABELS = {
    "bbp-1": "bbp 1",
    "bbp-2": "bbp 2",
    "bbm-1": "bbm 1",
    "bbm-2": "bbm 2",
    "bbg-1": "bbg 1",
    "bbg-2": "bbg 2",
}
AFTERNOON_START = "18:00"
MORNING_START = "05:00"
MORNING_END = "17:55"
AFTERNOON_END = "23:55"
SHIFT_TIME_ERROR = "A partir de las 18:00 la barbacoa pertenece al turno de tarde. Las horas anteriores pertenecen al turno de mañana."
TIME_FORMAT_ERROR = "La hora debe estar entre las 05:00 y las 23:55, en intervalos de 5 minutos."


@app.before_request
def require_booking_credentials():
    if not BOOKING_USERNAME or not BOOKING_PASSWORD:
        return None

    credentials = request.authorization
    if credentials and credentials.username == BOOKING_USERNAME and credentials.password == BOOKING_PASSWORD:
        return None

    return Response(
        "Authentication required",
        401,
        {"WWW-Authenticate": 'Basic realm="BBQ Bookings"'},
    )


def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db


def validate_shift_time(shift, time_value):
    try:
        hour, minute = (int(part) for part in time_value.split(":", 1))
    except (AttributeError, TypeError, ValueError):
        return TIME_FORMAT_ERROR

    if (
        len(time_value) != 5
        or time_value[2] != ":"
        or not 0 <= hour <= 23
        or not 0 <= minute <= 59
        or minute % 5 != 0
        or time_value < MORNING_START
        or time_value > AFTERNOON_END
    ):
        return TIME_FORMAT_ERROR
    if shift == "afternoon" and time_value < AFTERNOON_START:
        return SHIFT_TIME_ERROR
    if shift == "morning" and time_value >= AFTERNOON_START:
        return SHIFT_TIME_ERROR
    return None


def init_db():
    with get_db() as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                date TEXT NOT NULL,
                shift TEXT NOT NULL,
                slot TEXT NOT NULL,
                time TEXT NOT NULL,
                people INTEGER NOT NULL
            )
            """
        )

        if con.execute("SELECT COUNT(*) FROM bookings").fetchone()[0] == 0:
            today = date.today().isoformat()
            demo_bookings = [
                ("Ana", today, "morning", "bbp-1", "09:00", 4),
                ("Luis", today, "afternoon", "bbm-2", "16:30", 6),
                ("Sara", today, "afternoon", "bbg-1", "18:00", 8),
            ]
            con.executemany(
                "INSERT INTO bookings (name, date, shift, slot, time, people) VALUES (?, ?, ?, ?, ?, ?)",
                demo_bookings,
            )
        con.commit()


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/bookings")
def list_bookings():
    requested_date = request.args.get("date")
    query = "SELECT * FROM bookings"
    params = []

    if requested_date:
        query += " WHERE date = ?"
        params.append(requested_date)

    query += " ORDER BY date, shift, slot, time"

    bookings = get_db().execute(query, params).fetchall()
    return jsonify([dict(row) for row in bookings])


@app.post("/api/bookings")
def create_booking():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    date_value = (payload.get("date") or "").strip()
    shift = (payload.get("shift") or "").strip()
    slot = (payload.get("slot") or "").strip()
    time_value = (payload.get("time") or "").strip()
    people_value = payload.get("people")

    if not name:
        return jsonify({"error": "El nombre es obligatorio."}), 400
    if not date_value:
        return jsonify({"error": "La fecha es obligatoria."}), 400
    if shift not in SHIFT_OPTIONS:
        return jsonify({"error": "El turno no es válido."}), 400
    if slot not in SLOT_OPTIONS:
        return jsonify({"error": "La posición no es válida."}), 400
    if not time_value:
        return jsonify({"error": "La hora es obligatoria."}), 400
    shift_time_error = validate_shift_time(shift, time_value)
    if shift_time_error:
        return jsonify({"error": shift_time_error}), 400

    try:
        people = int(people_value)
    except (TypeError, ValueError):
        return jsonify({"error": "Las personas deben ser un número."}), 400

    if people <= 0:
        return jsonify({"error": "Las personas deben ser mayores que cero."}), 400

    db = get_db()
    cursor = db.execute(
        "INSERT INTO bookings (name, date, shift, slot, time, people) VALUES (?, ?, ?, ?, ?, ?)",
        (name, date_value, shift, slot, time_value, people),
    )
    db.commit()
    booking_id = cursor.lastrowid
    row = db.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
    return jsonify(dict(row)), 201


@app.put("/api/bookings/<int:booking_id>")
def update_booking(booking_id):
    payload = request.get_json(silent=True) or {}
    db = get_db()
    existing = db.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()

    if existing is None:
        return jsonify({"error": "No se encontró la reserva."}), 404

    name = (payload.get("name", existing["name"]) or "").strip()
    date_value = (payload.get("date", existing["date"]) or "").strip()
    shift = (payload.get("shift", existing["shift"]) or "").strip()
    slot = (payload.get("slot", existing["slot"]) or "").strip()
    time_value = (payload.get("time", existing["time"]) or "").strip()
    people_value = payload.get("people", existing["people"])

    if not name:
        return jsonify({"error": "El nombre es obligatorio."}), 400
    if shift not in SHIFT_OPTIONS:
        return jsonify({"error": "El turno no es válido."}), 400
    if slot not in SLOT_OPTIONS:
        return jsonify({"error": "La posición no es válida."}), 400
    if not time_value:
        return jsonify({"error": "La hora es obligatoria."}), 400
    shift_time_error = validate_shift_time(shift, time_value)
    if shift_time_error:
        return jsonify({"error": shift_time_error}), 400

    try:
        people = int(people_value)
    except (TypeError, ValueError):
        return jsonify({"error": "Las personas deben ser un número."}), 400

    if people <= 0:
        return jsonify({"error": "Las personas deben ser mayores que cero."}), 400

    db.execute(
        "UPDATE bookings SET name = ?, date = ?, shift = ?, slot = ?, time = ?, people = ? WHERE id = ?",
        (name, date_value, shift, slot, time_value, people, booking_id),
    )
    db.commit()
    row = db.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
    return jsonify(dict(row))


@app.delete("/api/bookings/<int:booking_id>")
def delete_booking(booking_id):
    db = get_db()
    result = db.execute("DELETE FROM bookings WHERE id = ?", (booking_id,))
    db.commit()
    if result.rowcount == 0:
        return jsonify({"error": "No se encontró la reserva."}), 404
    return jsonify({"deleted": True})


init_db()


if __name__ == "__main__":
    app.run(host=HOST, port=PORT, debug=False)
