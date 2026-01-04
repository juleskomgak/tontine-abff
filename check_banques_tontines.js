const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juleskomgak_db_user:tp4XcOIyRlqyVe7I@tontineabff.wuu13ak.mongodb.net/tontine_db';

mongoose.connect(MONGODB_URI).then(async () => {
  const Tontine = require('./server/models/Tontine');
  const BanqueTontine = require('./server/models/BanqueTontine');
  
  // Récupérer toutes les tontines
  const tontines = await Tontine.find({}).select('nom dateDebut statut');
  console.log('=== TONTINES ===');
  tontines.forEach(t => {
    console.log(`- ${t.nom} (ID: ${t._id}, Date: ${t.dateDebut}, Statut: ${t.statut})`);
  });
  
  // Récupérer toutes les banques
  const banques = await BanqueTontine.find({}).populate('tontine', 'nom');
  console.log('\n=== BANQUES ===');
  banques.forEach(b => {
    const nom = b.tontine ? b.tontine.nom : 'ORPHELINE';
    console.log(`- Banque pour: ${nom} (Tontine ID: ${b.tontine?._id})`);
  });
  
  // Vérifier s'il y a des tontines sans banque
  console.log('\n=== TONTINES SANS BANQUE ===');
  for (const t of tontines) {
    const banqueExiste = await BanqueTontine.findOne({ tontine: t._id });
    if (!banqueExiste) {
      console.log(`- ${t.nom} n'a PAS de banque! Création en cours...`);
      // Créer la banque
      await BanqueTontine.create({
        tontine: t._id,
        soldeTotal: 0,
        soldeCotisations: 0,
        soldeRefus: 0,
        totalCotise: 0,
        totalDistribue: 0,
        totalRefus: 0
      });
      console.log(`  -> Banque créée pour ${t.nom}`);
    }
  }
  
  console.log('\n=== Terminé ===');
  mongoose.disconnect();
}).catch(err => console.error(err));
