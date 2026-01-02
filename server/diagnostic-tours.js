require('dotenv').config();
const mongoose = require('mongoose');
const Tour = require('./models/Tour');
const Tontine = require('./models/Tontine');

async function diagnosticTours() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juleskomgak_db_user:tp4XcOIyRlqyVe7I@tontineabff.wuu13ak.mongodb.net/tontine_db?retryWrites=true&w=majority';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer la tontine
    const tontine = await Tontine.findOne({});
    console.log('\n📋 Tontine:', tontine.nom);
    console.log('   Date de début:', tontine.dateDebut);
    console.log('   Fréquence:', tontine.frequence);
    console.log('   Cycle courant:', tontine.cycleCourant);

    // Récupérer tous les tours
    const tours = await Tour.find({ tontine: tontine._id })
      .populate('beneficiaire', 'nom prenom')
      .sort('numeroTour');

    console.log('\n📊 Tours existants:');
    tours.forEach(tour => {
      console.log(`   Tour ${tour.numeroTour}: ${tour.beneficiaire?.nom} ${tour.beneficiaire?.prenom}`);
      console.log(`      - dateReceptionPrevue: ${tour.dateReceptionPrevue}`);
      console.log(`      - cycle: ${tour.cycle}`);
      console.log(`      - modeAttribution: ${tour.modeAttribution}`);
    });

    // Simuler le calcul pour vérifier
    console.log('\n🔍 Simulation du calcul des dates:');
    
    function getPremierDimancheDuMois(date) {
      const d = new Date(date);
      d.setDate(1);
      const jourSemaine = d.getDay();
      if (jourSemaine === 0) return d;
      const joursJusquAuDimanche = 7 - jourSemaine;
      d.setDate(1 + joursJusquAuDimanche);
      return d;
    }

    for (let i = 1; i <= 5; i++) {
      let dateReceptionPrevue;
      
      if (i === 1) {
        dateReceptionPrevue = new Date(tontine.dateDebut);
      } else {
        dateReceptionPrevue = new Date(tontine.dateDebut);
        dateReceptionPrevue.setMonth(dateReceptionPrevue.getMonth() + (i - 1));
        dateReceptionPrevue = getPremierDimancheDuMois(dateReceptionPrevue);
      }
      
      console.log(`   Tour ${i} calculé: ${dateReceptionPrevue.toLocaleDateString('fr-FR')} (${dateReceptionPrevue.toDateString()})`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

diagnosticTours();
