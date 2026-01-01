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

// Fonction utilitaire pour recalculer les montants de la banque
async function recalculerMontantsBanque(tontineId) {
  try {
    console.log(`Recalcul des montants pour la tontine ${tontineId} basé uniquement sur les tours`);
    
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

// @route   POST /api/banque/tontine/:tontineId/recalculer
// @desc    Recalculer les montants de la banque basés uniquement sur les tours payés/refusés
// @access  Private (Admin, Trésorier)
router.post('/tontine/:tontineId/recalculer', protect, authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const banque = await recalculerMontantsBanque(req.params.tontineId);
    
    await banque.populate([
      { path: 'tontine', select: 'nom montantCotisation nombreMembres' }
    ]);
    
    res.json({
      success: true,
      message: 'Montants de la banque recalculés avec succès',
      data: banque
    });
  } catch (error) {
    console.error('Erreur lors du recalcul:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du recalcul des montants',
      error: error.message
    });
  }
});

// @route   GET /api/banque/tontine/:tontineId
// @desc    Obtenir la banque d'une tontine
// @access  Private
router.get('/tontine/:tontineId', protect, async (req, res) => {
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
// @desc    Enregistrer une cotisation dans la banque (pour historique uniquement - montants calculés depuis les tours)
// @access  Private (Admin, Trésorier)
router.post('/tontine/:tontineId/cotisation', protect, authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { contributionId, montant } = req.body;

    // Vérifier que la contribution existe et a le bon statut
    const contribution = await Contribution.findById(contributionId);
    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Contribution non trouvée'
      });
    }

    if (!['recu', 'refuse'].includes(contribution.statut)) {
      return res.status(400).json({
        success: false,
        message: 'Seules les contributions reçues ou refusées peuvent être enregistrées en banque'
      });
    }

    let banque = await BanqueTontine.findOne({ tontine: req.params.tontineId });
    
    if (!banque) {
      banque = await BanqueTontine.create({
        tontine: req.params.tontineId
      });
    }

    // Ajouter la transaction (pour historique uniquement)
    banque.transactions.push({
      type: 'cotisation',
      montant,
      description: 'Cotisation enregistrée',
      contribution: contributionId,
      date: new Date(),
      effectuePar: req.user.id
    });

    await banque.save();

    // Plus de recalcul automatique - les montants sont maintenant basés uniquement sur les tours
    await banque.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'transactions.effectuePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: 'Cotisation enregistrée dans la banque (historique uniquement)',
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
router.post('/tontine/:tontineId/paiement-tour', protect, authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { tourId, montant } = req.body;

    const tour = await Tour.findById(tourId).populate('beneficiaire', 'nom prenom');

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    if (tour.statut !== 'paye') {
      return res.status(400).json({
        success: false,
        message: 'Le tour doit être marqué comme payé avant l\'enregistrement en banque'
      });
    }

    let banque = await BanqueTontine.findOne({ tontine: req.params.tontineId });
    
    if (!banque) {
      return res.status(404).json({
        success: false,
        message: 'Banque non trouvée'
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

    // Recalculer automatiquement les montants
    const banqueRecalculee = await recalculerMontantsBanque(req.params.tontineId);

    await banqueRecalculee.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'transactions.effectuePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: 'Paiement enregistré',
      data: banqueRecalculee
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
router.post('/tontine/:tontineId/refus-tour', protect, authorize('admin', 'tresorier'), async (req, res) => {
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

    if (tour.statut !== 'refuse') {
      return res.status(400).json({
        success: false,
        message: 'Le tour doit être marqué comme refusé avant l\'enregistrement en banque'
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

    // Mettre à jour le statut du tour
    tour.statut = 'refuse';
    tour.notes = raison;
    await tour.save();

    // Recalculer automatiquement les montants
    const banqueRecalculee = await recalculerMontantsBanque(req.params.tontineId);

    await banqueRecalculee.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'toursRefuses.beneficiaire', select: 'nom prenom' },
      { path: 'transactions.effectuePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: 'Refus enregistré',
      data: banqueRecalculee
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
router.post('/tontine/:tontineId/annuler-refus', protect, authorize('admin', 'tresorier'), async (req, res) => {
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
    if (nouveauStatut === 'paye') {
      tour.datePaiement = new Date();
    }
    await tour.save();

    // Recalculer automatiquement les montants
    const banqueRecalculee = await recalculerMontantsBanque(req.params.tontineId);
    
    await banqueRecalculee.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'toursRefuses.beneficiaire', select: 'nom prenom' },
      { path: 'transactions.effectuePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: `Refus annulé - Tour maintenant ${nouveauStatut === 'paye' ? 'payé' : 'attribué'}`,
      data: banqueRecalculee
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

// @route   POST /api/banque/tontine/:tontineId/annuler-paiement
// @desc    Annuler (rollback) un paiement de tour — inverse la transaction et met le tour à "attribue"
// @access  Private (Admin, Trésorier)
router.post('/tontine/:tontineId/annuler-paiement', protect, authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { tourId } = req.body;

    if (!tourId) {
      return res.status(400).json({ success: false, message: 'Paramètre tourId requis' });
    }

    const tour = await Tour.findById(tourId).populate('beneficiaire', 'nom prenom');
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour non trouvé' });
    }

    if (tour.statut !== 'paye') {
      return res.status(400).json({ success: false, message: 'Ce tour n\'est pas marqué comme payé' });
    }

    let banque = await BanqueTontine.findOne({ tontine: req.params.tontineId });
    if (!banque) {
      return res.status(404).json({ success: false, message: 'Banque non trouvée' });
    }

    // Chercher la transaction de paiement liée à ce tour
    const txIndex = banque.transactions.findIndex(
      t => t.type === 'paiement_tour' && t.tour && t.tour.toString() === tourId.toString()
    );

    if (txIndex === -1) {
      return res.status(404).json({ success: false, message: 'Transaction de paiement introuvable pour ce tour' });
    }

    const paiementTx = banque.transactions[txIndex];
    const montant = Math.abs(paiementTx.montant || tour.montantRecu || 0);

    // Retirer la transaction de paiement
    banque.transactions.splice(txIndex, 1);

    // Ajouter une transaction d'ajustement pour garder la trace de l'annulation
    banque.transactions.push({
      type: 'ajustement',
      montant: montant,
      description: `Annulation du paiement du tour à ${tour.beneficiaire.nom} ${tour.beneficiaire.prenom}`,
      tour: tourId,
      membre: tour.beneficiaire._id,
      date: new Date(),
      effectuePar: req.user.id
    });

    // Ajuster les soldes
    banque.soldeCotisations = (banque.soldeCotisations || 0) + montant;
    banque.totalDistribue = Math.max(0, (banque.totalDistribue || 0) - montant);

    // Mettre le statut du tour en 'attribue' et enlever la date de paiement
    tour.statut = 'attribue';
    if (tour.datePaiement) tour.datePaiement = undefined;
    tour.notes = `Paiement annulé par ${req.user.nom || req.user.id}`;

    await tour.save();

    // Recalculer automatiquement les montants
    const banqueRecalculee = await recalculerMontantsBanque(req.params.tontineId);
    
    await banqueRecalculee.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'transactions.effectuePar', select: 'nom prenom' }
    ]);

    res.json({ success: true, message: 'Paiement du tour annulé avec succès', data: banqueRecalculee });
  } catch (error) {
    console.error('Erreur annuler-paiement:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'annulation du paiement', error: error.message });
  }
});

// @route   POST /api/banque/tontine/:tontineId/redistribuer
// @desc    Redistribuer les fonds des tours refusés
// @access  Private (Admin)
router.post('/tontine/:tontineId/redistribuer', protect, authorize('admin'), async (req, res) => {
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
router.get('/tontine/:tontineId/statistiques', protect, async (req, res) => {
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
// @desc    Obtenir toutes les banques (filtre les banques orphelines)
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    // Récupérer les IDs des tontines existantes
    const tontines = await Tontine.find({}).select('_id');
    const tontineIds = tontines.map(t => t._id);
    
    // Ne récupérer que les banques liées à des tontines existantes
    const banques = await BanqueTontine.find({ tontine: { $in: tontineIds } })
      .populate('tontine', 'nom montantCotisation nombreMembres statut')
      .sort('-createdAt');

    // Filtrer les banques dont la tontine n'a pas été populée (cas rare)
    const banquesValides = banques.filter(b => b.tontine !== null);

    res.json({
      success: true,
      count: banquesValides.length,
      data: banquesValides
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des banques',
      error: error.message
    });
  }
});

// @route   POST /api/banque/nettoyer-orphelines
// @desc    Supprimer les banques orphelines et recalculer les soldes
// @access  Private (Admin)
router.post('/nettoyer-orphelines', protect, authorize('admin'), async (req, res) => {
  try {
    // Récupérer les IDs des tontines existantes
    const tontines = await Tontine.find({}).select('_id');
    const tontineIds = tontines.map(t => t._id.toString());
    
    // Récupérer toutes les banques
    const banquesTontine = await BanqueTontine.find({});
    
    let orphelinesSuprimees = 0;
    let banquesRecalculees = 0;
    
    for (const banque of banquesTontine) {
      const tontineIdStr = banque.tontine ? banque.tontine.toString() : null;
      
      if (!tontineIdStr || !tontineIds.includes(tontineIdStr)) {
        // Banque orpheline - supprimer
        await BanqueTontine.findByIdAndDelete(banque._id);
        orphelinesSuprimees++;
      } else {
        // Recalculer les montants basés sur les tours
        await recalculerMontantsBanque(banque.tontine);
        banquesRecalculees++;
      }
    }
    
    // Nettoyer aussi les banques centrales orphelines
    const banquesCentrale = await BanqueCentrale.find({ tontine: { $exists: true, $ne: null } });
    let centralesOrphelinesSuprimees = 0;
    
    for (const banque of banquesCentrale) {
      const tontineIdStr = banque.tontine.toString();
      if (!tontineIds.includes(tontineIdStr)) {
        await BanqueCentrale.findByIdAndDelete(banque._id);
        centralesOrphelinesSuprimees++;
      }
    }
    
    res.json({
      success: true,
      message: 'Nettoyage effectué avec succès',
      data: {
        orphelinesSuprimees,
        centralesOrphelinesSuprimees,
        banquesRecalculees
      }
    });
  } catch (error) {
    console.error('Erreur nettoyage orphelines:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du nettoyage',
      error: error.message
    });
  }
});

// @route   POST /api/banque/recalculer-toutes
// @desc    Recalculer toutes les banques basées sur les tours
// @access  Private (Admin)
router.post('/recalculer-toutes', protect, authorize('admin'), async (req, res) => {
  try {
    const tontines = await Tontine.find({}).select('_id nom');
    const resultats = [];
    
    for (const tontine of tontines) {
      try {
        const banque = await recalculerMontantsBanque(tontine._id);
        resultats.push({
          tontine: tontine.nom,
          success: true,
          soldeTotal: banque.soldeTotal,
          totalCotise: banque.totalCotise
        });
      } catch (err) {
        resultats.push({
          tontine: tontine.nom,
          success: false,
          error: err.message
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Recalcul effectué',
      data: resultats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du recalcul',
      error: error.message
    });
  }
});

// @route   GET /api/banque/centrale/summary
// @desc    Obtenir un résumé centralisé (tontines, solidarites, cartes)
// @access  Private (Admin, Tresorier)
router.get('/centrale/summary', protect, authorize('admin', 'tresorier'), async (req, res) => {
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

module.exports = router;
