require('dotenv').config();
const mongoose = require('mongoose');
const Tour = require('./models/Tour');
const Tontine = require('./models/Tontine');
const Member = require('./models/Member');

async function check() {
  await mongoose.connect('mongodb+srv://juleskomgak_db_user:tp4XcOIyRlqyVe7I@tontineabff.wuu13ak.mongodb.net/tontine_db?retryWrites=true&w=majority');
  
  const tontines = await Tontine.find({});
  console.log('Tontines:', tontines.length);
  
  for (const t of tontines) {
    console.log('\n--- ' + t.nom + ' ---');
    console.log('Date début:', t.dateDebut);
    console.log('Fréquence:', t.frequence);
    
    const tours = await Tour.find({ tontine: t._id }).populate('beneficiaire', 'nom prenom').sort('numeroTour');
    console.log('Tours:', tours.length);
    
    tours.forEach(tour => {
      console.log('  Tour ' + tour.numeroTour + ': ' + tour.dateReceptionPrevue?.toLocaleDateString('fr-FR') + ' - ' + (tour.beneficiaire?.nom || 'N/A'));
    });
  }
  
  await mongoose.disconnect();
  process.exit(0);
}
check();
