const mysql = require('mysql2/promise');
const config = {
  host: 'localhost',
  user: 'root',
  password: 'Jroot',
  database: 'BCP_Dashboard'
};
module.exports = mysql.createPool(config);