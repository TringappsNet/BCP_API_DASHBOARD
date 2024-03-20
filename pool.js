const mysql = require('mysql2/promise');

// const config = {
//   host: 'localhost',
//   user: 'root',
//   password: 'Jroot',
//   database: 'BCP_Dashboard'
// };

const config = {
    host: '14.194.141.107',
    user: 'root',
    password: 'root',
    database: 'BCP_Dashboard'
  };
  
module.exports = mysql.createPool(config);