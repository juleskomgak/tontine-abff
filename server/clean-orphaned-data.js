require('dotenv').config();
const mongoose = require('mongoose');

async function cleanOrphanedData() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    console.log('URI:', process.env.MONGODB_URI ? 'Définie' : 'Non définie');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connecté à MongoDB');

    // Obtenir tous les IDs de tontines existantes
    const Tontine = require('./models/Tontine');
    const tontineIds = await Tontine.distinct('_id');
    console.log(`📊 ${tontineIds.length} tontines trouvées`);

    if (tontineIds.length === 0) {
      console.log('\n🎉 Aucune tontine en base, nettoyage automatique réussi!');
      await mongoose.connection.close();
      return;
    }

    // 1. Supprimer les banques orphelines
    console.log('\n🗑️ Suppression des banques orphelines...');
    const BanqueTontine = require('./models/BanqueTontine');
    const banquesDeleted = await BanqueTontine.deleteMany({
      tontine: { $nin: tontineIds }
    });
    console.log(`✅ ${banquesDeleted.deletedCount} banques orphelines supprimées`);

    // 2. Supprimer les tours orphelins
    console.log('\n🗑️ Suppression des tours orphelins...');
    const Tour = require('./models/Tour');
    const toursDeleted = await Tour.deleteMany({
      tontine: { $nin: tontineIds }
    });
    console.log(`✅ ${toursDeleted.deletedCount} tours orphelins supprimés`);

    // 3. Supprimer les cotisations orphelines
    console.log('\n🗑️ Suppression des cotisations orphelines...');
    const Contribution = require('./models/Contribution');
    const contributionsDeleted = await Contribution.deleteMany({
      tontine: { $nin: tontineIds }
    });
    console.log(`✅ ${contributionsDeleted.deletedCount} cotisations orphelines supprimées`);

    // Vérifier le résultat
    const remainingBanques = await BanqueTontine.countDocuments();
    console.log(`\n📊 Banques restantes: ${remainingBanques}`);

    if (remainingBanques === 0) {
      console.log('\n🎉 Toutes les banques orphelines ont été supprimées!');
      console.log('Les soldes devraient maintenant être vides dans l\'application.');
    }

    await mongoose.connection.close();
    console.log('\n✅ Nettoyage terminé');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

cleanOrphanedData();