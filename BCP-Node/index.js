const express = require('express');
const mysql = require('mysql2/promise'); 
const bodyParser = require('body-parser');
const crypto = require('crypto');


const app = express();
app.use(bodyParser.json());
const port = 3001;

const config = {
  host: 'localhost',
  user: 'root',
  password: 'Jroot',
  database: 'BCP_Dashboard'                                             
};

console.log("Starting server...");
const pool = mysql.createPool(config);


// POST method for user registration
app.post('/register', bodyParser.json(), async (req, res) => {
    const { userName } = req.body;
    const password = req.body.password;
  
    // Check if username or password is missing
    if (!userName || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
  
    try {
      // Generate a random salt and IV
      const salt = crypto.randomBytes(16).toString('hex');
      const iv = crypto.randomBytes(16);
  
      // Encrypt the password with AES using the generated salt and IV
      const cipher = crypto.createCipheriv('aes-256-cbc', salt, iv);
      let encryptedPassword = cipher.update(password, 'utf8', 'hex');
      encryptedPassword += cipher.final('hex');
  
      // Insert user data into the Login table
      const insertQuery = 'INSERT INTO Login (UserName, Password, Salt, IV) VALUES (?, ?, ?, ?)';
      const [result] = await pool.query(insertQuery, [userName, encryptedPassword, salt, iv.toString('hex')]);
  
      console.log("User registered successfully!");
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: 'Error registering user' });
    }
  });




// POST method for user login
app.post('/login', bodyParser.json(), async (req, res) => {
    const { userName, password } = req.body;
  
    // Check if username or password is missing
    if (!userName || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
  
    try {
      // Check if the user exists in the Login table
      const selectQuery = 'SELECT * FROM Login WHERE UserName = ?';
      const [rows] = await pool.query(selectQuery, [userName]);
  
      // If user exists, decrypt the password with AES using the salt and IV from the database
      if (rows.length > 0) {
        const salt = rows[0].Salt;
        const iv = rows[0].IV;
        const encryptedPassword = rows[0].Password;
  
        const decipher = crypto.createDecipheriv('aes-256-cbc', salt, Buffer.from(iv, 'hex'));
        let decryptedPassword = decipher.update(encryptedPassword, 'hex', 'utf8');
        decryptedPassword += decipher.final('utf8');
  
        // Compare the decrypted password with the provided password
        if (decryptedPassword === password) {
          console.log("User logged in successfully!");
          return res.status(200).json({ message: 'User logged in successfully' });
        } else {
          console.log("Invalid password");
          return res.status(401).json({ message: 'Invalid password' });
        }
      } else {
        // If user doesn't exist, send error response
        console.log("Invalid username");
        return res.status(401).json({ message: 'Invalid username' });
      }
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: 'Error logging in' });
    }
  });





// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
