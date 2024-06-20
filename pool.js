const mysql = require('mysql2/promise');

const config = {
  host: 'bcpbackendnew.mysql.database.azure.com',
  user: 'bcpadmin',
  port: '3306',
  password: 'B63ntf0rdC@p',
  database: 'bcp',
  ssl: {
    mode: 'require'
  }
};
module.exports = mysql.createPool(config);