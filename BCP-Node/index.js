const express = require('express');
const mysql = require('mysql2/promise'); 
const bodyParser = require('body-parser');
const crypto = require('crypto');
const session = require('express-session');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2Client = google.auth.OAuth2;
const readline = require('readline');
const https = require('https');


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

const oauth2Client = new OAuth2Client("435371461403-t06fchktq9am58b2ol74rna40gqghon8.apps.googleusercontent.com",
"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",
"http://localhost:3001/callback");

// Generate a random token and store it in the database
async function generateResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiration = new Date(Date.now() + 3600000).toISOString().substring(0, 19); // token expires in 1 hour
  const insertQuery = 'INSERT INTO ResetTokens (UserID, Token, Expiration) VALUES (?, ?, ?)';
  const [result] = await pool.query(insertQuery, [userId, token, expiration]);
  return token;
}

// Check if the token provided by the user is valid and has not expired
async function isValidToken(token) {
  const selectQuery = 'SELECT * FROM ResetTokens WHERE Token = ?';
  const [rows] = await pool.query(selectQuery, [token]);
  if (rows.length === 0) {
    return false;
  }
  const [row] = rows;
  if (Date.now() > row.Expiration) {
    return false;
  }
  return row.UserID;
}

// Remove the token from the database
function removeToken(token) {
  const deleteQuery = 'DELETE FROM ResetTokens WHERE Token = ?';
  pool.query(deleteQuery, [token]);
}



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
  const errorResponse = (statusCode, message) => ({
    statusCode,
    message
  });
  
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
    res.status(401).send('Invalid Password!');
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


  app.post('/reset-password', async (req, res) => {
    const { userName, oldPassword, newPassword } = req.body;
  
    if (!userName || !oldPassword || !newPassword) {
      return res.status(400).json({ message: 'UserName, old password, and new password are required' });
    }
  
    try {
      // Check if the user exists in the database
      const [rows] = await pool.query('SELECT * FROM Login WHERE UserName = ?', [userName]);
      if (rows.length === 0) {
        return res.status(400).json({ message: 'User not found' });
      }
      const user = rows[0];
  
      // Validate the old password
      const isValidPassword = await bcrypt.compare(oldPassword, user.Password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid old password' });
      }
  
      // Hash the new password
      const salt = await bcrypt.genSalt();
      const newPasswordHash = await bcrypt.hash(newPassword, salt);
  
      // Update the user's password in the database using the user's ID
      const updateQuery = 'UPDATE Login SET Password = ?, Salt = ? WHERE ID = ?';
      await pool.query(updateQuery, [newPasswordHash, salt, user.ID]);
  
      console.log("Password reset successfully!");
      res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: 'Error resetting password' });
    }
  });
  


  app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
  
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
  
    try {
      const [rows] = await pool.query('SELECT * FROM Login WHERE Email = ?', [email]);
      if (rows.length === 0) {
        return res.status(400).json({ message: 'Email not found' });
      }
      const user = rows[0];
      const token = generateResetToken(user.ID);
  
      // Generate an OAuth2 URL for the user to authorize your app
      const scopes = ['https://www.googleapis.com/auth/gmail.compose'];
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
      });
  
      console.log('Authorize this app by visiting this url:', url);
  
      // Make an HTTP request to the OAuth2 authorization URL
      const request = https.request(url, (oauthRes) => {
        const chunks = [];
  
        oauthRes.on('data', (chunk) => {
          chunks.push(chunk);
        });
  
        oauthRes.on('end', async () => {
          const body = Buffer.concat(chunks);
          console.log('Response body:', body.toString());
          // Extract the authorization code from the HTTP response
          const match = body.toString().match(/<input type="hidden" name="code" value="(\w+)"/);
          if (!match) {
            console.error('Error extracting authorization code from HTTP response');
            res.status(500).json({ message: 'Error sending forgot password email' });
            return;
          }
          const code = match[1];
  
          // Use thecode to get an access token and refresh token from the OAuth2 client
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
  
          console.log('Access token:', tokens.access_token);
          console.log('Refresh token:', tokens.refresh_token);
  
          // Create a Nodemailer transporter using the access token and refresh token
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              type: 'OAuth2',
              user: "johnson.selvakumar@tringapps.net",
              clientId: "435371461403-t06fchktq9am58b2ol74rna40gqghon8.apps.googleusercontent.com",
              clientSecret: "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",
              refreshToken: tokens.refresh_token,
              accessToken: tokens.access_token,
            },
          });
  
          // Send the email
          const mailOptions = {
            from: "johnson.selvakumar@tringapps.net",
            to: email,
            subject: 'Reset your password',
            text: `Click this link to reset your password: http://your-app.com/reset-password?token=${token}`
          };
          const info = await transporter.sendMail(mailOptions);
          console.log('Email sent:', info.messageId);
  
          // Save the refresh token in the database
          const updateQuery = 'UPDATE Login SET ResetToken = ? WHERE ID = ?';
          await pool.query(updateQuery, [tokens.refresh_token, user.ID]);
  
          res.status(200).json({ message: 'Forgot password email sent' });
        });
      }).on('error', (error) => {
        console.error('Error making HTTP request to OAuth2 authorization URL:', error);
        res.status(500).json({ message: 'Error sending forgot passwordemail' });
      });
  
    } catch (error) {
      console.error("Error sending forgot password email:", error);
      res.status(500).json({ message: 'Error sending forgot password email' });
    }
  });


  app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.send(`Authorization code: ${code}`);
  });

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});