const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tontine_abff').then(async () => {
  const User = require('./models/User');
  const Member = require('./models/Member');
  const Tontine = require('./models/Tontine');
  
  // Trouver l'utilisateur membre
  const membreUser = await User.findOne({ email: 'membre@tontine.com' });
  console.log('Utilisateur membre:', membreUser ? membreUser.email + ' (' + membreUser._id + ')' : 'NON TROUVÉ');
  
  if (!membreUser) {
    console.log('Utilisateur membre non trouvé!');
    process.exit(1);
  }
  
  // Trouver le Member associé
  const member = await Member.findOne({ user: membreUser._id });
  console.log('Member associé:', member ? member.nom + ' ' + member.prenom + ' (' + member._id + ')' : 'NON TROUVÉ');
  
  // Trouver les tontines
  const tontines = await Tontine.find().select('nom membres');
  console.log('\nTontines:');
  for (const t of tontines) {
    console.log('  -', t.nom, ':', t.membres.length, 'membres');
    if (member) {
      const isMember = t.membres.some(m => m.membre.toString() === member._id.toString());
      console.log('    Membre test est-il inscrit?', isMember ? 'OUI' : 'NON');
    }
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
