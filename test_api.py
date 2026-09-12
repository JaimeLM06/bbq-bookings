import json, urllib.request

base = "http://127.0.0.1:5000"

def get(path):
    with urllib.request.urlopen(base + path, timeout=10) as r:
        return r.status, json.loads(r.read().decode())

def post(payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(base + "/api/bookings", data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status, json.loads(r.read().decode())

def put(booking_id, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(base + f"/api/bookings/{booking_id}", data=data, headers={"Content-Type": "application/json"}, method="PUT")
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status, json.loads(r.read().decode())

def delete(booking_id):
    req = urllib.request.Request(base + f"/api/bookings/{booking_id}", method="DELETE")
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status, json.loads(r.read().decode())

created = post({"name":"Test Waiter","date":"2026-09-12","shift":"morning","slot":"bbm-1","time":"10:00","people":7})
print("POST", created)
status, bookings = get("/api/bookings?date=2026-09-12")
print("LIST", status, len(bookings), bookings[-1])
booking_id = bookings[-1]["id"]
updated = put(booking_id, {"name":"Updated Waiter","date":"2026-09-12","shift":"morning","slot":"bbm-1","time":"11:00","people":9})
print("PUT", updated)
deleted = delete(booking_id)
print("DELETE", deleted)
