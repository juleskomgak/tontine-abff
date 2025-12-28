require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Configuration CORS pour la production
// IMPORTANT: Remplacez 'tontine-abff' par le nom de votre projet Firebase
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://tontine-abff.web.app', 
        'https://tontine-abff.firebaseapp.com',
        // Ajoutez d'autres domaines si nécessaire
      ]
    : ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connecté avec succès'))
.catch(err => console.error('❌ Erreur de connexion MongoDB:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/members', require('./routes/members'));
app.use('/api/tontines', require('./routes/tontines'));
app.use('/api/contributions', require('./routes/contributions'));
app.use('/api/tours', require('./routes/tours'));
app.use('/api/banque', require('./routes/banque'));

// Welcome route
app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 Bienvenue sur l\'API de gestion de Tontine ABFF',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      members: '/api/members',
      tontines: '/api/tontines',
      contributions: '/api/contributions',
      tours: '/api/tours',
      banque: '/api/banque'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Une erreur serveur est survenue',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
