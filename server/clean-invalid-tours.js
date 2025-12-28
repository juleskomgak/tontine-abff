const mongoose = require('mongoose');
require('dotenv').config();

const Tour = require('./models/Tour');
const Member = require('./models/Member');
const Tontine = require('./models/Tontine');

async function cleanInvalidTours() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tontine_abff');
    console.log('✓ Connecté à MongoDB');

    // Récupérer tous les tours
    const allTours = await Tour.find({});
    console.log(`\nTotal des tours: ${allTours.length}`);

    let deletedCount = 0;
    let validCount = 0;

    for (const tour of allTours) {
      // Vérifier si le bénéficiaire existe
      if (!tour.beneficiaire) {
        console.log(`✗ Tour ${tour._id} sans bénéficiaire - SUPPRESSION`);
        await Tour.findByIdAndDelete(tour._id);
        deletedCount++;
        continue;
      }

      const member = await Member.findById(tour.beneficiaire);
      if (!member) {
        console.log(`✗ Tour ${tour._id} avec bénéficiaire inexistant (${tour.beneficiaire}) - SUPPRESSION`);
        await Tour.findByIdAndDelete(tour._id);
        deletedCount++;
        continue;
      }

      // Vérifier si la tontine existe
      if (!tour.tontine) {
        console.log(`✗ Tour ${tour._id} sans tontine - SUPPRESSION`);
        await Tour.findByIdAndDelete(tour._id);
        deletedCount++;
        continue;
      }

      const tontine = await Tontine.findById(tour.tontine);
      if (!tontine) {
        console.log(`✗ Tour ${tour._id} avec tontine inexistante (${tour.tontine}) - SUPPRESSION`);
        await Tour.findByIdAndDelete(tour._id);
        deletedCount++;
        continue;
      }

      validCount++;
    }

    console.log(`\n✓ Nettoyage terminé:`);
    console.log(`  - Tours valides: ${validCount}`);
    console.log(`  - Tours supprimés: ${deletedCount}`);

    // Afficher les tours restants avec leurs bénéficiaires
    const remainingTours = await Tour.find({})
      .populate('beneficiaire', 'nom prenom')
      .populate('tontine', 'nom');
    
    console.log('\nTours restants:');
    for (const tour of remainingTours) {
      const benefName = tour.beneficiaire 
        ? `${tour.beneficiaire.nom} ${tour.beneficiaire.prenom}` 
        : 'INCONNU';
      const tontName = tour.tontine ? tour.tontine.nom : 'INCONNUE';
      console.log(`  - ${tontName} - Cycle ${tour.cycle} - Bénéficiaire: ${benefName}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Erreur lors du nettoyage:', error);
    process.exit(1);
  }
}

cleanInvalidTours();
