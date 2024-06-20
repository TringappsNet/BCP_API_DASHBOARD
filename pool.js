const mysql = require('mysql2/promise');

const config = {
  host: '',
  user: 'bcpadmin',
  port: '3306',
  password: '',
  database: 'bcp',
  ssl: {
    mode: 'require'
  }
};
module.exports = mysql.createPool(config);