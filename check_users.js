const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tontine');
    const User = require('./server/models/User');

    const users = await User.find({}).select('nom prenom email role isValidated isActive createdAt');
    console.log('Utilisateurs dans la base de données:');
    users.forEach(user => {
      console.log(`- ${user.nom} ${user.prenom} (${user.email}) - Rôle: ${user.role} - Validé: ${user.isValidated} - Actif: ${user.isActive} - Créé: ${user.createdAt}`);
    });

    const adminUsers = await User.find({ role: 'admin' });
    console.log(`\nUtilisateurs admin:`);
    adminUsers.forEach(user => {
      console.log(`- ${user.nom} ${user.prenom} (${user.email}) - Validé: ${user.isValidated} - Actif: ${user.isActive}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Erreur:', error);
  }
}

checkUsers();