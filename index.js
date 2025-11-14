// server/index.js

// 1. Importă pachetele necesare
const express = require('express');
const { Pool } = require('pg'); // Pentru conexiunea la PostgreSQL
const bcrypt = require('bcrypt'); // Pentru hash-ul parolei

// 2. Inițializează aplicația Express
const app = express();
const port = 5000; // Sau orice port dorești

// 3. Middleware
// Acest rând este ESENȚIAL. Permite serverului să citească JSON-ul trimis de client.
app.use(express.json());

// 4. Configurează conexiunea la PostgreSQL
// Pool-ul gestionează conexiunile pentru noi
const pool = new Pool({
    user: 'mapitup_user',       // Utilizatorul tău de pe PostgreSQL
    host: 'localhost',
    database: 'mapitup_db',     // Baza ta de date
    password: 'parola_ta_aici', // ! SCHIMBĂ CU PAROLA TA
    port: 5432,
});

// 5. Rutele API

// O rută de test simplă
app.get('/', (req, res) => {
    res.send('Serverul MapItUP rulează!');
});

/**
 * Endpoint pentru ÎNREGISTRARE (Registration)
 * Metoda: POST
 * Ruta: /register
 * Body (JSON): { "mail": "user@email.com", "parola": "123456" }
 */
app.post('/register', async (req, res) => {
    try {
        // 1. Extrage email-ul și parola din body-ul cererii
        const { mail, parola } = req.body;

        // 2. Verifică dacă utilizatorul există deja (opțional, dar recomandat)
        const userExists = await pool.query('SELECT * FROM usersAdmin WHERE mail = $1', [mail]);
        if (userExists.rows.length > 0) {
            // "Conflict" - utilizatorul există deja
            return res.status(409).send('Utilizatorul cu acest email există deja.');
        }

        // 3. Hash-uiește (criptează) parola
        const saltRounds = 10; // Număr de runde de "sărare"
        const hashedParola = await bcrypt.hash(parola, saltRounds);

        // 4. Inserează noul utilizator în baza de date
        // Folosim $1, $2 pentru a preveni atacurile de tip SQL Injection
        const newUser = await pool.query(
            'INSERT INTO usersAdmin (mail, parola) VALUES ($1, $2) RETURNING *',
            [mail, hashedParola]
        );

        // 5. Trimite un răspuns de succes
        res.status(201).json({
            message: 'Utilizator creat cu succes!',
            user: {
                id: newUser.rows[0].id,
                mail: newUser.rows[0].mail
            }
        });

    } catch (err) {
        console.error('Eroare la înregistrare:', err.message);
        res.status(500).send('Eroare server');
    }
});


// 6. Pornește serverul
app.listen(port, () => {
    console.log(`Serverul ascultă pe http://localhost:${port}`);
});