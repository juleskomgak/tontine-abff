const express = require('express');
const router = express.Router();
const CarteCodebaf = require('../models/CarteCodebaf');
const BanqueCentrale = require('../models/BanqueCentrale');
const Member = require('../models/Member');
const { protect, authorize } = require('../middleware/auth');

// Helper to compute derived fields (montantPaye, montantRestant) from paiements
function computeDerived(carteDoc) {
  // work on a plain object
  const carte = carteDoc.toObject ? carteDoc.toObject() : JSON.parse(JSON.stringify(carteDoc));
  const paiements = carte.paiements || [];
  let montantPaye = paiements.reduce((sum, p) => sum + Number(p.montant || 0), 0);
  // If card is marked complete but has no paiement records, treat it as fully paid
  if ((montantPaye === 0 || montantPaye === null) && carte.statut === 'complete') {
    montantPaye = Number(carte.montantTotal) || 0;
  }
  carte.montantPaye = montantPaye;
  carte.montantRestant = Math.max(0, (Number(carte.montantTotal) || 0) - montantPaye);
  return carte;
}

// Toutes les routes sont protégées
router.use(protect);

// @route   GET /api/cartes-codebaf
// @desc    Obtenir toutes les cartes CODEBAF
// @access  Private (Admin, Trésorier)
router.get('/', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { annee, statut, typeCarte, membre } = req.query;
    
    let filter = {};
    if (annee) filter.annee = parseInt(annee);
    if (statut) filter.statut = statut;
    if (typeCarte) filter.typeCarte = typeCarte;
    if (membre) filter.membre = membre;

    const cartesDocs = await CarteCodebaf.find(filter)
      .populate('membre', 'nom prenom telephone email')
      .populate('createdBy', 'nom prenom')
      .populate('paiements.enregistrePar', 'nom prenom')
      .sort('-createdAt');

    // Compute derived values per carte to ensure consistency (sum of paiements)
    const cartes = cartesDocs.map(computeDerived);

    // Calculer les statistiques from the computed cartes
    const stats = {
      totalCartes: cartes.length,
      totalMontantAttendu: cartes.reduce((sum, c) => sum + (Number(c.montantTotal) || 0), 0),
      totalMontantPaye: cartes.reduce((sum, c) => sum + (Number(c.montantPaye) || 0), 0),
      totalMontantRestant: cartes.reduce((sum, c) => sum + (Number(c.montantRestant) || 0), 0),
      parType: {
        classique: cartes.filter(c => c.typeCarte === 'classique').length,
        bronze: cartes.filter(c => c.typeCarte === 'bronze').length,
        silver: cartes.filter(c => c.typeCarte === 'silver').length,
        gold: cartes.filter(c => c.typeCarte === 'gold').length
      },
      parStatut: {
        en_cours: cartes.filter(c => c.statut === 'en_cours').length,
        complete: cartes.filter(c => c.statut === 'complete').length,
        annule: cartes.filter(c => c.statut === 'annule').length
      }
    };

    res.json({
      success: true,
      count: cartes.length,
      stats,
      data: cartes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des cartes',
      error: error.message
    });
  }
});

