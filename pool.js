const mysql = require('mysql');
const fs = require('fs');

const pool = mysql.createConnection({
  host: 'bcpbackendnew.mysql.database.azure.com',
  user: 'bcpadmin',
  password: 'B63ntf0rdC@p',
  database: 'bcp',
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('./certs/certificate1.pem')
  }
});

pool.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL database!');
  }
});

module.exports = pool;
