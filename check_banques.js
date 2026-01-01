const mongoose = require('mongoose');
require('dotenv').config();

async function checkBanques() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tontine_abff');
    console.log('Connected to MongoDB');
    
    const BanqueTontine = require('./server/models/BanqueTontine');
    const BanqueCentrale = require('./server/models/BanqueCentrale');
    const Tontine = require('./server/models/Tontine');
    
    // Vérifier les tontines existantes
    const tontines = await Tontine.find({});
    console.log('\nNombre de tontines:', tontines.length);
    tontines.forEach(t => {
      console.log('- Tontine:', t.nom, '| ID:', t._id);
    });
    
    // Vérifier les banques tontine
    const banquesTontine = await BanqueTontine.find({});
    console.log('\nNombre de banques tontine:', banquesTontine.length);
    banquesTontine.forEach(b => {
      console.log('- Banque ID:', b._id);
      console.log('  Tontine:', b.tontine);
      console.log('  Solde total:', b.soldeTotal);
      console.log('  Total cotise:', b.totalCotise);
      console.log('  Total distribue:', b.totalDistribue);
      console.log('  Total refus:', b.totalRefus);
    });
    
    // Vérifier les banques centrales
    const banquesCentrale = await BanqueCentrale.find({});
    console.log('\nNombre de banques centrales:', banquesCentrale.length);
    banquesCentrale.forEach(b => {
      console.log('- Banque Centrale ID:', b._id);
      console.log('  Tontine:', b.tontine);
      console.log('  Solde total:', b.soldeTotal);
      console.log('  Total cotise:', b.totalCotise);
    });
    
    // Vérifier les banques orphelines (liées à des tontines qui n'existent plus)
    const tontineIds = tontines.map(t => t._id.toString());
    const banquesOrphelines = banquesTontine.filter(b => b.tontine && !tontineIds.includes(b.tontine.toString()));
    console.log('\nBanques orphelines (tontine supprimée):', banquesOrphelines.length);
    banquesOrphelines.forEach(b => {
      console.log('- Banque orpheline ID:', b._id, '| Tontine:', b.tontine, '| Solde:', b.soldeTotal);
    });
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBanques();
