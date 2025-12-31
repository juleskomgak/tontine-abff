require('dotenv').config();
const mongoose = require('mongoose');
const Tontine = require('./models/Tontine');
const Tour = require('./models/Tour');
const Contribution = require('./models/Contribution');
const BanqueTontine = require('./models/BanqueTontine');
const PaiementSolidarite = require('./models/PaiementSolidarite');
const Solidarite = require('./models/Solidarite');
const CarteCodebaf = require('./models/CarteCodebaf');
const Member = require('./models/Member');

async function testDeleteTontine() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connecté à MongoDB');

    // Trouver une tontine à supprimer (pas active de préférence)
    const tontineToDelete = await Tontine.findOne({ statut: { $ne: 'actif' } });

    if (!tontineToDelete) {
      console.log('❌ Aucune tontine non-active trouvée pour le test');
      process.exit(1);
    }

    console.log(`\n🧪 Test de suppression de la tontine: ${tontineToDelete.nom}`);
    console.log(`📊 ID: ${tontineToDelete._id}`);

    // Compter les données avant suppression
    const toursCount = await Tour.countDocuments({ tontine: tontineToDelete._id });
    const contributionsCount = await Contribution.countDocuments({ tontine: tontineToDelete._id });
    const banquesCount = await BanqueTontine.countDocuments({ tontine: tontineToDelete._id });

    const membreIds = tontineToDelete.membres.map(m => m.membre);
    const solidaritePaiementsCount = await PaiementSolidarite.countDocuments({
      membre: { $in: membreIds }
    });
    const solidariteCount = await Solidarite.countDocuments({
      membre: { $in: membreIds }
    });
    const cartesCount = await CarteCodebaf.countDocuments({
      membre: { $in: membreIds },
      annee: tontineToDelete.annee || new Date().getFullYear()
    });

    console.log('\n📊 Données avant suppression:');
    console.log(`   • Tours: ${toursCount}`);
    console.log(`   • Cotisations: ${contributionsCount}`);
    console.log(`   • Banques: ${banquesCount}`);
    console.log(`   • Paiements solidarité: ${solidaritePaiementsCount}`);
    console.log(`   • Configurations solidarité: ${solidariteCount}`);
    console.log(`   • Cartes CODEBAF: ${cartesCount}`);

    // Démarrer une transaction pour simuler la suppression
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log('\n🗑️ Simulation de la suppression...');

      // 1. Supprimer tous les tours
      const toursDeleted = await Tour.deleteMany({ tontine: tontineToDelete._id }).session(session);
      console.log(`✅ ${toursDeleted.deletedCount} tours supprimés`);

      // 2. Supprimer toutes les cotisations
      const contributionsDeleted = await Contribution.deleteMany({ tontine: tontineToDelete._id }).session(session);
      console.log(`✅ ${contributionsDeleted.deletedCount} cotisations supprimées`);

      // 3. Supprimer la banque
      const banquesDeleted = await BanqueTontine.deleteMany({ tontine: tontineToDelete._id }).session(session);
      console.log(`✅ ${banquesDeleted.deletedCount} banques supprimées`);

      // 4. Supprimer les paiements de solidarité
      const solidaritePaiementsDeleted = await PaiementSolidarite.deleteMany({
        membre: { $in: membreIds }
      }).session(session);
      console.log(`✅ ${solidaritePaiementsDeleted.deletedCount} paiements de solidarité supprimés`);

      // 5. Supprimer les configurations de solidarité
      const solidariteDeleted = await Solidarite.deleteMany({
        membre: { $in: membreIds }
      }).session(session);
      console.log(`✅ ${solidariteDeleted.deletedCount} configurations de solidarité supprimées`);

      // 6. Supprimer les cartes CODEBAF
      const cartesDeleted = await CarteCodebaf.deleteMany({
        membre: { $in: membreIds },
        annee: tontineToDelete.annee || new Date().getFullYear()
      }).session(session);
      console.log(`✅ ${cartesDeleted.deletedCount} cartes CODEBAF supprimées`);

      // 7. Supprimer la tontine
      await Tontine.findByIdAndDelete(tontineToDelete._id).session(session);
      console.log(`✅ Tontine supprimée: ${tontineToDelete.nom}`);

      // Valider la transaction
      await session.commitTransaction();
      console.log('\n🎉 Suppression complète simulée avec succès!');

      // Vérifier que tout a été supprimé
      const toursAfter = await Tour.countDocuments({ tontine: tontineToDelete._id });
      const contributionsAfter = await Contribution.countDocuments({ tontine: tontineToDelete._id });
      const banquesAfter = await BanqueTontine.countDocuments({ tontine: tontineToDelete._id });
      const tontineAfter = await Tontine.findById(tontineToDelete._id);

      console.log('\n🔍 Vérification après suppression:');
      console.log(`   • Tours restants: ${toursAfter}`);
      console.log(`   • Cotisations restantes: ${contributionsAfter}`);
      console.log(`   • Banques restantes: ${banquesAfter}`);
      console.log(`   • Tontine existe encore: ${tontineAfter ? 'OUI' : 'NON'}`);

      if (toursAfter === 0 && contributionsAfter === 0 && banquesAfter === 0 && !tontineAfter) {
        console.log('\n✅ TEST RÉUSSI: Toutes les données ont été supprimées correctement!');
      } else {
        console.log('\n❌ TEST ÉCHEC: Certaines données n\'ont pas été supprimées!');
      }

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ Erreur lors de la suppression:', error);
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testDeleteTontine();