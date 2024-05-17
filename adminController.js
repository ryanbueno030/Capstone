const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('./connection');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware function to verify JWT token
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).send('Token is required');
    }

    jwt.verify(token, 'your_secret_key', (err, decoded) => {
        if (err) {
            return res.status(401).send('Invalid token');
        }
        req.adminId = decoded.adminId;
        next();
    });
}

// Admin registration endpoint
router.post('/register', upload.single('image'), async (req, res) => {
    const { username, password, fname, lname, mname, suffix, age, address } = req.body;
    const image = req.file ? req.file.path : null;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new admin into the database
    pool.query('INSERT INTO Admin (username, password, fname, lname, mname, suffix, age, address, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [username, hashedPassword, fname, lname, mname, suffix, age, address, image],
        (err, result) => {
            if (err) {
                return res.status(500).send('Error registering admin');
            }
            res.status(201).send('Admin registered successfully');
        });
});

// Admin login endpoint
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Retrieve admin from the database by username
    pool.query('SELECT * FROM Admin WHERE username = ?', [username], async (err, results) => {
        if (err) {
            return res.status(500).send('Error authenticating admin');
        }

        // Check if admin with the given username exists
        if (results.length === 0) {
            return res.status(401).send('Invalid username or password');
        }

        // Compare the provided password with the hashed password from the database
        const match = await bcrypt.compare(password, results[0].password);
        if (!match) {
            return res.status(401).send('Invalid username or password');
        }

        // Generate JWT token
        const token = jwt.sign({ adminId: results[0].admin_id }, 'your_secret_key', { expiresIn: '1h' });

        // Send the token back to the client
        res.status(200).json({ token });
    });
});

// Admin edit endpoint
router.put('/:adminId', verifyToken, upload.single('image'), async (req, res) => {
    const adminId = req.params.adminId;
    const { fname, lname, mname, suffix, age, address } = req.body;
    const image = req.file ? req.file.path : req.body.images; // Use new image if uploaded, otherwise keep the existing

    // Update admin profile in the database
    pool.query('UPDATE Admin SET fname = ?, lname = ?, mname = ?, suffix = ?, age = ?, address = ?, images = ? WHERE admin_id = ?',
        [fname, lname, mname, suffix, age, address, image, adminId],
        (err, result) => {
            if (err) {
                return res.status(500).send('Error updating admin profile');
            }
            res.status(200).send('Admin profile updated successfully');
        });
});

// Retrieve all QR codes
router.get('/qrcodes', verifyToken, (req, res) => {
    pool.query('SELECT * FROM QRCode', (err, results) => {
        if (err) {
            return res.status(500).send('Error retrieving QR codes');
        }
        res.status(200).json(results);
    });
});

// Retrieve a specific QR code by ID
router.get('/qrcodes/:id', verifyToken, (req, res) => {
    const qrId = req.params.id;
    pool.query('SELECT * FROM QRCode WHERE qr_id = ?', [qrId], (err, results) => {
        if (err) {
            return res.status(500).send('Error retrieving QR code');
        }
        if (results.length === 0) {
            return res.status(404).send('QR code not found');
        }
        res.status(200).json(results[0]);
    });
});

// Create a new QR code
router.post('/qrcodes', verifyToken, (req, res) => {
    const productId = req.body.productId;
    pool.query('INSERT INTO QRCode (product_id) VALUES (?)', [productId], (err, result) => {
        if (err) {
            return res.status(500).send('Error creating QR code');
        }
        res.status(201).send(`QR code created with ID: ${result.insertId}`);
    });
});

// Delete a QR code
router.delete('/qrcodes/:id', verifyToken, (req, res) => {
    const qrId = req.params.id;
    pool.query('DELETE FROM QRCode WHERE qr_id = ?', [qrId], (err, result) => {
        if (err) {
            return res.status(500).send('Error deleting QR code');
        }
        res.status(200).send('QR code deleted successfully');
    });
});

module.exports = router;
