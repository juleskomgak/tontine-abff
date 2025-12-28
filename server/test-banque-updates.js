require('dotenv').config();
const mongoose = require('mongoose');
const Tour = require('./models/Tour');
const Contribution = require('./models/Contribution');
const BanqueTontine = require('./models/BanqueTontine');
const Tontine = require('./models/Tontine');
const User = require('./models/User');

async function testBanqueUpdates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connecté à MongoDB\n');

    // Trouver une tontine de test
    const tontine = await Tontine.findOne();
    if (!tontine) {
      console.error('❌ Aucune tontine trouvée');
      process.exit(1);
    }

    console.log(`📋 Tontine de test: ${tontine.nom}\n`);

    // Obtenir la banque
    let banque = await BanqueTontine.findOne({ tontine: tontine._id });
    
    if (!banque) {
      console.log('⚠️  Aucune banque trouvée, création...');
      banque = await BanqueTontine.create({ tontine: tontine._id });
    }

    console.log('--- État INITIAL de la banque ---');
    console.log(`Solde Cotisations: ${banque.soldeCotisations.toLocaleString()} FCFA`);
    console.log(`Total Cotisé: ${banque.totalCotise.toLocaleString()} FCFA`);
    console.log(`Total Distribué: ${banque.totalDistribue.toLocaleString()} FCFA`);
    console.log(`Nombre de transactions: ${banque.transactions.length}\n`);

    // Test 1: Simuler l'ajout d'une cotisation
    console.log('--- TEST 1: Ajout d\'une cotisation ---');
    const cotisations = await Contribution.find({ 
      tontine: tontine._id,
      statut: 'recu'
    }).limit(1);

    if (cotisations.length > 0) {
      const cotisation = cotisations[0];
      console.log(`Cotisation trouvée: ${cotisation.montant} FCFA`);
      
      // Vérifier si elle est déjà dans les transactions
      const exists = banque.transactions.some(
        t => t.type === 'cotisation' && t.contribution?.toString() === cotisation._id.toString()
      );
      
      if (exists) {
        console.log('✅ La cotisation est déjà enregistrée dans la banque');
      } else {
        console.log('⚠️  La cotisation n\'est pas encore dans la banque');
        console.log('💡 Utilisez POST /api/contributions avec les vraies routes pour tester');
      }
    }

    // Test 2: Vérifier les tours payés
    console.log('\n--- TEST 2: Tours payés ---');
    const toursPayes = await Tour.find({ 
      tontine: tontine._id,
      statut: 'paye'
    });

    console.log(`Nombre de tours payés: ${toursPayes.length}`);
    
    for (const tour of toursPayes) {
      const exists = banque.transactions.some(
        t => t.type === 'paiement_tour' && t.tour?.toString() === tour._id.toString()
      );
      
      if (!exists) {
        console.log(`⚠️  Tour ${tour._id} payé mais pas dans la banque`);
      }
    }

    // Recharger la banque
    banque = await BanqueTontine.findOne({ tontine: tontine._id });
    
    console.log('\n--- État FINAL de la banque ---');
    console.log(`Solde Cotisations: ${banque.soldeCotisations.toLocaleString()} FCFA`);
    console.log(`Total Cotisé: ${banque.totalCotise.toLocaleString()} FCFA`);
    console.log(`Total Distribué: ${banque.totalDistribue.toLocaleString()} FCFA`);
    console.log(`Nombre de transactions: ${banque.transactions.length}`);

    // Calculs de vérification
    const totalCotisationsDB = await Contribution.aggregate([
      { $match: { tontine: tontine._id, statut: 'recu' } },
      { $group: { _id: null, total: { $sum: '$montant' } } }
    ]);

    const totalToursPayesDB = toursPayes.reduce((sum, t) => sum + t.montantRecu, 0);

    console.log('\n--- VÉRIFICATION ---');
    console.log(`Total cotisations en BD: ${(totalCotisationsDB[0]?.total || 0).toLocaleString()} FCFA`);
    console.log(`Total cotisé en banque: ${banque.totalCotise.toLocaleString()} FCFA`);
    console.log(`Différence cotisations: ${(totalCotisationsDB[0]?.total || 0) - banque.totalCotise} FCFA`);
    console.log();
    console.log(`Total tours payés en BD: ${totalToursPayesDB.toLocaleString()} FCFA`);
    console.log(`Total distribué en banque: ${banque.totalDistribue.toLocaleString()} FCFA`);
    console.log(`Différence distributions: ${totalToursPayesDB - banque.totalDistribue} FCFA`);
    
    console.log('\n✅ Test terminé');
    console.log('\n💡 Pour tester les mises à jour en temps réel:');
    console.log('   1. Ajoutez une nouvelle cotisation via l\'interface');
    console.log('   2. Marquez un tour comme payé');
    console.log('   3. Vérifiez que la banque se met à jour automatiquement');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testBanqueUpdates();
