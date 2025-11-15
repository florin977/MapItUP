const { Client } = require('pg');

const client = new Client({
  user: 'alinBRUMARI',   
  host: 'localhost',      
  database: 'mapitup',   
  password: '1234',       
  port: 5432,             
});

client.connect()
  .then(() => console.log("Conectat la PostgreSQL LOCAL"))
  .catch(err => console.error(" Eroare conexiune:", err));

module.exports = client;
