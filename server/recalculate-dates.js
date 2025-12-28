require('dotenv').config();
const mongoose = require('mongoose');
const Tour = require('./models/Tour');
const Tontine = require('./models/Tontine');

async function recalculateDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connecté à MongoDB');
    console.log('🔄 Recalcul des dates de réception basé sur le Tour 1 de chaque cycle\n');

    // Récupérer tous les tours
    const tours = await Tour.find({}).populate('tontine').sort('dateAttribution');

    console.log(`Nombre total de tours: ${tours.length}\n`);

    if (tours.length === 0) {
      console.log('✅ Aucun tour à recalculer!');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Grouper les tours par tontine et cycle
    const toursParTontineEtCycle = {};
    
    for (const tour of tours) {
      if (!tour.tontine) continue;
      
      const key = `${tour.tontine._id}_${tour.cycle}`;
      if (!toursParTontineEtCycle[key]) {
        toursParTontineEtCycle[key] = [];
      }
      toursParTontineEtCycle[key].push(tour);
    }

    // Trier les tours par date d'attribution dans chaque groupe
    Object.keys(toursParTontineEtCycle).forEach(key => {
      toursParTontineEtCycle[key].sort((a, b) => 
        new Date(a.dateAttribution) - new Date(b.dateAttribution)
      );
    });

    console.log('--- Recalcul des dates ---\n');

    let toursModifies = 0;

    for (const [key, toursGroupe] of Object.entries(toursParTontineEtCycle)) {
      const [tontineId, cycle] = key.split('_');
      const tontine = toursGroupe[0].tontine;
      
      console.log(`📦 Tontine: ${tontine.nom}, Cycle: ${cycle}`);
      console.log(`   Fréquence: ${tontine.frequence}, ${toursGroupe.length} tours`);

      for (let i = 0; i < toursGroupe.length; i++) {
        const tour = toursGroupe[i];
        const numeroTour = i + 1;
        const ancienneDatePrevue = new Date(tour.dateReceptionPrevue);
        let dateReceptionPrevue;

        if (numeroTour === 1) {
          // Tour 1 : utiliser la date actuelle ou la date de début (la plus récente)
          const maintenant = new Date();
          const dateDebut = new Date(tontine.dateDebut);
          const dateAttribution = new Date(tour.dateAttribution);
          
          // Utiliser la plus récente entre la date d'attribution et la date actuelle
          dateReceptionPrevue = dateAttribution > maintenant ? dateAttribution : maintenant;
          
          console.log(`   ✨ Tour 1 (référence): ${dateReceptionPrevue.toLocaleDateString('fr-FR')}`);
        } else {
          // Tours suivants : calculer à partir du tour 1
          const tour1 = toursGroupe[0];
          dateReceptionPrevue = new Date(tour1.dateReceptionPrevue);
          let joursAjouter = 0;

          switch (tontine.frequence) {
            case 'hebdomadaire':
              joursAjouter = (numeroTour - 1) * 7;
              break;
            case 'bimensuel':
              joursAjouter = (numeroTour - 1) * 15;
              break;
            case 'mensuel':
            default:
              dateReceptionPrevue.setMonth(dateReceptionPrevue.getMonth() + (numeroTour - 1));
              joursAjouter = 0;
              break;
          }

          if (joursAjouter > 0) {
            dateReceptionPrevue.setDate(dateReceptionPrevue.getDate() + joursAjouter);
          }

          const dateModifiee = ancienneDatePrevue.getTime() !== dateReceptionPrevue.getTime();
          const symbole = dateModifiee ? '🔄' : '✓';
          
          console.log(`   ${symbole} Tour ${numeroTour}: ${ancienneDatePrevue.toLocaleDateString('fr-FR')} → ${dateReceptionPrevue.toLocaleDateString('fr-FR')}`);
          
          if (dateModifiee) {
            toursModifies++;
          }
        }

        // Mettre à jour le tour
        tour.dateReceptionPrevue = dateReceptionPrevue;
        await tour.save();
      }
      
      console.log();
    }

    console.log(`\n✅ Recalcul terminé avec succès!`);
    console.log(`   ${toursModifies} tour(s) modifié(s)`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du recalcul:', error);
    process.exit(1);
  }
}

recalculateDates();
