const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./pool');
const app = express();
const port = 3001;

// const allowedOrigins = [
//   'http://18.219.123.60', 'http://localhost'
//   // Add more allowed origins here if needed
// ];

// const corsOptions = {
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
// };

// app.use(cors(corsOptions));
// Custom error for unhandled rejections
class UnhandledRejectionError extends Error {
  constructor(reason) {
    super('Unhandled Promise Rejection');
    this.name = 'UnhandledRejectionError';
    this.reason = reason;
  }
}

// limit for JSON payloads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use(cors({ origin: '*' }));

app.use(
  session({
    secret: 'bcp_dashboard',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
  })
);

const forgotPasswordRouter = require('./forgot-password');
const sendInviteRouter = require('./send-invite');

app.use('/api/forgot-password', forgotPasswordRouter);
app.use('/api/send-invite', sendInviteRouter);

// Import and use the Swagger setup
require('./swagger')(app);

// Your existing routes
app.use('/api/login', require('./login'));
app.use('/api/register', require('./register'));
app.use('/api/logout', require('./logout'));
app.use('/api/reset-password', require('./reset-password'));
app.use('/api/reset-new', require('./reset-new'));
app.use('/api/data', require('./data'));
app.use('/api/bulk-upload', require('./bulk-upload'));
app.use('/api/UserData', require('./UserData'));
app.use('/api/update', require('./update'));
app.use('/api/delete', require('./delete'));
app.use('/api/validate-duplicates', require('./validate-duplicates'));
app.use('/api/users', require('./Users'));
app.use('/api/create-org', require('./Create_ORG'));
app.use('/api/Updateuser', require('./UpdateUsers'));
app.use('/api/DeleteUser', require('./DeleteUser'));
app.use('/api/Get-Org', require('./Get-Org'));
app.use('/api/Get-Role', require('./Get_Role'));
app.use('/api/delete-Org', require('./delete_Org'));
app.use('/api/update-Org', require('./update_Org'));
app.use('/api/user-Active', require('./UserActive'));
app.use('/api/bulk-upload-update', require('./Bulk-Upload-Update'));
app.use('/api/Audit', require('./Audit'));

// Middleware to handle unhandled rejections during request processing
app.use((req, res, next) => {
  process.on('unhandledRejection', (reason) => {
    next(new UnhandledRejectionError(reason));
  });
  next();
});
// Error handling middleware
app.use((err, req, res, next) => {
  // console.error(err.stack);
  if (err instanceof UnhandledRejectionError) {
    console.error('Unhandled Rejection Error:', err.reason);
    return res
      .status(500)
      .json({ error: 'Something Went Wrong. Invalid data' });
  }
  // Check if the error is a MySQL promise error
  if (err.code && err.code.startsWith('ER_')) {
    console.error('MySQL Error:', err.message);
    return res.status(500).json({ error: 'Database error occurred' });
  }

  // For other types of errors
  res.status(500).json({ error: 'Something went wrong' });
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
  // throw new UnhandledRejectionError(reason);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
