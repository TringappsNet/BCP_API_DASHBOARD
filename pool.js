const mysql = require('mysql2/promise');
const fs = require('fs');

const config = {
  host: 'localhost',
  user: 'root',
  password: 'Dinesh_2002',
  database: 'bcp',
  port: 3306,
  // ssl: {
  //   rejectUnauthorized: true,
  //   ca: fs.readFileSync('./certs/certificate1.pem'),
  // },
};

module.exports = mysql.createPool(config);
