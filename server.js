const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const FILE = path.join(__dirname, "data", "bookings.json");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function read() {
    try {
        return JSON.parse(fs.readFileSync(FILE, "utf8"));
    } catch {
        return [];
    }
}

function save(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

/* HEALTH */
app.get("/api/health", (req, res) => {
    res.json({ ok: true });
});

/* ADMIN LOGIN */
app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (
        username !== process.env.ADMIN_USERNAME ||
        password !== process.env.ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            message: "Invalid username or password"
        });
    }

    const token = jwt.sign(
        { admin: username },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
    );

    res.json({ token });
});

/* ADMIN AUTHENTICATION */
function adminAuth(req, res, next) {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Admin login required"
        });
    }

    const token = auth.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired admin session"
        });
    }
}

/* CREATE BOOKING — PUBLIC */
app.post("/api/bookings", (req, res) => {
    const b = req.body;

    if (!b.name || !b.phone || !b.service || !b.date || !b.time) {
        return res.status(400).json({
            message: "Required booking information missing"
        });
    }

    const booking = {
        id: "NIR-" + Date.now().toString().slice(-8),
        ...b,
        status: "Pending",
        createdAt: new Date().toISOString()
    };

    const all = read();
    all.unshift(booking);
    save(all);

    res.status(201).json({
        message: "Booking received",
        booking
    });
});

/* GET BOOKINGS — ADMIN ONLY */
app.get("/api/bookings", adminAuth, (req, res) => {
    res.json(read());
});

/* UPDATE BOOKING STATUS — ADMIN ONLY */
app.patch("/api/bookings/:id", adminAuth, (req, res) => {
    const allowed = [
        "Pending",
        "Confirmed",
        "Completed",
        "Cancelled"
    ];

    const all = read();
    const booking = all.find(x => x.id === req.params.id);

    if (!booking) {
        return res.status(404).json({
            message: "Booking not found"
        });
    }

    if (!allowed.includes(req.body.status)) {
        return res.status(400).json({
            message: "Invalid status"
        });
    }

    booking.status = req.body.status;
    save(all);

    res.json(booking);
});

app.listen(PORT, () => {
    console.log("NIRAMAY server running on port " + PORT);
});