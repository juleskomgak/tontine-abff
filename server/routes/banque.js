const express = require('express');
const router = express.Router();
const BanqueCentrale = require('../models/BanqueCentrale');
// Compatibility model: many routes still reference BanqueTontine
const BanqueTontine = require('../models/BanqueTontine');
const Tontine = require('../models/Tontine');
const Tour = require('../models/Tour');
const Contribution = require('../models/Contribution');
const Member = require('../models/Member');
const { protect, authorize } = require('../middleware/auth');

// Toutes les routes sont protégées
router.use(protect);

// Fonction utilitaire pour vérifier l'accès à une tontine
async function checkTontineAccess(userId, userRole, tontineId) {
  if (userRole === 'admin' || userRole === 'tresorier') {
    return true;
  }
  
  // Pour les membres, vérifier l'appartenance
  const member = await Member.findOne({ user: userId });
  if (!member) return false;
  
  const tontine = await Tontine.findById(tontineId);
  if (!tontine) return false;
  
  return tontine.membres.some(m => m.membre.toString() === member._id.toString());
}

// @route   GET /api/banque/tontine/:tontineId
// @desc    Obtenir la banque d'une tontine
// @access  Private
router.get('/tontine/:tontineId', async (req, res) => {
  try {
    // Vérifier l'accès pour les membres
    const hasAccess = await checkTontineAccess(req.user._id, req.user.role, req.params.tontineId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette banque'
      });
    }

    let banque = await BanqueTontine.findOne({ tontine: req.params.tontineId })
      .populate('tontine', 'nom montantCotisation nombreMembres')
      .populate('toursRefuses.tour')
      .populate('toursRefuses.beneficiaire', 'nom prenom')
      .populate('beneficiairesRedistribution.membre', 'nom prenom')
      .populate('transactions.membre', 'nom prenom')
      .populate('transactions.effectuePar', 'nom prenom')
      .populate({
        path: 'transactions.tour',
        select: 'numeroTour beneficiaire montantRecu dateReceptionPrevue',
        populate: {
          path: 'beneficiaire',
          select: 'nom prenom'
        }
      });

    // Créer la banque si elle n'existe pas
    if (!banque) {
      banque = await BanqueTontine.create({
        tontine: req.params.tontineId
      });
      await banque.populate([
        { path: 'tontine', select: 'nom montantCotisation nombreMembres' }
      ]);
    }

    res.json({
      success: true,
      data: banque
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la banque',
      error: error.message
    });
  }
});

// @route   POST /api/banque/tontine/:tontineId/cotisation
// @desc    Enregistrer une cotisation dans la banque
// @access  Private (Admin, Trésorier)
router.post('/tontine/:tontineId/cotisation', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { contributionId, montant } = req.body;

    let banque = await BanqueTontine.findOne({ tontine: req.params.tontineId });
    
    if (!banque) {
      banque = await BanqueTontine.create({
        tontine: req.params.tontineId
      });
    }

    // Ajouter la transaction
    banque.transactions.push({
      type: 'cotisation',
      montant,
      description: 'Cotisation enregistrée',
      contribution: contributionId,
      date: new Date(),
      effectuePar: req.user.id
    });

    banque.soldeCotisations += montant;
    banque.totalCotise += montant;

    await banque.save();
    await banque.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'transactions.effectuePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: 'Cotisation enregistrée dans la banque',
      data: banque
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement',
      error: error.message
    });
  }
});

