const express = require('express');
const mysql = require('mysql2/promise'); 
const bodyParser = require('body-parser');
const crypto = require('crypto');
const session = require('express-session');


const app = express();
app.use(bodyParser.json());
const port = 3131;

app.use(session({
  secret: 'my-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // expires after 24 hours
}));

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
  const { userName, password, email, organization, phoneNo } = req.body;

  // Check if username or password is missing
  if (!userName || !password || !email || !organization || !phoneNo) {
    return res.status(400).json({ message: 'Username, password, email, organization, and phone number are required' });
  }

  // Check if the username is at least 3 characters long
  if (userName.length < 3) {
    return res.status(400).json({ message: 'Username must be at least 3 characters long' });
  }

  // Check if the organization is at least 3 characters long
  if (organization.length < 3) {
    return res.status(400).json({ message: 'Organization must be at least 3 characters long' });
  }

  // Check if the email is a valid email address
  if (!/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
    return res.status(400).json({ message: 'Email is not a valid email address' });
  }

  try {
    // Check if the username already exists in the database
    const selectUserQuery = 'SELECT * FROM Login WHERE UserName = ?';
    const [rows] = await pool.query(selectUserQuery, [userName]);
    if (rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if the email already exists in the database
    const selectEmailQuery = 'SELECT * FROM Login WHERE Email = ?';
    const [rows2] = await pool.query(selectEmailQuery, [email]);
    if (rows2.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Generate a random salt and IV
    const salt = crypto.randomBytes(16).toString('hex');
    const iv = crypto.randomBytes(16);

    // Encrypt the password with AES using the generated salt and IV
    const cipher = crypto.createCipheriv('aes-256-cbc', salt, iv);
    let encryptedPassword = cipher.update(password, 'utf8', 'hex');
    encryptedPassword += cipher.final('hex');

    // Insert user data into the Login table
    const insertQuery = 'INSERT INTO Login (UserName, Password, Email, Organization, PhoneNo, Salt, IV) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const [result] = await pool.query(insertQuery, [userName, encryptedPassword, email, organization, phoneNo, salt, iv.toString('hex')]);

    console.log("User registered successfully!");
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: 'Error registering user' });
  }
});


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

    // If user exists, compare the hashed password with the provided password
    if (rows.length > 0) {
      const hashedPassword = rows[0].Password;
      const isPasswordMatch = await comparePasswords(password, hashedPassword);

      if (isPasswordMatch) {
        // Create a session for the user
        req.session.userId = rows[0].ID;
        req.session.userName = rows[0].UserName;

        console.log("User logged in successfully!");
        res.status(200).json({ message: 'User logged in successfully' });
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

async function comparePasswords(password, hashedPassword) {
  const salt = hashedPassword.slice(0, 64);
  const hashedBuffer = Buffer.from(hashedPassword.slice(64), 'hex');

  // Generate a key using the provided password and salt
  const key = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');

  // Pad the key buffer with zeroes to match the length of the hashedBuffer
  const paddedKey = Buffer.alloc(hashedBuffer.length, key);

  // Compare the padded key with the hashed password
  return crypto.timingSafeEqual(paddedKey, hashedBuffer);
}


app.post('/reset-password', bodyParser.json(), async (req, res) => {
  if (!req.session.userName) {
    // If there is no session, send an error response
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { email, oldPassword, newPassword } = req.body;

  // Check if email, old password, or new password is missing
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Email, old password, and new password are required' });
  }

  // Check if the email is a valid email address
  if (!/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
      return res.status(400).json({ message: 'Email is not a valid email address' });
    }
  
    try {
      // Check if the email exists in the database
      const selectQuery = 'SELECT * FROM Login WHERE Email = ?';
      const [rows] = await pool.query(selectQuery, [email]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Email not found' });
      }
  
      // If user exists, decrypt the password with AES using the salt and IV from the database
      if (rows.length > 0) {
        const salt = rows[0].Salt;
        const iv = rows[0].IV;
        const encryptedPassword = rows[0].Password;
  
        const decipher = crypto.createDecipheriv('aes-256-cbc', salt, Buffer.from(iv, 'hex'));
        let decryptedPassword = decipher.update(encryptedPassword, 'hex', 'utf8');
        decryptedPassword += decipher.final('utf8');
  
        // Compare the decrypted password with the provided old password
        if (decryptedPassword !== oldPassword) {
          console.log("Invalid old password");
          return res.status(401).json({ message: 'Invalid old password' });
        }
  
        // Generate a random salt and IV
        const newSalt = crypto.randomBytes(16).toString('hex');
        const newIv = crypto.randomBytes(16);
  
        // Encrypt the new password with AES using the generated salt and IV
        const cipher = crypto.createCipheriv('aes-256-cbc', newSalt, newIv);
        let encryptedNewPassword = cipher.update(newPassword, 'utf8', 'hex');
        encryptedNewPassword += cipher.final('hex');
  
        // Update the password in the Login table
        const updateQuery = 'UPDATE Login SET Password = ?, Salt = ?, IV = ? WHERE Email = ?';
        const [result] = await pool.query(updateQuery, [encryptedNewPassword, newSalt, newIv.toString('hex'), email]);
  
        console.log("Password updated successfully!");
        res.status(200).json({ message: 'Password updated successfully' });
      } else {
        // If user doesn't exist, send error response
        console.log("Invalid username");
        return res.status(401).json({ message: 'Invalid username' });
      }
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: 'Error updating password' });
    }
  });

  app.post('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy();
    res.status(200).json({ message: 'Logged Out' });

  });


// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
