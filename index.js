

const express = require('express');
const app = express();
const port = 5000; 


app.get('/', (req, res) => {
  res.send('Salut de pe serverul MapItUP!');
});

app.listen(port, () => {
  console.log(`Serverul rulează pe http://localhost:${port}`);
});