require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('✅ Connecté à MongoDB');
  
  // Charger tous les modèles dans le bon ordre
  require('./models/User');
  require('./models/Member');
  require('./models/Tontine');
  const Tour = require('./models/Tour');
  const Contribution = require('./models/Contribution');
  
  // Récupérer tous les tours
  const tours = await Tour.find().populate('tontine', 'nom montantCotisation');
  
  console.log(`\nTraitement de ${tours.length} tours...\n`);
  
  let updated = 0;
  
  for (const tour of tours) {
    // Calculer le montant réel des cotisations pour ce cycle
    const contributions = await Contribution.find({
      tontine: tour.tontine._id,
      cycle: tour.cycle,
      statut: 'recu'
    });
    
    const montantReel = contributions.reduce((sum, c) => sum + c.montant, 0);
    
    console.log(`Tour ${tour.numeroTour} (Cycle ${tour.cycle}) - ${tour.tontine.nom}:`);
    console.log(`  Montant actuel: ${tour.montantRecu} FCFA`);
    console.log(`  Cotisations reçues: ${contributions.length}`);
    console.log(`  Montant réel: ${montantReel} FCFA`);
    
    if (montantReel > 0 && tour.montantRecu !== montantReel) {
      await Tour.findByIdAndUpdate(tour._id, { montantRecu: montantReel });
      console.log(`  ✅ Mis à jour à ${montantReel} FCFA`);
      updated++;
    } else if (montantReel === 0) {
      console.log(`  ⚠️ Aucune cotisation reçue pour ce cycle`);
    } else {
      console.log(`  ✓ Montant déjà correct`);
    }
    console.log('');
  }
  
  console.log(`\n✅ ${updated} tours mis à jour`);
  process.exit(0);
}).catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
