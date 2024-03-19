const express= require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require('./pool');
const OAuth2Client = require('google-auth-library').OAuth2Client;
const { google } = require('googleapis');
const readline = require('readline');
const { promisify } = require('util');
const https = require('https');
const bodyParser = require('body-parser');


router.post('/', async (req, res) => {
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


  router.get('/callback', async (req, res) => {
    const code = req.query.code;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.send(`Authorization code: ${code}`);
  });

module.exports = router;