// @route   POST /api/banque/tontine/:tontineId/paiement-tour
// @desc    Enregistrer un paiement de tour
// @access  Private (Admin, Trésorier)
router.post('/tontine/:tontineId/paiement-tour', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { tourId, montant } = req.body;

    let banque = await BanqueTontine.findOne({ tontine: req.params.tontineId });
    
    if (!banque) {
      return res.status(404).json({
        success: false,
        message: 'Banque non trouvée'
      });
    }

    const tour = await Tour.findById(tourId).populate('beneficiaire', 'nom prenom');

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    // Vérifier que le solde est suffisant
    if (banque.soldeCotisations < montant) {
      return res.status(400).json({
        success: false,
        message: 'Solde insuffisant pour effectuer le paiement'
      });
    }

    // Ajouter la transaction
    banque.transactions.push({
      type: 'paiement_tour',
      montant: -montant,
      description: `Paiement tour à ${tour.beneficiaire.nom} ${tour.beneficiaire.prenom}`,
      tour: tourId,
      membre: tour.beneficiaire._id,
      date: new Date(),
      effectuePar: req.user.id
    });

    banque.soldeCotisations -= montant;
    banque.totalDistribue += montant;

    await banque.save();
    await banque.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'transactions.effectuePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: 'Paiement enregistré',
      data: banque
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du paiement',
      error: error.message
    });
  }
});

// @route   POST /api/banque/tontine/:tontineId/refus-tour
// @desc    Enregistrer un refus de tour
// @access  Private (Admin, Trésorier)
router.post('/tontine/:tontineId/refus-tour', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { tourId, raison } = req.body;

    let banque = await BanqueTontine.findOne({ tontine: req.params.tontineId });
    
    if (!banque) {
      banque = await BanqueTontine.create({
        tontine: req.params.tontineId
      });
    }

    const tour = await Tour.findById(tourId).populate('beneficiaire', 'nom prenom');

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    // Ajouter le tour refusé
    banque.toursRefuses.push({
      tour: tourId,
      beneficiaire: tour.beneficiaire._id,
      montant: tour.montantRecu,
      dateRefus: new Date(),
      raison,
      cycle: tour.cycle
    });

    // Ajouter la transaction
    banque.transactions.push({
      type: 'refus_tour',
      montant: tour.montantRecu,
      description: `Tour refusé par ${tour.beneficiaire.nom} ${tour.beneficiaire.prenom}`,
      tour: tourId,
      membre: tour.beneficiaire._id,
      date: new Date(),
      effectuePar: req.user.id
    });

    banque.soldeRefus += tour.montantRecu;
    banque.totalRefus += tour.montantRecu;

    // Mettre à jour le statut du tour
    tour.statut = 'refuse';
    tour.notes = raison;
    await tour.save();

    await banque.save();
    await banque.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'toursRefuses.beneficiaire', select: 'nom prenom' },
      { path: 'transactions.effectuePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: 'Refus enregistré',
      data: banque
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement du refus',
      error: error.message
    });
  }
});

