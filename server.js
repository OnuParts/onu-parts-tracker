const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static('public'));

// API placeholder
app.get('/api/*', (req, res) => {
  res.json({ message: 'API not implemented in simple deployment' });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});