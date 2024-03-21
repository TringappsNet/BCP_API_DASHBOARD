const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./pool');
const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(cors());
app.use(session({
  secret: 'bcp_dashboard',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // expires after 24 hours
}));

app.use('/login', require('./login'));
app.use('/register', require('./register'));
app.use('/logout', require('./logout'));
app.use('/reset-password', require('./reset-password'));
app.use('/forgot-password', require('./forgot-password'));
app.use('/data', require('./data'));
app.use('/bulk-upload', require('./bulk-upload'));
app.use('/UserData', require('./UserData'));
app.use('/update', require('./update'));



// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});