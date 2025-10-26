const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '')));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Open http://localhost:3000 in your browser to see the application.');
});
