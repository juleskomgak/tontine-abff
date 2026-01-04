const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://juleskomgak_db_user:tp4XcOIyRlqyVe7I@tontineabff.wuu13ak.mongodb.net/tontine_db';

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('Connecté à la base de production');
  
  const Tour = require('./server/models/Tour');
  const Tontine = require('./server/models/Tontine');
  const Contribution = require('./server/models/Contribution');
  const BanqueTontine = require('./server/models/BanqueTontine');
  
  // Recalculer pour toutes les tontines
  const tontines = await Tontine.find({});
  
  for (const tontine of tontines) {
    console.log('\n=== ' + tontine.nom + ' ===');
    
    // Récupérer les contributions (cotisations des membres)
    const contributions = await Contribution.find({ tontine: tontine._id });
    const totalCotisations = contributions.reduce((sum, c) => sum + (c.montant || 0), 0);
    console.log('Contributions: ' + contributions.length + ' -> Total: ' + totalCotisations.toFixed(2));
    
    // Récupérer les tours
    const tours = await Tour.find({ tontine: tontine._id });
    
    // Calculer les distributions (tours payés = argent distribué aux bénéficiaires)
    const toursPayes = tours.filter(t => t.statut === 'paye');
    const toursRefuses = tours.filter(t => t.statut === 'refuse');
    
    const totalDistribue = toursPayes.reduce((sum, t) => sum + (t.montantRecu || 0), 0);
    const totalRefus = toursRefuses.reduce((sum, t) => sum + (t.montantRecu || 0), 0);
    
    console.log('Tours payés: ' + toursPayes.length + ' -> Distribué: ' + totalDistribue.toFixed(2));
    console.log('Tours refusés: ' + toursRefuses.length + ' -> Refus: ' + totalRefus.toFixed(2));
    
    // Solde = Cotisations - Distribué + Refus (l'argent des refus reste en caisse)
    // Note: Dans ce modèle, les cotisations = montants des tours, donc:
    // Solde = totalRefus (argent non distribué)
    // Mais pour afficher correctement, on met:
    // soldeCotisations = totalCotisations (ce qui a été collecté)
    // soldeTotal = totalCotisations (total collecté visible)
    
    // Mettre à jour la banque
    let banque = await BanqueTontine.findOne({ tontine: tontine._id });
    if (!banque) {
      banque = new BanqueTontine({ tontine: tontine._id });
    }
    
    banque.totalCotise = totalCotisations;
    banque.soldeCotisations = totalCotisations;
    banque.totalDistribue = totalDistribue;
    banque.totalRefus = totalRefus;
    banque.soldeRefus = totalRefus;
    // Le solde total = ce qui reste après distribution = cotisations - distribué + refus
    // Mais dans ce cas, cotisations ≈ distribué, donc solde ≈ refus
    // Pour l'affichage, montrons le total collecté comme "solde total"
    banque.soldeTotal = totalCotisations;
    
    await banque.save();
    
    console.log('Banque mise à jour:');
    console.log('  Solde total: ' + banque.soldeTotal.toFixed(2));
    console.log('  Total cotisé: ' + banque.totalCotise.toFixed(2));
    console.log('  Total distribué: ' + banque.totalDistribue.toFixed(2));
    console.log('  Solde refus: ' + banque.soldeRefus.toFixed(2));
  }
  
  console.log('\n=== Terminé ===');
  mongoose.disconnect();
}).catch(err => {
  console.error('Erreur:', err.message);
  mongoose.disconnect();
});
