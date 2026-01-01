require('dotenv').config();
const mongoose = require('mongoose');
const BanqueTontine = require('./models/BanqueTontine');
const Tontine = require('./models/Tontine');
const Tour = require('./models/Tour');
const Contribution = require('./models/Contribution');
const PaiementSolidarite = require('./models/PaiementSolidarite');
const Solidarite = require('./models/Solidarite');
const CarteCodebaf = require('./models/CarteCodebaf');

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const tontines = await Tontine.countDocuments();
    const tours = await Tour.countDocuments();
    const contributions = await Contribution.countDocuments();
    const banques = await BanqueTontine.countDocuments();
    const paiementsSolidarite = await PaiementSolidarite.countDocuments();
    const solidarites = await Solidarite.countDocuments();
    const cartesCodebaf = await CarteCodebaf.countDocuments();

    console.log('\n📊 État de la base de données:');
    console.log('Tontines:', tontines);
    console.log('Tours:', tours);
    console.log('Cotisations:', contributions);
    console.log('Banques:', banques);
    console.log('Paiements Solidarité:', paiementsSolidarite);
    console.log('Configurations Solidarité:', solidarites);
    console.log('Cartes CODEBAF:', cartesCodebaf);

    if (banques > 0) {
      console.log('\n🏦 Détails des banques:');
      const banquesData = await BanqueTontine.find({});
      banquesData.forEach(banque => {
        console.log(`  - ID: ${banque._id}`);
        console.log(`    Tontine liée: ${banque.tontine}`);
        console.log(`    Solde total: ${banque.soldeTotal} FCFA`);
        console.log(`    Total cotisé: ${banque.totalCotise} FCFA`);
        console.log(`    Total distribué: ${banque.totalDistribue} FCFA`);
        console.log(`    Total refus: ${banque.totalRefus} FCFA`);
        console.log(`    Solde cotisations: ${banque.soldeCotisations} FCFA`);
        console.log(`    Solde refus: ${banque.soldeRefus} FCFA`);
        console.log('');
      });
    }

    // Vérifier les données orphelines
    console.log('\n🔍 Recherche de données orphelines:');

    // Tours sans tontine
    const toursOrphelins = await Tour.find({ tontine: { $nin: await Tontine.distinct('_id') } });
    console.log(`Tours orphelins (sans tontine): ${toursOrphelins.length}`);

    // Cotisations sans tontine
    const contributionsOrphelines = await Contribution.find({ tontine: { $nin: await Tontine.distinct('_id') } });
    console.log(`Cotisations orphelines (sans tontine): ${contributionsOrphelines.length}`);

    // Banques sans tontine
    const banquesOrphelines = await BanqueTontine.find({ tontine: { $nin: await Tontine.distinct('_id') } });
    console.log(`Banques orphelines (sans tontine): ${banquesOrphelines.length}`);

    if (banquesOrphelines.length > 0) {
      console.log('\n🚨 BANQUES ORPHELINES DÉTECTÉES!');
      console.log('Ces banques contiennent probablement les soldes résiduels.');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkDatabase();