const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const adminRouter = require('./adminController.js');
const productRouter = require('./productController.js');
const qrcodeRouter = require('./qrcodeController.js');
const cors = require('cors');

const port = 8080;
app.use(bodyParser.json());

    // Enable CORS for all routes
    app.use(cors());

app.use('/admins', adminRouter);
app.use('/products', productRouter);
app.use('/qrcodes', qrcodeRouter);

// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);


});