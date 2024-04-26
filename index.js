const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./pool');
const app = express();
const port = 3001;

const allowedOrigins = [
  'http://18.219.123.60',
  // Add more allowed origins here if needed
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(cors(corsOptions));


app.use(bodyParser.json());
// app.use(cors());
app.use(session({
  secret: 'bcp_dashboard',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } 
}));

const forgotPasswordRouter = require('./forgot-password');
const sendInviteRouter = require('./send-invite');

app.use('/forgot-password', forgotPasswordRouter);
app.use('/send-invite', sendInviteRouter);

// Import and use the Swagger setup
require('./swagger')(app);

// Your existing routes
app.use('/login', require('./login'));
app.use('/register', require('./register'));
app.use('/logout', require('./logout'));
app.use('/reset-password', require('./reset-password'));
app.use('/reset-new', require('./reset-new'));
app.use('/data', require('./data'));
app.use('/bulk-upload', require('./bulk-upload'));
app.use('/UserData', require('./UserData'));
app.use('/update', require('./update'));
app.use('/delete', require('./delete'));
app.use('/validate-duplicates', require('./validate-duplicates'));
app.use('/users', require('./Users'));
app.use('/create-org', require('./Create_ORG'));
app.use('/Updateuser', require('./UpdateUsers'));
app.use('/DeleteUser', require('./DeleteUser'));
app.use('/api/Get-Org', require('./Get-Org'));
app.use('/Get-Role', require('./Get_Role'));
app.use('/delete-Org', require('./delete_Org'));
app.use('/update-Org', require('./update_Org'));
app.use('/user-Active', require('./UserActive'));
app.use('/bulk-upload-update', require('./Bulk-Upload-Update'));
app.use('/Audit', require('./Audit'));


// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
