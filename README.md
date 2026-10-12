# BBQ Booking App

Manage barbecue reservations by date, shift, and barbecue slot. The app stores its database in `bookings.db` beside `app.py`.

## Install on Windows

1. Install Python 3 from [python.org](https://www.python.org/downloads/windows/). Enable the option to add Python to PATH during installation.
2. Download the project from GitHub using **Code > Download ZIP**, then extract the ZIP.
3. Double-click `setup_windows.bat`. It creates a local virtual environment and installs the app dependencies. Internet access is needed for the initial installation.
4. Double-click `run_windows.bat`. The app opens at [http://127.0.0.1:5000](http://127.0.0.1:5000).

To stop the app, close its console window. Bookings remain in `bookings.db` across restarts. Keep that file to preserve the database and make backups regularly.

## Use from other devices on the same Wi-Fi

The standard Windows launcher listens only on this computer. To share it with trusted devices on the same Wi-Fi, set `BOOKING_USERNAME` and `BOOKING_PASSWORD`, then run Waitress bound to the network interface:

```powershell
$env:BOOKING_USERNAME = "waiter"
$env:BOOKING_PASSWORD = "choose-a-long-random-password"
& ".\.venv\Scripts\waitress-serve.exe" --listen=0.0.0.0:5000 app:app
```

On the host computer, find its LAN address with `ipconfig`; on the other device visit `http://HOST-LAN-IP:5000` and enter the credentials. Only do this on a trusted network; use HTTPS before exposing the app to the public internet.

## Self-host on the internet

Use Waitress behind Caddy, set `BOOKING_USERNAME` and `BOOKING_PASSWORD`, and configure a domain or dynamic-DNS hostname in `Caddyfile`. Forward TCP ports `80` and `443` from the router to the host computer and allow those ports through Windows Firewall. Caddy obtains HTTPS certificates automatically when the hostname resolves publicly and those ports are reachable. Direct port forwarding may not work with CGNAT.

## Cloud deployment

Install `requirements.txt` and run:

```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

Set `BOOKING_USERNAME` and `BOOKING_PASSWORD` for any publicly accessible deployment. SQLite data stays on the server's disk, so verify that the hosting provider offers persistent storage.