// @route   GET /api/cartes-codebaf/statistiques
// @desc    Obtenir les statistiques globales des cartes
// @access  Private (Admin, Trésorier)
router.get('/statistiques', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { annee } = req.query;
    const filter = annee ? { annee: parseInt(annee) } : {};

    const cartesDocs = await CarteCodebaf.find(filter);

    // Statistiques par année
    const anneesStats = await CarteCodebaf.aggregate([
      {
        $group: {
          _id: '$annee',
          totalCartes: { $sum: 1 },
          totalMontantAttendu: { $sum: '$montantTotal' },
          totalMontantPaye: { $sum: '$montantPaye' },
          totalMontantRestant: { $sum: '$montantRestant' }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Statistiques par type de carte
    const typesStats = await CarteCodebaf.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$typeCarte',
          count: { $sum: 1 },
          totalMontant: { $sum: '$montantTotal' },
          totalPaye: { $sum: '$montantPaye' }
        }
      }
    ]);

    // Derniers paiements
    const cartesAvecPaiementsDocs = await CarteCodebaf.find(filter)
      .populate('membre', 'nom prenom')
      .populate('paiements.enregistrePar', 'nom prenom');
    
    const derniersPaiements = [];
    cartesAvecPaiementsDocs.forEach(carte => {
      (carte.paiements || []).forEach(paiement => {
        derniersPaiements.push({
          _id: paiement._id,
          membre: carte.membre,
          typeCarte: carte.typeCarte,
          annee: carte.annee,
          montant: paiement.montant,
          datePaiement: paiement.datePaiement,
          methodePaiement: paiement.methodePaiement,
          enregistrePar: paiement.enregistrePar
        });
      });
    });
    
    // Trier par date décroissante et limiter à 20
    derniersPaiements.sort((a, b) => new Date(b.datePaiement) - new Date(a.datePaiement));
    const top20Paiements = derniersPaiements.slice(0, 20);

    res.json({
      success: true,
      data: {
        global: {
          totalCartes: cartesDocs.length,
          totalMontantAttendu: cartesDocs.reduce((sum, c) => sum + (Number(c.montantTotal) || 0), 0),
          totalMontantPaye: cartesDocs.reduce((sum, c) => sum + ((c.paiements || []).reduce((s, p) => s + Number(p.montant || 0), 0) || 0), 0),
          totalMontantRestant: cartesDocs.reduce((sum, c) => {
            const paid = (c.paiements || []).reduce((s, p) => s + Number(p.montant || 0), 0);
            return sum + Math.max(0, (Number(c.montantTotal) || 0) - paid);
          }, 0),
          tauxRecouvrement: cartesDocs.length > 0 
            ? ((cartesDocs.reduce((sum, c) => sum + ((c.paiements || []).reduce((s, p) => s + Number(p.montant || 0), 0) || 0), 0) / cartesDocs.reduce((sum, c) => sum + (Number(c.montantTotal) || 0), 0)) * 100).toFixed(2)
            : 0
        },
        parAnnee: anneesStats,
        parType: typesStats,
        derniersPaiements: top20Paiements
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// @route   GET /api/cartes-codebaf/membre/:membreId
// @desc    Obtenir les cartes d'un membre
// @access  Private
router.get('/membre/:membreId', async (req, res) => {
  try {
    const cartes = await CarteCodebaf.find({ membre: req.params.membreId })
      .populate('membre', 'nom prenom telephone email')
      .populate('createdBy', 'nom prenom')
      .populate('paiements.enregistrePar', 'nom prenom')
      .sort('-annee');

    res.json({
      success: true,
      count: cartes.length,
      data: cartes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des cartes du membre',
      error: error.message
    });
  }
});

// @route   GET /api/cartes-codebaf/:id
// @desc    Obtenir une carte par ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const carte = await CarteCodebaf.findById(req.params.id)
      .populate('membre', 'nom prenom telephone email adresse profession')
      .populate('createdBy', 'nom prenom')
      .populate('paiements.enregistrePar', 'nom prenom');

    if (!carte) {
      return res.status(404).json({
        success: false,
        message: 'Carte non trouvée'
      });
    }

    res.json({
      success: true,
      data: carte
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la carte',
      error: error.message
    });
  }
});

// @route   POST /api/cartes-codebaf
// @desc    Créer une nouvelle carte CODEBAF
// @access  Private (Admin, Trésorier)
router.post('/', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { membre, annee, montantTotal, frequencePaiement, notes } = req.body;

    // Vérifier si le membre existe
    const memberExists = await Member.findById(membre);
    if (!memberExists) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    // Vérifier si le membre a déjà une carte pour cette année
    const existingCarte = await CarteCodebaf.findOne({ membre, annee });
    if (existingCarte) {
      return res.status(400).json({
        success: false,
        message: `Ce membre a déjà une carte pour l'année ${annee}`
      });
    }

    const initialData = {
      membre,
      annee,
      montantTotal,
      frequencePaiement: frequencePaiement || 'annuel',
      notes,
      createdBy: req.user.id
    };

    // If payment is annual, mark the card as complete but do NOT create a paiement.
    // This keeps no artificial payment records while still allowing the card to
    // be considered fully paid when computing totals (handled in computeDerived).
    if ((frequencePaiement || 'annuel') === 'annuel') {
      initialData.statut = 'complete';
    }

    const carte = await CarteCodebaf.create(initialData);

    await carte.populate([
      { path: 'membre', select: 'nom prenom telephone email' },
      { path: 'createdBy', select: 'nom prenom' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Carte CODEBAF créée avec succès',
      data: carte
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la carte',
      error: error.message
    });
  }
});

// @route   PUT /api/cartes-codebaf/:id
// @desc    Modifier une carte CODEBAF
// @access  Private (Admin, Trésorier)
router.put('/:id', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { montantTotal, frequencePaiement, notes, statut } = req.body;

    const carte = await CarteCodebaf.findById(req.params.id);
    if (!carte) {
      return res.status(404).json({
        success: false,
        message: 'Carte non trouvée'
      });
    }

    // Mettre à jour les champs
    if (montantTotal !== undefined) carte.montantTotal = montantTotal;
    if (frequencePaiement) carte.frequencePaiement = frequencePaiement;
    if (notes !== undefined) carte.notes = notes;
    if (statut) carte.statut = statut;

    await carte.save();
    await carte.populate([
      { path: 'membre', select: 'nom prenom telephone email' },
      { path: 'createdBy', select: 'nom prenom' },
      { path: 'paiements.enregistrePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: 'Carte mise à jour avec succès',
      data: carte
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la carte',
      error: error.message
    });
  }
});

