import os
import sqlite3
from datetime import date

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, "bookings.db")
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "5000"))

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


def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db


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
        return jsonify({"error": "Booking not found."}), 404

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
