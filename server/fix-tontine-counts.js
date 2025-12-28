const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tontine_abff').then(async () => {
  const Tontine = require('./models/Tontine');
  
  const tontines = await Tontine.find({});
  console.log('Correction des tontines...');
  
  for (const t of tontines) {
    const activeMembers = t.membres.filter(m => m.isActive).length;
    const shouldUpdate = t.nombreMembres !== activeMembers || 
                         t.montantTotal !== activeMembers * t.montantCotisation ||
                         t.totalCycles !== activeMembers;
    
    if (shouldUpdate) {
      console.log('Correction de:', t.nom);
      console.log('  Avant: nombreMembres=' + t.nombreMembres + ', montantTotal=' + t.montantTotal + ', totalCycles=' + t.totalCycles);
      
      t.nombreMembres = activeMembers;
      t.montantTotal = activeMembers * t.montantCotisation;
      t.totalCycles = activeMembers;
      await t.save();
      
      console.log('  Après: nombreMembres=' + t.nombreMembres + ', montantTotal=' + t.montantTotal + ', totalCycles=' + t.totalCycles);
    } else {
      console.log('OK:', t.nom, '- nombreMembres=' + t.nombreMembres);
    }
  }
  
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
