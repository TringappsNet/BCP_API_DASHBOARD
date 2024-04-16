const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: 'Jroot',
  database: 'BCP_Database'
};


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

module.exports = mysql.createPool(config);