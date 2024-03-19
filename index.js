const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./pool');
const app = express();


app.use(bodyParser.json());
app.use(cors());
app.use(session({
  secret: 'my-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // expires after 24 hours
}));

app.use('/auth', require('./auth'));
app.use('/reset-password', require('./reset-password'));
app.use('/forgot-password', require('./forgot-password'));
app.use('/data', require('./data'));
app.use('/bulk-upload', require('./bulk-upload'));

app.listen(3001, () => {
  console.log('Server is listening on port 3001');
});