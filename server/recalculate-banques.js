require('dotenv').config();
const mongoose = require('mongoose');
const Tontine = require('./models/Tontine');

// Fonction utilitaire pour recalculer les montants de la banque
async function recalculerMontantsBanque(tontineId) {
  try {
    console.log(`Recalcul des montants pour la tontine ${tontineId} basé uniquement sur les tours`);

    const BanqueTontine = require('./models/BanqueTontine');
    const Tour = require('./models/Tour');

    // Récupérer tous les tours payés ou refusés pour cette tontine
    const toursPayesOuRefuses = await Tour.find({
      tontine: tontineId,
      statut: { $in: ['paye', 'refuse'] }
    });

    // Calculer le total collecté (tours payés = argent collecté et distribué)
    const totalCollecte = toursPayesOuRefuses
      .filter(t => t.statut === 'paye')
      .reduce((sum, t) => sum + (t.montantRecu || 0), 0);

    // Calculer le total distribué (tours payés = argent distribué)
    const totalDistribue = totalCollecte; // Dans ce modèle simplifié, ce qui est collecté est distribué

    // Calculer le total des refus (tours refusés = argent qui reste en banque)
    const totalRefus = toursPayesOuRefuses
      .filter(t => t.statut === 'refuse')
      .reduce((sum, t) => sum + (t.montantRecu || 0), 0);

    // Calculer les soldes
    // Solde disponible = argent des refus (puisque l'argent des tours payés a été distribué)
    const soldeDisponible = totalRefus;
    const soldeTotal = soldeDisponible;

    console.log(`Nouveaux montants calculés (basés uniquement sur les tours):`, {
      totalCollecte,
      totalDistribue,
      totalRefus,
      soldeDisponible,
      soldeTotal
    });

    // Mettre à jour ou créer la banque
    let banque = await BanqueTontine.findOne({ tontine: tontineId });

    if (!banque) {
      banque = new BanqueTontine({ tontine: tontineId });
    }

    // Mettre à jour les montants
    banque.totalCotise = totalCollecte; // Renommé pour cohérence mais représente la collecte totale
    banque.totalDistribue = totalDistribue;
    banque.totalRefus = totalRefus;
    banque.soldeCotisations = 0; // Plus utilisé dans ce modèle
    banque.soldeRefus = soldeDisponible;
    banque.soldeTotal = soldeTotal;

    await banque.save();

    return banque;
  } catch (error) {
    console.error('Erreur lors du recalcul des montants:', error);
    throw error;
  }
}

async function recalculateAllBanques() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connecté à MongoDB');

    // Récupérer toutes les tontines
    const tontines = await Tontine.find();
    console.log(`\n📊 Nombre de tontines à traiter: ${tontines.length}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const tontine of tontines) {
      try {
        console.log(`\n--- Recalcul de la tontine: ${tontine.nom} ---`);

        const banque = await recalculerMontantsBanque(tontine._id);

        console.log(`✅ Recalcul terminé:`);
        console.log(`   - Total collecté: ${banque.totalCotise} FCFA`);
        console.log(`   - Total distribué: ${banque.totalDistribue} FCFA`);
        console.log(`   - Total refus: ${banque.totalRefus} FCFA`);
        console.log(`   - Solde total: ${banque.soldeTotal} FCFA`);

        successCount++;
      } catch (error) {
        console.error(`❌ Erreur pour la tontine ${tontine.nom}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Recalcul terminé!`);
    console.log(`✅ Tontines traitées avec succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur générale:', error);
    process.exit(1);
  }
}

recalculateAllBanques();