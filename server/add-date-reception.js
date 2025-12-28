require('dotenv').config();
const mongoose = require('mongoose');
const Tour = require('./models/Tour');
const Tontine = require('./models/Tontine');

async function addDateReception() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connecté à MongoDB');

    // Récupérer tous les tours qui n'ont pas de dateReceptionPrevue
    const tours = await Tour.find({ dateReceptionPrevue: { $exists: false } })
      .populate('tontine');

    console.log(`Nombre de tours à mettre à jour: ${tours.length}`);

    // Traiter les tours par tontine et par cycle
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

    console.log('\n--- Calcul des dates ---\n');

    for (const tour of tours) {
      if (!tour.tontine) {
        console.log(`Tour ${tour._id} n'a pas de tontine, ignoré`);
        continue;
      }

      const key = `${tour.tontine._id}_${tour.cycle}`;
      const toursGroupe = toursParTontineEtCycle[key];
      const numeroTour = toursGroupe.findIndex(t => t._id.toString() === tour._id.toString()) + 1;
      const tour1 = toursGroupe[0];

      let dateReceptionPrevue;

      if (numeroTour === 1) {
        // Tour 1 : utiliser la date actuelle ou la date de début (la plus récente)
        const maintenant = new Date();
        const dateDebut = new Date(tour.tontine.dateDebut);
        dateReceptionPrevue = dateDebut > maintenant ? dateDebut : maintenant;
      } else {
        // Tours suivants : calculer à partir de la date de réception du tour 1
        dateReceptionPrevue = new Date(tour1.dateReceptionPrevue || tour1.dateAttribution);
        let joursAjouter = 0;

        switch (tour.tontine.frequence) {
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
      }

      // S'assurer que la date n'est pas dans le passé
      const maintenant = new Date();
      const dateAttribution = new Date(tour.dateAttribution);
      
      // Utiliser la date d'attribution si elle est plus récente que la date calculée
      if (dateReceptionPrevue < dateAttribution) {
        dateReceptionPrevue.setTime(dateAttribution.getTime());
      }
      
      // Si même la date d'attribution est dans le passé, utiliser la date actuelle
      if (dateReceptionPrevue < maintenant) {
        dateReceptionPrevue.setTime(maintenant.getTime());
      }

      // Mettre à jour le tour
      tour.dateReceptionPrevue = dateReceptionPrevue;
      await tour.save();

      console.log(`Tour ${tour._id} mis à jour - Numéro: ${numeroTour}, Date: ${dateReceptionPrevue.toLocaleDateString('fr-FR')}`);
    }

    console.log('\n✅ Migration terminée avec succès!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

addDateReception();
