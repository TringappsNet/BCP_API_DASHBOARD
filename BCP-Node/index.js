const express = require('express');
const mysql = require('mysql2/promise'); 
const bodyParser = require('body-parser');
const crypto = require('crypto');
const session = require('express-session');
const bcrypt = require('bcrypt');


const app = express();
app.use(bodyParser.json());
const port = 3001;

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




app.post('/register', bodyParser.json(), async (req, res) => {
  const { userName, password, email, organization, phoneNo } = req.body;

  if (!userName || !password || !email || !organization || !phoneNo) {
    return res.status(400).json({ message: 'Username, password, email, organization, and phone number are required' });
  }

  if (userName.length < 3) {
    return res.status(400).json({ message: 'Username must be at least 3 characters long' });
  }

  if (organization.length < 3) {
    return res.status(400).json({ message: 'Organization must be at least 3 characters long' });
  }

  if (!/^[\w-]+(.[\w-]+)*@([\w-]+.)+[a-zA-Z]{2,7}$/.test(email)) {
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

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user data into the Login table
    const insertQuery = 'INSERT INTO Login (UserName, Password, Email,Organization, PhoneNo, Salt) VALUES (?, ?, ?, ?, ?, ?)';
    const [result] = await pool.query(insertQuery, [userName, passwordHash, email, organization, phoneNo, salt]);

    console.log("User registered successfully!");
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

app.post('/login', async (req, res) => {
  const { userName, password } = req.body;

  if (!userName || !password) {
    return res.status(400).send('Username and password are required!');
  }

  try {
    const [rows] = await pool.query('SELECT * FROM Login WHERE UserName = ?', [userName]);
if (rows.length > 0) {
  const user = rows[0];
  console.log('Hashed password from database:', user.Password);
  const hashedPassword = await bcrypt.hash(password, user.Salt);
  console.log('Hashed password from entered password:', hashedPassword);
  if (hashedPassword === user.Password) {
    // Create a session for the user
    req.session.userId = user.ID;
    req.session.userName = user.UserName;
    res.send('LoggedIn');
  } else {
    res.send('Not Valid User!');
  }
} else {
  res.status(400).send('User Not Found!');
}
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: 'Error logging in user' });
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