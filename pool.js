const mysql = require('mysql2/promise');

// const config = {
//   host: 'localhost',
//   user: 'root',
//   password: 'Jroot',
//   database: 'BCP_Database'
// };


// const config = {
//     host: 'localhost',
//     user: 'root',
//     password: 'root',
//     database: 'bcp'
//   };



// const config = {
//   host: '192.168.1.50',
//   user: 'root',
//   password: 'root',
//   database: 'BCP_Dashboard'
// };

  

// const config = {
//   host: '192.168.1.50',
//   user: 'root',
//   password: 'root',
//   database: 'BCP_Database'
  
// };


const config = {
  host: 'database-1.c3qaws60khba.us-east-2.rds.amazonaws.com',
  user: 'admin',
  port: '3306',
  password: '#b3nf0rd2024',
  database: 'bcp'
  
};

module.exports = mysql.createPool(config);