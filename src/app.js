const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const routes = require('./routes');

const app = express();

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000, // Increased for development to prevent Too Many Requests (429) errors
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Welcome Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Task Management Platform API' });
});

// Swagger documentation
const swaggerDocument = YAML.load(path.join(process.cwd(), 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.use('/api', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;
