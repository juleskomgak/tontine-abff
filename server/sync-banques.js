require('dotenv').config();
const mongoose = require('mongoose');
const BanqueTontine = require('./models/BanqueTontine');
const Tontine = require('./models/Tontine');
const Contribution = require('./models/Contribution');
const Tour = require('./models/Tour');
const User = require('./models/User');

async function syncBanques() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connecté à MongoDB');

    // Récupérer toutes les tontines
    const tontines = await Tontine.find();
    console.log(`\nNombre de tontines: ${tontines.length}\n`);

    // Trouver un utilisateur admin pour les transactions
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ Aucun utilisateur admin trouvé');
      process.exit(1);
    }

    for (const tontine of tontines) {
      console.log(`\n--- Traitement de la tontine: ${tontine.nom} ---`);

      // Vérifier si la banque existe
      let banque = await BanqueTontine.findOne({ tontine: tontine._id });
      
      if (!banque) {
        banque = await BanqueTontine.create({
          tontine: tontine._id,
          soldeCotisations: 0,
          soldeRefus: 0,
          totalCotise: 0,
          totalDistribue: 0,
          totalRefus: 0,
          toursRefuses: [],
          transactions: []
        });
        console.log('✅ Banque créée');
      } else {
        console.log('ℹ️  Banque existante trouvée');
      }

      // Récupérer toutes les cotisations de cette tontine
      const contributions = await Contribution.find({ 
        tontine: tontine._id,
        statut: 'recu'
      });

      let totalCotise = 0;
      for (const contribution of contributions) {
        totalCotise += contribution.montant;

        // Vérifier si la transaction existe déjà
        const transactionExists = banque.transactions.some(
          t => t.type === 'cotisation' && t.contribution?.toString() === contribution._id.toString()
        );

        if (!transactionExists) {
          banque.transactions.push({
            type: 'cotisation',
            montant: contribution.montant,
            description: 'Cotisation enregistrée',
            contribution: contribution._id,
            membre: contribution.membre,
            date: contribution.datePaiement,
            effectuePar: adminUser._id
          });
        }
      }

      console.log(`  Cotisations: ${contributions.length} - Total: ${totalCotise} FCFA`);

      // Récupérer tous les tours payés de cette tontine
      const toursPayes = await Tour.find({ 
        tontine: tontine._id,
        statut: 'paye'
      });

      let totalDistribue = 0;
      for (const tour of toursPayes) {
        totalDistribue += tour.montantRecu;

        // Vérifier si la transaction existe déjà
        const transactionExists = banque.transactions.some(
          t => t.type === 'paiement_tour' && t.tour?.toString() === tour._id.toString()
        );

        if (!transactionExists) {
          banque.transactions.push({
            type: 'paiement_tour',
            montant: -tour.montantRecu,
            description: `Paiement tour`,
            tour: tour._id,
            membre: tour.beneficiaire,
            date: tour.datePaiement || tour.dateAttribution,
            effectuePar: adminUser._id
          });
        }
      }

      console.log(`  Tours payés: ${toursPayes.length} - Total: ${totalDistribue} FCFA`);

      // Mettre à jour les totaux
      banque.totalCotise = totalCotise;
      banque.totalDistribue = totalDistribue;
      banque.soldeCotisations = totalCotise - totalDistribue;

      await banque.save();

      console.log(`  ✅ Solde final: ${banque.soldeTotal} FCFA`);
      console.log(`     - Cotisations: ${banque.soldeCotisations} FCFA`);
      console.log(`     - Refus: ${banque.soldeRefus} FCFA`);
    }

    console.log('\n✅ Synchronisation terminée avec succès!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    process.exit(1);
  }
}

syncBanques();
