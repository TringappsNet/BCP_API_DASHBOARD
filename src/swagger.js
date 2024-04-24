const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const glob = require('glob');

const endpointFiles = glob.sync('./src/endpoints/**/*.js');

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
