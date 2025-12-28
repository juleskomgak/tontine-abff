require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('✅ Connecté à MongoDB');
  
  const Tontine = require('./models/Tontine');
  
  const tontines = await Tontine.find();
  
  console.log('\n📊 Vérification des tontines:\n');
  
  for (const tontine of tontines) {
    const membresActifs = tontine.membres.filter(m => m.isActive !== false).length;
    const totalMembres = tontine.membres.length;
    
    console.log(`📌 ${tontine.nom}:`);
    console.log(`   - nombreMembres stocké: ${tontine.nombreMembres}`);
    console.log(`   - Membres dans le tableau: ${totalMembres}`);
    console.log(`   - Membres actifs: ${membresActifs}`);
    
    if (tontine.nombreMembres !== membresActifs) {
      console.log(`   ⚠️  INCOHÉRENCE DÉTECTÉE - Correction...`);
      
      // Mettre à jour
      tontine.nombreMembres = membresActifs;
      tontine.montantTotal = membresActifs * tontine.montantCotisation;
      await tontine.save();
      
      console.log(`   ✅ Corrigé: nombreMembres = ${membresActifs}, montantTotal = ${tontine.montantTotal}`);
    } else {
      console.log(`   ✅ OK`);
    }
    console.log('');
  }
  
  console.log('✅ Vérification terminée');
  process.exit(0);
}).catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
