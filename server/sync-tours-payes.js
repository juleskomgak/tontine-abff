require('dotenv').config();
const mongoose = require('mongoose');
const BanqueTontine = require('./models/BanqueTontine');
const Tontine = require('./models/Tontine');
const Tour = require('./models/Tour');
const Member = require('./models/Member');
const User = require('./models/User');

async function syncToursPayes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connecté à MongoDB\n');

    // Trouver un utilisateur admin pour les transactions
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ Aucun utilisateur admin trouvé');
      process.exit(1);
    }

    // Récupérer tous les tours payés
    const toursPayes = await Tour.find({ statut: 'paye' })
      .populate('tontine', 'nom _id')
      .populate('beneficiaire', 'nom prenom');

    console.log(`📊 Nombre de tours payés trouvés: ${toursPayes.length}\n`);

    let toursAjoutes = 0;
    let toursDejaPresents = 0;

    for (const tour of toursPayes) {
      if (!tour.tontine) {
        console.log(`⚠️  Tour ${tour._id} sans tontine, ignoré`);
        continue;
      }

      console.log(`\nTraitement: ${tour.tontine.nom} - ${tour.beneficiaire?.nom || 'Inconnu'}`);
      
      // Trouver ou créer la banque
      let banque = await BanqueTontine.findOne({ tontine: tour.tontine._id });
      
      if (!banque) {
        banque = await BanqueTontine.create({
          tontine: tour.tontine._id
        });
        console.log('  ✅ Banque créée');
      }

      // Vérifier si la transaction existe déjà
      const transactionExists = banque.transactions.some(
        t => t.type === 'paiement_tour' && t.tour?.toString() === tour._id.toString()
      );

      if (transactionExists) {
        console.log('  ℹ️  Transaction déjà présente');
        toursDejaPresents++;
      } else {
        // Ajouter la transaction
        banque.transactions.push({
          type: 'paiement_tour',
          montant: -tour.montantRecu,
          description: `Paiement tour à ${tour.beneficiaire?.nom || 'Inconnu'} ${tour.beneficiaire?.prenom || ''}`,
          tour: tour._id,
          membre: tour.beneficiaire?._id,
          date: tour.datePaiement || tour.dateAttribution,
          effectuePar: adminUser._id
        });

        // Mettre à jour les soldes
        banque.soldeCotisations -= tour.montantRecu;
        banque.totalDistribue += tour.montantRecu;

        await banque.save();
        
        console.log(`  ✅ Transaction ajoutée: ${tour.montantRecu.toLocaleString()} FCFA`);
        toursAjoutes++;
      }
    }

    console.log('\n--- RÉSUMÉ ---');
    console.log(`Tours déjà présents: ${toursDejaPresents}`);
    console.log(`Tours ajoutés: ${toursAjoutes}`);
    console.log('\n✅ Synchronisation terminée avec succès!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

syncToursPayes();
