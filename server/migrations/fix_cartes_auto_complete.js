const mongoose = require('mongoose');
require('dotenv').config();

const CarteCodebaf = require('../models/CarteCodebaf');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Find cartes marked complete but with no paiements
  const cartes = await CarteCodebaf.find({ statut: 'complete', paiements: { $size: 0 } });
  console.log(`Found ${cartes.length} cartes to fix`);

  for (const carte of cartes) {
    carte.statut = 'en_cours';
    carte.montantPaye = 0;
    carte.montantRestant = carte.montantTotal || 0;
    await carte.save();
    console.log(`Fixed carte ${carte._id} (membre: ${carte.membre}, annee: ${carte.annee})`);
  }

  console.log('Migration complete');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed', err);
  process.exit(1);
});
