// index.js - backend complet funcțional

const express = require('express');
const app = express();

// Folosim portul setat de Railway sau 3000 local
const PORT = process.env.PORT || 3000;

// Middleware pentru JSON
app.use(express.json());

// Endpoint principal de test
app.get('/', (req, res) => {
  res.send('Backend is live!');
});

// Exemplu endpoint API
app.get('/api/data', (req, res) => {
  res.json({
    message: 'Hello from backend!',
    timestamp: new Date().toISOString()
  });
});

// Pornim serverul
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
