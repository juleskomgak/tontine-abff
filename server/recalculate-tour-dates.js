require('dotenv').config();
const mongoose = require('mongoose');
const Tour = require('./models/Tour');
const Tontine = require('./models/Tontine');

// Fonction utilitaire pour trouver le premier dimanche du mois
function getPremierDimancheDuMois(date) {
  const d = new Date(date);
  d.setDate(1);
  const jourSemaine = d.getDay();
  if (jourSemaine === 0) return d;
  const joursJusquAuDimanche = 7 - jourSemaine;
  d.setDate(1 + joursJusquAuDimanche);
  return d;
}

async function recalculateTourDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer toutes les tontines
    const tontines = await Tontine.find({});
    console.log(`📋 ${tontines.length} tontine(s) trouvée(s)`);

    for (const tontine of tontines) {
      console.log(`\n🔄 Traitement de la tontine: ${tontine.nom}`);
      console.log(`   Date de début: ${tontine.dateDebut}`);
      console.log(`   Fréquence: ${tontine.frequence}`);

      // Récupérer tous les tours de cette tontine, triés par numéro
      const tours = await Tour.find({ tontine: tontine._id }).sort('cycle numeroTour');
      console.log(`   ${tours.length} tour(s) trouvé(s)`);

      for (const tour of tours) {
        let nouvelleDateReception;
        
        if (tour.numeroTour === 1) {
          // Tour 1 : utiliser la date de début de la tontine
          nouvelleDateReception = new Date(tontine.dateDebut);
        } else {
          // Tours suivants : calculer à partir de la date de début + fréquence, puis premier dimanche du mois
          nouvelleDateReception = new Date(tontine.dateDebut);
          
          switch (tontine.frequence) {
            case 'hebdomadaire':
              nouvelleDateReception.setDate(nouvelleDateReception.getDate() + (tour.numeroTour - 1) * 7);
              break;
            case 'bimensuel':
              nouvelleDateReception.setDate(nouvelleDateReception.getDate() + (tour.numeroTour - 1) * 15);
              break;
            case 'mensuel':
            default:
              nouvelleDateReception.setMonth(nouvelleDateReception.getMonth() + (tour.numeroTour - 1));
              break;
          }
          
          // Trouver le premier dimanche du mois
          nouvelleDateReception = getPremierDimancheDuMois(nouvelleDateReception);
        }

        const ancienneDate = tour.dateReceptionPrevue;
        
        // Mettre à jour le tour
        await Tour.findByIdAndUpdate(tour._id, {
          dateReceptionPrevue: nouvelleDateReception
        });

        console.log(`   Tour ${tour.numeroTour}: ${ancienneDate?.toLocaleDateString('fr-FR')} → ${nouvelleDateReception.toLocaleDateString('fr-FR')}`);
      }
    }

    console.log('\n✅ Recalcul des dates terminé avec succès!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

recalculateTourDates();
