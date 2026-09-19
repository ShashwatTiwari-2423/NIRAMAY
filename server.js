const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   NEON DATABASE
========================= */

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 5
});

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* =========================
   CREATE BOOKINGS TABLE
========================= */

async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id VARCHAR(50) PRIMARY KEY,
                name TEXT NOT NULL,
                age TEXT,
                gender TEXT,
                phone TEXT NOT NULL,
                email TEXT,
                service TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                collection TEXT,
                address TEXT,
                city TEXT,
                pincode TEXT,
                status VARCHAR(30) DEFAULT 'Pending',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        console.log("Neon database connected successfully.");
        console.log("Bookings table ready.");
    } catch (error) {
        console.error("Database connection error:", error.message);
    }
}

/* =========================
   HEALTH
========================= */

app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        database: "Neon PostgreSQL"
    });
});

/* =========================
   ADMIN LOGIN
========================= */

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

/* =========================
   ADMIN AUTHENTICATION
========================= */

function adminAuth(req, res, next) {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Admin login required"
        });
    }

    const token = auth.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.admin = decoded;
        next();

    } catch {
        return res.status(401).json({
            message: "Invalid or expired admin session"
        });
    }
}

/* =========================
   CREATE BOOKING — PUBLIC
========================= */

app.post("/api/bookings", async (req, res) => {

    try {

        const b = req.body;

        if (
            !b.name ||
            !b.phone ||
            !b.service ||
            !b.date ||
            !b.time
        ) {
            return res.status(400).json({
                message: "Required booking information missing"
            });
        }

        const id =
            "NIR-" +
            Date.now().toString().slice(-8);

        const result = await pool.query(
            `
            INSERT INTO bookings (
                id,
                name,
                age,
                gender,
                phone,
                email,
                service,
                date,
                time,
                collection,
                address,
                city,
                pincode,
                status
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,
                $9,$10,$11,$12,$13,$14
            )
            RETURNING *
            `,
            [
                id,
                b.name,
                b.age || "",
                b.gender || "",
                b.phone,
                b.email || "",
                b.service,
                b.date,
                b.time,
                b.collection || "",
                b.address || "",
                b.city || "",
                b.pincode || "",
                "Pending"
            ]
        );

        const row = result.rows[0];

        const booking = {
            id: row.id,
            name: row.name,
            age: row.age,
            gender: row.gender,
            phone: row.phone,
            email: row.email,
            service: row.service,
            date: row.date,
            time: row.time,
            collection: row.collection,
            address: row.address,
            city: row.city,
            pincode: row.pincode,
            status: row.status,
            createdAt: row.created_at
        };

        res.status(201).json({
            message: "Booking received",
            booking
        });

    } catch (error) {

        console.error("Booking error:", error);

        res.status(500).json({
            message: "Unable to save booking"
        });
    }
});

/* =========================
   GET BOOKINGS — ADMIN ONLY
========================= */

app.get("/api/bookings", adminAuth, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                id,
                name,
                age,
                gender,
                phone,
                email,
                service,
                date,
                time,
                collection,
                address,
                city,
                pincode,
                status,
                created_at AS "createdAt"
            FROM bookings
            ORDER BY created_at DESC
        `);

        res.json(result.rows);

    } catch (error) {

        console.error("Fetch bookings error:", error);

        res.status(500).json({
            message: "Unable to fetch bookings"
        });
    }
});

/* =========================
   UPDATE BOOKING STATUS
========================= */

app.patch("/api/bookings/:id", adminAuth, async (req, res) => {

    try {

        const allowed = [
            "Pending",
            "Confirmed",
            "Completed",
            "Cancelled"
        ];

        const { status } = req.body;

        if (!allowed.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const result = await pool.query(
            `
            UPDATE bookings
            SET status = $1
            WHERE id = $2
            RETURNING
                id,
                name,
                age,
                gender,
                phone,
                email,
                service,
                date,
                time,
                collection,
                address,
                city,
                pincode,
                status,
                created_at AS "createdAt"
            `,
            [status, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {

        console.error("Update booking error:", error);

        res.status(500).json({
            message: "Unable to update booking"
        });
    }
});

/* =========================
   DELETE BOOKING — ADMIN ONLY
========================= */

app.delete("/api/bookings/:id", adminAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `
            DELETE FROM bookings
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        res.json({
            message: "Booking deleted successfully",
            id: result.rows[0].id
        });

    } catch (error) {
        console.error("Delete booking error:", error);

        res.status(500).json({
            message: "Unable to delete booking"
        });
    }
});
/* =========================
   START SERVER
========================= */

async function startServer() {

    await initDatabase();

    app.listen(PORT, () => {
        console.log(
            "NIRAMAY server running on port " + PORT
        );
    });
}

startServer();