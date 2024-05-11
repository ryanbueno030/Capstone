const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const adminRouter = require('./adminController.js');
const productRouter = require('./productController.js');
const qrcodeRouter = require('./qrcodeController.js');
const port = 8080;
app.use(bodyParser.json());

app.use('/admins', adminRouter);
app.use('/products', productRouter);
app.use('/qrcodes', qrcodeRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});