// @route   POST /api/banque/tontine/:tontineId/annuler-refus
// @desc    Annuler un refus de tour (changement d'avis du membre)
// @access  Private (Admin, Trésorier)
router.post('/tontine/:tontineId/annuler-refus', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { tourId, nouveauStatut } = req.body;

    console.log('Annuler refus - tourId:', tourId, 'nouveauStatut:', nouveauStatut, 'tontineId:', req.params.tontineId);

    if (!['attribue', 'paye'].includes(nouveauStatut)) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau statut doit être "attribue" ou "paye"'
      });
    }

    const tour = await Tour.findById(tourId).populate('beneficiaire', 'nom prenom');

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    console.log('Tour trouvé - statut actuel:', tour.statut);

    if (tour.statut !== 'refuse') {
      return res.status(400).json({
        success: false,
        message: 'Ce tour n\'est pas dans le statut refusé'
      });
    }

    let banque = await BanqueTontine.findOne({ tontine: req.params.tontineId });
    
    // Si la banque n'existe pas, on peut quand même mettre à jour le tour
    if (!banque) {
      console.log('Banque non trouvée - mise à jour directe du tour uniquement');
      
      // Mettre à jour le statut du tour directement
      tour.statut = nouveauStatut;
      tour.notes = `Changement d'avis - Ancien statut: refusé`;
      if (nouveauStatut === 'paye') {
        tour.datePaiement = new Date();
      }
      await tour.save();

      return res.json({
        success: true,
        message: `Tour ${nouveauStatut === 'paye' ? 'payé' : 'remis en attente'} (banque non trouvée)`,
        data: null
      });
    }

    // Trouver et retirer le tour des tours refusés
    const refusIndex = banque.toursRefuses.findIndex(
      tr => tr.tour && tr.tour.toString() === tourId
    );

    console.log('Index du refus dans la banque:', refusIndex);

    let montantRefuse = tour.montantRecu || 0;
    
    // Si trouvé dans la liste des refusés, le retirer
    if (refusIndex !== -1) {
      const refusInfo = banque.toursRefuses[refusIndex];
      montantRefuse = refusInfo.montant || tour.montantRecu || 0;

      // Retirer des tours refusés
      banque.toursRefuses.splice(refusIndex, 1);

      // Ajuster les soldes
      banque.soldeRefus = Math.max(0, (banque.soldeRefus || 0) - montantRefuse);
      banque.totalRefus = Math.max(0, (banque.totalRefus || 0) - montantRefuse);
    }

    // Ajouter la transaction d'annulation
    banque.transactions.push({
      type: 'ajustement',
      montant: -montantRefuse,
      description: `Annulation du refus - ${tour.beneficiaire.nom} ${tour.beneficiaire.prenom} a changé d'avis`,
      tour: tourId,
      membre: tour.beneficiaire._id,
      date: new Date(),
      effectuePar: req.user.id
    });

    // Si le nouveau statut est "paye", enregistrer le paiement
    if (nouveauStatut === 'paye') {
      banque.transactions.push({
        type: 'paiement_tour',
        montant: -montantRefuse,
        description: `Paiement tour à ${tour.beneficiaire.nom} ${tour.beneficiaire.prenom} (après annulation du refus)`,
        tour: tourId,
        membre: tour.beneficiaire._id,
        date: new Date(),
        effectuePar: req.user.id
      });

      banque.soldeCotisations = Math.max(0, (banque.soldeCotisations || 0) - montantRefuse);
      banque.totalDistribue = (banque.totalDistribue || 0) + montantRefuse;
      
      tour.datePaiement = new Date();
    }

    // Mettre à jour le statut du tour
    tour.statut = nouveauStatut;
    tour.notes = `Changement d'avis - Ancien statut: refusé`;
    await tour.save();

    console.log('Tour mis à jour - nouveau statut:', tour.statut);

    await banque.save();
    await banque.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'toursRefuses.beneficiaire', select: 'nom prenom' },
      { path: 'transactions.effectuePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: `Refus annulé - Tour maintenant ${nouveauStatut === 'paye' ? 'payé' : 'attribué'}`,
      data: banque
    });
  } catch (error) {
    console.error('Erreur annuler-refus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation du refus',
      error: error.message
    });
  }
});

// @route   POST /api/banque/tontine/:tontineId/redistribuer
// @desc    Redistribuer les fonds des tours refusés
// @access  Private (Admin)
router.post('/tontine/:tontineId/redistribuer', authorize('admin'), async (req, res) => {
  try {
    const { beneficiaires } = req.body; // Array of { membreId, montant }

    let banque = await BanqueTontine.findOne({ tontine: req.params.tontineId });
    
    if (!banque) {
      return res.status(404).json({
        success: false,
        message: 'Banque non trouvée'
      });
    }

    if (banque.redistribue) {
      return res.status(400).json({
        success: false,
        message: 'Les fonds ont déjà été redistribués'
      });
    }

    const totalARedistribuer = beneficiaires.reduce((sum, b) => sum + b.montant, 0);

    if (totalARedistribuer > banque.soldeRefus) {
      return res.status(400).json({
        success: false,
        message: 'Montant total supérieur au solde disponible'
      });
    }

    // Enregistrer les redistributions
    const date = new Date();
    for (const beneficiaire of beneficiaires) {
      banque.beneficiairesRedistribution.push({
        membre: beneficiaire.membreId,
        montant: beneficiaire.montant,
        date
      });

      banque.transactions.push({
        type: 'redistribution',
        montant: -beneficiaire.montant,
        description: 'Redistribution des fonds refusés',
        membre: beneficiaire.membreId,
        date,
        effectuePar: req.user.id
      });
    }

    banque.soldeRefus -= totalARedistribuer;
    banque.redistribue = true;
    banque.dateRedistribution = date;

    await banque.save();
    await banque.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'beneficiairesRedistribution.membre', select: 'nom prenom' },
      { path: 'transactions.effectuePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: 'Redistribution effectuée avec succès',
      data: banque
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la redistribution',
      error: error.message
    });
  }
});