// @route   POST /api/cartes-codebaf/:id/paiement
// @desc    Enregistrer un paiement pour une carte
// @access  Private (Admin, Trésorier)
router.post('/:id/paiement', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { montant, methodePaiement, referenceTransaction, notes } = req.body;

    const carte = await CarteCodebaf.findById(req.params.id);
    if (!carte) {
      return res.status(404).json({
        success: false,
        message: 'Carte non trouvée'
      });
    }

    if (carte.statut === 'complete') {
      return res.status(400).json({
        success: false,
        message: 'Cette carte est déjà complètement payée'
      });
    }

    if (carte.statut === 'annule') {
      return res.status(400).json({
        success: false,
        message: 'Cette carte a été annulée'
      });
    }

    // Vérifier que le montant ne dépasse pas le restant
    if (montant > carte.montantRestant) {
      return res.status(400).json({
        success: false,
        message: `Le montant ne peut pas dépasser ${carte.montantRestant} FCFA (montant restant)`
      });
    }

    // Ajouter le paiement
    carte.paiements.push({
      montant,
      datePaiement: new Date(),
      methodePaiement: methodePaiement || 'especes',
      referenceTransaction,
      notes,
      enregistrePar: req.user.id
    });

    await carte.save();
    // Enregistrer transaction dans la banque centrale
    try {
      let banque = await BanqueCentrale.findOne({});
      if (!banque) banque = await BanqueCentrale.create({ notes: 'Banque centrale initialisée' });
      banque.transactions.push({
        type: 'paiement_carte_codebaf',
        montant: montant,
        paiementCarte: carte.paiements[carte.paiements.length - 1]._id,
        membre: carte.membre,
        effectuePar: req.user._id,
        date: new Date(),
        description: `Paiement carte CODEBAF - ${carte.annee}`
      });
      banque.soldeCotisations = (banque.soldeCotisations || 0) + montant;
      banque.totalCotise = (banque.totalCotise || 0) + montant;
      await banque.save();
    } catch (err) {
      console.error('Erreur en enregistrant la transaction carte dans la banque:', err);
    }
    await carte.populate([
      { path: 'membre', select: 'nom prenom telephone email' },
      { path: 'createdBy', select: 'nom prenom' },
      { path: 'paiements.enregistrePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: 'Paiement enregistré avec succès',
      data: carte
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement du paiement',
      error: error.message
    });
  }
});

// @route   DELETE /api/cartes-codebaf/:id/paiement/:paiementId
// @desc    Supprimer un paiement
// @access  Private (Admin)
router.delete('/:id/paiement/:paiementId', authorize('admin'), async (req, res) => {
  try {
    const carte = await CarteCodebaf.findById(req.params.id);
    if (!carte) {
      return res.status(404).json({
        success: false,
        message: 'Carte non trouvée'
      });
    }

    const paiementIndex = carte.paiements.findIndex(
      p => p._id.toString() === req.params.paiementId
    );

    if (paiementIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    carte.paiements.splice(paiementIndex, 1);
    await carte.save();

    // Mettre à jour la banque centrale pour retirer la transaction liée
    try {
      const banque = await BanqueCentrale.findOne({});
      if (banque) {
        const paiementId = req.params.paiementId;
        const before = banque.transactions.length;
        banque.transactions = banque.transactions.filter(t => !t.paiementCarte || t.paiementCarte.toString() !== paiementId);
        if (banque.transactions.length !== before) {
          banque.soldeCotisations = banque.transactions.reduce((sum, t) => sum + (t.type === 'paiement_carte_codebaf' || t.type === 'cotisation' ? t.montant : 0), 0);
          banque.totalCotise = banque.soldeCotisations;
          await banque.save();
        }
      }
    } catch (err) {
      console.error('Erreur mise à jour banque après suppression paiement carte:', err);
    }

    await carte.populate([
      { path: 'membre', select: 'nom prenom telephone email' },
      { path: 'createdBy', select: 'nom prenom' },
      { path: 'paiements.enregistrePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: 'Paiement supprimé avec succès',
      data: carte
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du paiement',
      error: error.message
    });
  }
});

// @route   DELETE /api/cartes-codebaf/:id
// @desc    Supprimer une carte CODEBAF
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const carte = await CarteCodebaf.findById(req.params.id);
    if (!carte) {
      return res.status(404).json({
        success: false,
        message: 'Carte non trouvée'
      });
    }

    await carte.deleteOne();

    res.json({
      success: true,
      message: 'Carte supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la carte',
      error: error.message
    });
  }
});

// @route   GET /api/cartes-codebaf/annees/liste
// @desc    Obtenir la liste des années disponibles
// @access  Private
router.get('/annees/liste', async (req, res) => {
  try {
    const annees = await CarteCodebaf.distinct('annee');
    annees.sort((a, b) => b - a); // Tri décroissant

    res.json({
      success: true,
      data: annees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des années',
      error: error.message
    });
  }
});

module.exports = router;
