const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const app = express();
const port = 3001;


app.use(bodyParser.json());
app.use(cors());
app.use(session({
  secret: 'bcp_dashboard',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } 
}));


// Import and use the Swagger setup
require('./swagger')(app);

// Your existing routes
app.use('/', require('./endpoints/misc/home'));
app.use('/login', require('./endpoints/authentication/login'));
app.use('/logout', require('./endpoints/authentication/logout'));
app.use('/register', require('./endpoints/authentication/register'));
app.use('/reset-password', require('./endpoints/authentication/resetPassword'));
app.use('/reset-new', require('./endpoints/authentication/resetNewPasssword'));
app.use('/data', require('./endpoints/dataManagement/getPortfolioData'));
app.use('/update', require('./endpoints/dataManagement/updatePortfolioData'));
app.use('/delete', require('./endpoints/dataManagement/deletePortfolioData'));
app.use('/validate-duplicates', require('./endpoints/dataManagement/validateDuplicates'));
app.use('/users', require('./endpoints/userManagement/usersGet'));
app.use('/create-org', require('./endpoints/orgManagement/createOrganization'));
app.use('/Updateuser', require('./endpoints/userManagement/userUpdate'));
app.use('/DeleteUser', require('./endpoints/userManagement/userDelete'));
app.use('/Get-Org', require('./endpoints/orgManagement/getOrganization'));
app.use('/Get-Role', require('./endpoints/misc/getRole'));
app.use('/delete-Org', require('./endpoints/orgManagement/deleteOrganization'));
app.use('/update-Org', require('./endpoints/orgManagement/updateOrganization'));
app.use('/user-Active', require('./endpoints/userManagement/userActive'));
app.use('/bulk-upload-update', require('./endpoints/dataManagement/bulkUpload'));
app.use('/forgot-password', require('./endpoints/authentication/forgot-password'));
app.use('/send-invite', require('./endpoints/authentication/sendInvite'));


// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