// @route   GET /api/banque/tontine/:tontineId/statistiques
// @desc    Obtenir les statistiques de la banque
// @access  Private
router.get('/tontine/:tontineId/statistiques', async (req, res) => {
  try {
    // Vérifier l'accès pour les membres
    const hasAccess = await checkTontineAccess(req.user._id, req.user.role, req.params.tontineId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ces statistiques'
      });
    }

    const banque = await BanqueTontine.findOne({ tontine: req.params.tontineId })
      .populate('tontine', 'nom montantCotisation nombreMembres montantTotal cycleCourant');

    if (!banque) {
      return res.status(404).json({
        success: false,
        message: 'Banque non trouvée'
      });
    }

    const stats = {
      soldeTotal: banque.soldeTotal,
      soldeCotisations: banque.soldeCotisations,
      soldeRefus: banque.soldeRefus,
      totalCotise: banque.totalCotise,
      totalDistribue: banque.totalDistribue,
      totalRefus: banque.totalRefus,
      nombreToursRefuses: banque.toursRefuses.length,
      redistribue: banque.redistribue,
      tauxDistribution: banque.totalCotise > 0 
        ? ((banque.totalDistribue / banque.totalCotise) * 100).toFixed(2)
        : 0,
      montantAttendu: banque.tontine ? banque.tontine.montantTotal * banque.tontine.cycleCourant : 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// @route   GET /api/banque
// @desc    Obtenir toutes les banques
// @access  Private (Admin)
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const banques = await BanqueTontine.find()
      .populate('tontine', 'nom montantCotisation nombreMembres statut')
      .sort('-createdAt');

    res.json({
      success: true,
      count: banques.length,
      data: banques
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des banques',
      error: error.message
    });
  }
});

module.exports = router;

// @route   GET /api/banque/centrale/summary
// @desc    Obtenir un résumé centralisé (tontines, solidarites, cartes)
// @access  Private (Admin, Tresorier)
router.get('/centrale/summary', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    // Agréger les banques de tontine
    const banques = await BanqueCentrale.find({ tontine: { $exists: true, $ne: null } });
    const totalSolde = banques.reduce((sum, b) => sum + (b.soldeTotal || 0), 0);

    // Solidarites stats (réutiliser le modèle PaiementSolidarite et Solidarite)
    const PaiementSolidarite = require('../models/PaiementSolidarite');
    const SolidariteConfig = require('../models/Solidarite');
    const configs = await SolidariteConfig.find({ isActive: true });
    const solidaritesSummary = [];
    for (const config of configs) {
      const paiements = await PaiementSolidarite.find({ typeSolidarite: config.nom, statut: 'paye' });
      const totalCollecte = paiements.reduce((s, p) => s + (p.montant || 0), 0);
      solidaritesSummary.push({ typeSolidarite: config.nom, libelle: config.libelle, totalCollecte, montantAttendu: config.montantAnnuel * (await Member.countDocuments({ isActive: true })) });
    }

    // Cartes CODEBAF summary
    const CarteCodebaf = require('../models/CarteCodebaf');
    const cartes = await CarteCodebaf.find();
    const totalCartes = cartes.length;
    const totalMontantAttendu = cartes.reduce((s, c) => s + (Number(c.montantTotal) || 0), 0);
    const totalMontantPaye = cartes.reduce((s, c) => s + ((c.paiements || []).reduce((ss, p) => ss + Number(p.montant || 0), 0) || 0) + ((c.statut === 'complete' && (c.paiements || []).length === 0) ? Number(c.montantTotal || 0) : 0), 0);

    res.json({
      success: true,
      data: {
        totalSolde,
        banquesCount: banques.length,
        solidarites: solidaritesSummary,
        cartes: {
          totalCartes,
          totalMontantAttendu,
          totalMontantPaye
        }
      }
    });
  } catch (err) {
    console.error('Erreur centrale summary:', err);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération du résumé central' });
  }
});
