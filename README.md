# NIRAMAY Booking Backend

This makes the Book Test form send bookings to a Node.js backend and gives you an Admin Dashboard.

## Setup
1. Install Node.js LTS.
2. Open this folder in VS Code.
3. Open Terminal.
4. Run: `npm install`
5. Run: `npm start`
6. Open `http://localhost:3000/admin.html`

## Connect your existing booking page
Use `public/booking-backend.js` in place of your current booking submit JavaScript.
The form fields should be named: `name`, `phone`, `email`, `service`, `date`, `time`, `collection`, `notes`.

Bookings are stored in `data/bookings.json` for learning/testing. Do not use this local JSON setup for real patient/medical data in production. A production system needs a proper database, authentication, HTTPS, secure validation, privacy controls and secure file handling.
