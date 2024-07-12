const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const glob = require('glob');

// Adjust the glob pattern to include index.js
const endpointFiles = ['./send-invite.js, ./forgot-password.js, ./login.js', './register.js', './logout.js', './reset-password.js', './reset-new.js', './data.js', './bulk-upload.js', './UserData.js', './update.js', './delete.js', './validate-duplicates.js', './Users.js', './Create_ORG.js', './UpdateUsers.js', './DeleteUser.js', './Get-Org.js', './Get_Role.js', './delete_Org.js', './update_Org.js', './UserActive.js', './Bulk-Upload-Update.js'];

const options = {
  swaggerDefinition: {
    openapi: "3.1.0",
    info: {
      title: 'BCP',
      version: '1.0.0',
      description: 'BCP Dashboard',
      contact: {
        name: 'API' 
      },
    },
    servers: [
      {
        url: "http://localhost:3001"
      },
    ],
    basePath: '/',
    tags: [
        {
          name: 'Portfolio',
          description: 'Endpoints for managing files'
        }
      ]
  },
 apis: endpointFiles,
};

const specs = swaggerJSDoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};
