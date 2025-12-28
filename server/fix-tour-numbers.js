require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('✅ Connecté à MongoDB');
  
  const Tour = require('./models/Tour');
  
  // Récupérer tous les tours groupés par tontine et cycle
  const tours = await Tour.find().sort('tontine cycle dateAttribution');
  
  // Grouper par tontine et cycle
  const grouped = {};
  
  for (const tour of tours) {
    const key = `${tour.tontine}-${tour.cycle}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tour);
  }
  
  let updated = 0;
  
  // Pour chaque groupe, attribuer les numéros
  for (const key of Object.keys(grouped)) {
    const groupTours = grouped[key];
    // Trier par date d'attribution
    groupTours.sort((a, b) => new Date(a.dateAttribution) - new Date(b.dateAttribution));
    
    for (let i = 0; i < groupTours.length; i++) {
      const tour = groupTours[i];
      const numeroTour = i + 1;
      
      if (tour.numeroTour !== numeroTour) {
        await Tour.findByIdAndUpdate(tour._id, { numeroTour });
        console.log(`Tour ${tour._id}: numeroTour mis à jour à ${numeroTour}`);
        updated++;
      }
    }
  }
  
  console.log(`\n✅ ${updated} tours mis à jour`);
  process.exit(0);
}).catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
