const express = require('express');
const cors = require('cors');
let fetch;

(async () => {
  fetch = (await import('node-fetch')).default;
})();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve i file statici (index.html, style.css, ecc.)
app.use(express.static(path.join(__dirname, '/')));

// Quando l’utente visita la home page, mostra il file HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rotta per gestire la richiesta all’API di OpenAI
app.post('/api/collegamenti', async (req, res) => {
  const { tema } = req.body;

  if (!tema) {
    return res.status(400).json({ errore: 'Tema non fornito' });
  }

  try {
    const selectedSubjects = req.body.subjects || [];

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Sei un assistente esperto nella preparazione dell’esame orale di maturità. Riceverai un tema centrale scelto da uno studente e dovrai suggerire collegamenti interdisciplinari coerenti con i programmi di quarta e quinta superiore.

Per ogni materia, proponi **un solo collegamento rilevante**, spiegandolo in **2-3 frasi al massimo** in modo chiaro, concreto e utile per un’esposizione orale. Evita collegamenti forzati o troppo generici.

Le materie sono: ${selectedSubjects.join(', ')}. Ogni collegamento deve essere chiaro e coerente con il tema.`
          },
          {
            role: 'user',
            content: `Il tema è: ${tema}`
          }
        ]
      })
    });

    const data = await openaiResponse.json();

    if (data.error) {
      console.error('Errore OpenAI:', data.error);
      throw new Error(data.error.message || 'Errore API OpenAI');
    }

    if (!data.choices || !data.choices[0]) {
      throw new Error('Risposta non valida da OpenAI');
    }

    let testoGenerato = data.choices[0].message.content;

    // FORMATTAZIONE TITOLI MATERIA
    const materie = [
      'Italiano', 'Storia', 'Filosofia', 'Scienze', 'Inglese', 'Arte', 
      'Educazione Civica', 'Latino', 'Geografia', 'Greco', 'Diritto', 
      'Fisica', 'Francese', 'Matematica', 'Economia Aziendale'
    ];

    materie.forEach(materia => {
      const pattern = new RegExp(`\\*{2}${materia}\\*{2}:?`, 'gi');
      const replacement = `<h3 class="subject-title">${materia}</h3>`;
      testoGenerato = testoGenerato.replace(pattern, replacement);
    });

    testoGenerato = testoGenerato.trim();

    res.json({ risposta: testoGenerato });

  } catch (error) {
    console.error('Errore API:', error);
    res.status(500).json({ errore: 'Errore durante la generazione dei collegamenti' });
  }
});

// Avvio del server
app.listen(PORT, () => {
  console.log(`✅ Server attivo su http://localhost:${PORT}`);
});
