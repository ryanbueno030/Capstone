/* Admin table */
CREATE TABLE Admin (
    admin_id INT PRIMARY KEY,
    username VARCHAR(255),
    password VARCHAR(255),
    fname VARCHAR(255),
    lname VARCHAR(255),
    mname VARCHAR(255),
    suffix VARCHAR(50),
    age INT,
    address VARCHAR(255),
    images VARCHAR(255) 
);

/* Product table */
CREATE TABLE Product (
    product_id INT PRIMARY KEY,
    Pname VARCHAR(255),
    price DECIMAL(10, 2), 
    sizes VARCHAR(255),
    images VARCHAR(255), 
    size_type VARCHAR(50),
    size_value VARCHAR(50)
);

/* QRCode table */
CREATE TABLE QRCode (
    qr_id INT PRIMARY KEY,
    product_id INT,
    FOREIGN KEY (product_id) REFERENCES Product(product_id)
);