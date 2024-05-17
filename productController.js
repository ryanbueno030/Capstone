const express = require('express');
const router = express.Router();
const pool = require('./connection');
const qr = require('qr-image');
const fs = require('fs');

// Retrieve all products
router.get('/', (req, res) => {
    pool.query('SELECT * FROM Product', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error retrieving products' });
        }
        res.status(200).json(results);
    });
});

// Retrieve a specific product by ID
router.get('/:id', (req, res) => {
    const productId = req.params.id;
    pool.query('SELECT * FROM Product WHERE product_id = ?', [productId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error retrieving product' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json(results[0]);
    });
});

// Create a new product with QR code generation
router.post('/', (req, res) => {
    const { Pname, price, sizes, images, size_type, size_value } = req.body;

    // Start a database transaction
    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ error: 'Error connecting to the database' });
        }

        connection.beginTransaction((transactionErr) => {
            if (transactionErr) {
                connection.release();
                return res.status(500).json({ error: 'Error starting database transaction' });
            }

            // Insert product into Product table
            connection.query('INSERT INTO product (Pname, price, sizes, images, size_type, size_value) VALUES (?, ?, ?, ?, ?, ?)',
                [Pname, price, sizes, images, size_type, size_value],
                (productErr, productResult) => {
                    if (productErr) {
                        // Roll back transaction if product insertion fails
                        connection.rollback(() => {
                            connection.release();
                            return res.status(500).json({ error: 'Error creating product' });
                        });
                    }

                    // Generate QR code for the product
                    const productID = productResult.insertId;
                    const qrURL = 'localhost:4200/main/viewshoe'; // URL to redirect when scanning QR code
                    const qrImage = qr.image(qrURL, { type: 'png' });
                    const qrImagePath = `./qr-codes/product_${productID}.png`;

                    qrImage.pipe(fs.createWriteStream(qrImagePath));

                    qrImage.on('end', () => {
                        // Commit the transaction if product and QR code creation succeed
                        connection.commit((commitErr) => {
                            if (commitErr) {
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).json({ error: 'Error committing transaction' });
                                });
                            }

                            connection.release();
                            res.status(201).json({ 
                                message: `Product created with ID: ${productID}`,
                                qr_id: productID // Assuming the product ID is used as qr_id
                            });
                        });
                    });

                    qrImage.on('error', (qrErr) => {
                        // Roll back transaction if QR code generation fails
                        connection.rollback(() => {
                            connection.release();
                            return res.status(500).json({ error: 'Error generating QR code' });
                        });
                    });
                });
        });
    });
});


// Update an existing product
router.put('/:id', (req, res) => {
    const productId = req.params.id;
    const { Pname, price, sizes, images, size_type, size_value } = req.body;
    pool.query('UPDATE Product SET Pname = ?, price = ?, sizes = ?, images = ?, size_type = ?, size_value = ? WHERE product_id = ?',
        [Pname, price, sizes, images, size_type, size_value, productId],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error updating product' });
            }
            res.status(200).json({ message: 'Product updated successfully' });
        });
});

// Delete a product
router.delete('/:id', (req, res) => {
    const productId = req.params.id;
    pool.query('DELETE FROM Product WHERE product_id = ?', [productId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error deleting product' });
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    });
});

// Download or print QR code for a specific product
router.get('/:id/qr-id', (req, res) => {
    const productId = req.params.id;

    // Query the database to retrieve QR code information from the qrcode table
    pool.query('SELECT qr_id FROM qrcode WHERE product_id = ?', [productId], (err, results) => {
        if (err) {
            console.error('Error retrieving QR code:', err);
            return res.status(500).json({ error: 'Error retrieving QR code' });
        }

        // Check if QR code exists for the product
        if (results.length === 0) {
            return res.status(404).json({ error: 'QR code not found for the product' });
        }

        // Extract qr_id from the query results
        const qrId = results[0].qr_id;

        // Construct the file path for the QR code image
        const qrImagePath = `./qr-codes/${qrId}.png`; // Assuming qr_id is a file name

        // Send the QR code image file as a response for download
        res.download(qrImagePath, `product_${productId}_qr.png`, (downloadErr) => {
            if (downloadErr) {
                console.error('Error downloading QR code:', downloadErr);
                res.status(500).json({ error: 'Error downloading QR code' });
            }
        });
    });
});
// Generate QR code for a product
router.get('/generate-qr/:productId', (req, res) => {
    const productId = req.params.productId;

    // Construct the product URL or unique identifier
    const productURL = `https://yourdomain.com/products/${productId}`;

    // Generate QR code with the product URL encoded
    const qrImage = qr.image(productURL, { type: 'png' });
    res.type('png');
    qrImage.pipe(res);
});

// Retrieve product details from the encoded identifier
router.get('/product-details/:productId', (req, res) => {
    const productId = req.params.productId;

    // Retrieve product details from the database using the productId
    pool.query('SELECT * FROM Product WHERE product_id = ?', [productId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error retrieving product' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Redirect user to the product page
        res.redirect(`/products/${productId}`);
    });
});
module.exports = router;
