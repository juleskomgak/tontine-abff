const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://juleskomgak_db_user:tp4XcOIyRlqyVe7I@tontineabff.wuu13ak.mongodb.net/tontine_db';

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('Connecté à la base de production');
  
  const Tontine = require('./server/models/Tontine');
  const BanqueTontine = require('./server/models/BanqueTontine');
  
  const tontines = await Tontine.find({}).lean();
  console.log('\n=== TONTINES ===');
  
  for (const t of tontines) {
    const banque = await BanqueTontine.findOne({ tontine: t._id });
    console.log('- ' + t.nom + ' (ID: ' + t._id + ')');
    console.log('  Date début: ' + t.dateDebut);
    console.log('  Banque existante: ' + (banque ? 'OUI' : 'NON'));
    
    if (!banque) {
      console.log('  -> Création de la banque...');
      await BanqueTontine.create({
        tontine: t._id,
        soldeTotal: 0,
        soldeCotisations: 0,
        soldeRefus: 0,
        totalCotise: 0,
        totalDistribue: 0,
        totalRefus: 0
      });
      console.log('  -> Banque créée avec succès!');
    }
  }
  
  console.log('\n=== BANQUES FINALES ===');
  const banques = await BanqueTontine.find({}).populate('tontine', 'nom');
  banques.forEach(b => {
    const nom = b.tontine ? b.tontine.nom : 'Orpheline';
    console.log('- Banque pour: ' + nom);
  });
  
  console.log('\nTerminé!');
  mongoose.disconnect();
}).catch(err => {
  console.error('Erreur:', err.message);
  mongoose.disconnect();
});
