const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Tontine = require('../models/Tontine');
const Tour = require('../models/Tour');
const Contribution = require('../models/Contribution');
const BanqueTontine = require('../models/BanqueTontine');
const PaiementSolidarite = require('../models/PaiementSolidarite');
const Solidarite = require('../models/Solidarite');
const CarteCodebaf = require('../models/CarteCodebaf');

// Toutes les routes sont protégées et réservées aux admins
router.use(protect);
router.use(authorize('admin'));

// @route   POST /api/admin/clean-orphaned-data
// @desc    Nettoyer toutes les données orphelines (banques, tours, cotisations sans tontine)
// @access  Private (Admin seulement)
router.post('/clean-orphaned-data', async (req, res) => {
  const session = await Tontine.startSession();
  session.startTransaction();

  try {
    console.log('🧹 Début du nettoyage des données orphelines...');

    // Obtenir tous les IDs de tontines existantes
    const tontineIds = await Tontine.distinct('_id').session(session);
    console.log(`📊 ${tontineIds.length} tontines actives trouvées`);

    let totalDeleted = 0;

    // 1. Supprimer les banques orphelines
    console.log('🗑️ Suppression des banques orphelines...');
    const banquesDeleted = await BanqueTontine.deleteMany({
      tontine: { $nin: tontineIds }
    }).session(session);
    console.log(`✅ ${banquesDeleted.deletedCount} banques orphelines supprimées`);
    totalDeleted += banquesDeleted.deletedCount;

    // 2. Supprimer les tours orphelins
    console.log('🗑️ Suppression des tours orphelins...');
    const toursDeleted = await Tour.deleteMany({
      tontine: { $nin: tontineIds }
    }).session(session);
    console.log(`✅ ${toursDeleted.deletedCount} tours orphelins supprimés`);
    totalDeleted += toursDeleted.deletedCount;

    // 3. Supprimer les cotisations orphelines
    console.log('🗑️ Suppression des cotisations orphelines...');
    const contributionsDeleted = await Contribution.deleteMany({
      tontine: { $nin: tontineIds }
    }).session(session);
    console.log(`✅ ${contributionsDeleted.deletedCount} cotisations orphelines supprimées`);
    totalDeleted += contributionsDeleted.deletedCount;

    // 4. Supprimer les paiements de solidarité orphelins (optionnel)
    console.log('🗑️ Suppression des paiements de solidarité orphelins...');
    const membreIds = [];
    for (const tontineId of tontineIds) {
      const tontine = await Tontine.findById(tontineId).session(session);
      if (tontine) {
        membreIds.push(...tontine.membres.map(m => m.membre));
      }
    }

    if (membreIds.length > 0) {
      const solidariteDeleted = await PaiementSolidarite.deleteMany({
        membre: { $nin: membreIds }
      }).session(session);
      console.log(`✅ ${solidariteDeleted.deletedCount} paiements de solidarité orphelins supprimés`);
      totalDeleted += solidariteDeleted.deletedCount;
    }

    // Valider la transaction
    await session.commitTransaction();

    console.log(`\n🎉 Nettoyage terminé! ${totalDeleted} éléments supprimés.`);

    res.json({
      success: true,
      message: `Nettoyage des données orphelines terminé avec succès`,
      details: {
        banquesSupprimees: banquesDeleted.deletedCount,
        toursSupprimes: toursDeleted.deletedCount,
        cotisationsSupprimees: contributionsDeleted.deletedCount,
        totalElementsSupprimes: totalDeleted
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Erreur lors du nettoyage:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du nettoyage des données orphelines',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});

// @route   GET /api/admin/database-status
// @desc    Obtenir l'état actuel de la base de données
// @access  Private (Admin seulement)
router.get('/database-status', async (req, res) => {
  try {
    const tontines = await Tontine.countDocuments();
    const tours = await Tour.countDocuments();
    const contributions = await Contribution.countDocuments();
    const banques = await BanqueTontine.countDocuments();
    const paiementsSolidarite = await PaiementSolidarite.countDocuments();
    const solidarites = await Solidarite.countDocuments();
    const cartesCodebaf = await CarteCodebaf.countDocuments();

    // Vérifier les données orphelines
    const tontineIds = await Tontine.distinct('_id');
    const banquesOrphelines = await BanqueTontine.countDocuments({
      tontine: { $nin: tontineIds }
    });
    const toursOrphelins = await Tour.countDocuments({
      tontine: { $nin: tontineIds }
    });
    const contributionsOrphelines = await Contribution.countDocuments({
      tontine: { $nin: tontineIds }
    });

    res.json({
      success: true,
      data: {
        tontines,
        tours,
        contributions,
        banques,
        paiementsSolidarite,
        solidarites,
        cartesCodebaf,
        donneesOrphelines: {
          banquesOrphelines,
          toursOrphelins,
          contributionsOrphelines,
          totalOrphelines: banquesOrphelines + toursOrphelins + contributionsOrphelines
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut de la base de données',
      error: error.message
    });
  }
});

module.exports = router;