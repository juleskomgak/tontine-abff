require('dotenv').config();
const mongoose = require('mongoose');
const Tour = require('./models/Tour');
const Tontine = require('./models/Tontine');

async function fixPastDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connecté à MongoDB');

    const maintenant = new Date();
    console.log(`Date actuelle: ${maintenant.toLocaleDateString('fr-FR')}`);

    // Récupérer tous les tours avec date de réception dans le passé
    const toursWithPastDates = await Tour.find({
      dateReceptionPrevue: { $lt: maintenant },
      statut: { $ne: 'paye' } // Ne pas modifier les tours déjà payés
    }).populate('tontine');

    console.log(`\nNombre de tours avec dates dans le passé: ${toursWithPastDates.length}`);

    if (toursWithPastDates.length === 0) {
      console.log('✅ Aucune correction nécessaire!');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('\n--- Corrections ---\n');

    for (const tour of toursWithPastDates) {
      const ancienneDatePrevue = new Date(tour.dateReceptionPrevue);
      const dateAttribution = new Date(tour.dateAttribution);
      
      // Utiliser la date d'attribution si elle est plus récente, sinon la date actuelle
      let nouvelleDatePrevue;
      if (dateAttribution > maintenant) {
        nouvelleDatePrevue = dateAttribution;
        console.log(`Tour ${tour._id}: Date d'attribution future, utilisation de celle-ci`);
      } else {
        nouvelleDatePrevue = maintenant;
        console.log(`Tour ${tour._id}: Utilisation de la date actuelle`);
      }

      tour.dateReceptionPrevue = nouvelleDatePrevue;
      await tour.save();

      console.log(`  - Ancienne date: ${ancienneDatePrevue.toLocaleDateString('fr-FR')}`);
      console.log(`  - Nouvelle date: ${nouvelleDatePrevue.toLocaleDateString('fr-FR')}`);
      console.log(`  - Tontine: ${tour.tontine?.nom || 'N/A'}`);
      console.log(`  - Cycle: ${tour.cycle}, Statut: ${tour.statut}\n`);
    }

    console.log('✅ Correction terminée avec succès!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    process.exit(1);
  }
}

fixPastDates();
