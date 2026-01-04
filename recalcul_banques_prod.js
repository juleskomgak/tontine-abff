const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://juleskomgak_db_user:tp4XcOIyRlqyVe7I@tontineabff.wuu13ak.mongodb.net/tontine_db';

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('Connecté à la base de production');
  
  const Tour = require('./server/models/Tour');
  const Tontine = require('./server/models/Tontine');
  const BanqueTontine = require('./server/models/BanqueTontine');
  
  // Recalculer pour toutes les tontines
  const tontines = await Tontine.find({});
  
  for (const tontine of tontines) {
    console.log('\n=== ' + tontine.nom + ' ===');
    
    // Récupérer les tours
    const tours = await Tour.find({ tontine: tontine._id });
    console.log('Tours trouvés:', tours.length);
    
    // Afficher les tours
    tours.forEach(t => {
      console.log('  - Tour ' + t.numeroTour + ' | Statut: ' + t.statut + ' | Montant reçu: ' + (t.montantRecu || 0));
    });
    
    // Calculer les totaux
    const toursPayes = tours.filter(t => t.statut === 'paye');
    const toursRefuses = tours.filter(t => t.statut === 'refuse');
    
    const totalCollecte = toursPayes.reduce((sum, t) => sum + (t.montantRecu || 0), 0);
    const totalRefus = toursRefuses.reduce((sum, t) => sum + (t.montantRecu || 0), 0);
    
    console.log('Calculs:');
    console.log('  Tours payés: ' + toursPayes.length + ' -> Total collecté: ' + totalCollecte);
    console.log('  Tours refusés: ' + toursRefuses.length + ' -> Total refus: ' + totalRefus);
    
    // Mettre à jour la banque
    let banque = await BanqueTontine.findOne({ tontine: tontine._id });
    if (!banque) {
      banque = new BanqueTontine({ tontine: tontine._id });
    }
    
    banque.totalCotise = totalCollecte;
    banque.totalDistribue = totalCollecte;
    banque.totalRefus = totalRefus;
    banque.soldeRefus = totalRefus;
    banque.soldeTotal = totalRefus;
    banque.soldeCotisations = 0;
    await banque.save();
    
    console.log('Banque mise à jour:');
    console.log('  Solde total: ' + banque.soldeTotal);
    console.log('  Total cotisé: ' + banque.totalCotise);
    console.log('  Total distribué: ' + banque.totalDistribue);
  }
  
  console.log('\n=== Terminé ===');
  mongoose.disconnect();
}).catch(err => {
  console.error('Erreur:', err.message);
  mongoose.disconnect();
});
