const mongoose = require('mongoose');
require('dotenv').config();

const Tour = require('./models/Tour');

async function fixTourIndex() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tontine_abff');
    console.log('✓ Connecté à MongoDB');

    // Supprimer l'ancien index
    try {
      await Tour.collection.dropIndex('tontine_1_beneficiaire_1');
      console.log('✓ Ancien index supprimé');
    } catch (error) {
      console.log('⚠ Ancien index non trouvé (peut-être déjà supprimé)');
    }

    // Recréer les index (le nouveau sera créé automatiquement par Mongoose)
    await Tour.syncIndexes();
    console.log('✓ Nouveaux index créés');

    // Afficher les index actuels
    const indexes = await Tour.collection.getIndexes();
    console.log('\nIndex actuels sur la collection tours:');
    console.log(JSON.stringify(indexes, null, 2));

    console.log('\n✓ Migration terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

fixTourIndex();
