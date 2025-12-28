const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Contribution = require('../models/Contribution');
const Tontine = require('../models/Tontine');
const Member = require('../models/Member');
const Tour = require('../models/Tour');
const BanqueTontine = require('../models/BanqueTontine');
const { protect, authorize } = require('../middleware/auth');

// Toutes les routes sont protégées
router.use(protect);

// Fonction utilitaire pour obtenir les tontines accessibles par un membre
async function getTontinesForMember(userId) {
  const member = await Member.findOne({ user: userId });
  if (!member) return [];
  
  const tontines = await Tontine.find({
    'membres.membre': member._id
  });
  
  return tontines.map(t => t._id);
}

// @route   GET /api/contributions/tour/:tourId
// @desc    Obtenir les cotisations d'un tour spécifique
// @access  Private
router.get('/tour/:tourId', async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.tourId)
      .populate('beneficiaire', 'nom prenom');
    
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    const contributions = await Contribution.find({ 
      tour: req.params.tourId,
      statut: 'recu'
    })
      .populate('membre', 'nom prenom telephone')
      .populate('enregistrePar', 'nom prenom')
      .sort('-datePaiement');

    const totalCotise = contributions.reduce((sum, c) => sum + c.montant, 0);
    const nombreCotisants = contributions.length;

    // Obtenir la tontine pour savoir le montant attendu
    const tontine = await Tontine.findById(tour.tontine);
    const montantAttendu = tontine ? tontine.montantCotisation * tontine.membres.filter(m => m.isActive).length : 0;
    const tauxCollecte = montantAttendu > 0 ? Math.round((totalCotise / montantAttendu) * 100) : 0;

    res.json({
      success: true,
      data: {
        tour: {
          _id: tour._id,
          numeroTour: tour.numeroTour,
          cycle: tour.cycle,
          beneficiaire: tour.beneficiaire,
          statut: tour.statut,
          dateReceptionPrevue: tour.dateReceptionPrevue
        },
        contributions,
        stats: {
          totalCotise,
          nombreCotisants,
          montantAttendu,
          tauxCollecte,
          resteACollecter: montantAttendu - totalCotise
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des cotisations du tour',
      error: error.message
    });
  }
});

// @route   GET /api/contributions/stats/monthly
// @desc    Obtenir les statistiques mensuelles de toutes les contributions
// @access  Private
router.get('/stats/monthly', async (req, res) => {
  try {
    const { year, tontineId } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Construction de la requête de base
    const matchQuery = {
      statut: 'recu',
      datePaiement: {
        $gte: new Date(`${targetYear}-01-01`),
        $lte: new Date(`${targetYear}-12-31`)
      }
    };
    
    if (tontineId) {
      const mongoose = require('mongoose');
      matchQuery.tontine = mongoose.Types.ObjectId(tontineId);
    }

    // Agrégation par mois et par méthode de paiement
    const monthlyStats = await Contribution.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            month: { $month: '$datePaiement' },
            methodePaiement: '$methodePaiement',
            tontine: '$tontine'
          },
          montantTotal: { $sum: '$montant' },
          nombrePaiements: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    // Agrégation par tontine
    const tontineStats = await Contribution.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            tontine: '$tontine',
            methodePaiement: '$methodePaiement'
          },
          montantTotal: { $sum: '$montant' },
          nombrePaiements: { $sum: 1 }
        }
      }
    ]);

    // Populer les informations de tontine
    await Tontine.populate(tontineStats, { path: '_id.tontine', select: 'nom' });

    res.json({
      success: true,
      data: {
        year: targetYear,
        monthlyStats,
        tontineStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques mensuelles',
      error: error.message
    });
  }
});

// @route   GET /api/contributions/tontine/:tontineId/stats
// @desc    Obtenir les statistiques de contributions d'une tontine
// @access  Private
router.get('/tontine/:tontineId/stats', async (req, res) => {
  try {
    const { cycle } = req.query;
    const tontineId = req.params.tontineId;

    const tontine = await Tontine.findById(tontineId);
    if (!tontine) {
      return res.status(404).json({
        success: false,
        message: 'Tontine non trouvée'
      });
    }

    const query = { tontine: tontineId, statut: 'recu' };
    if (cycle) query.cycle = cycle;

    const contributions = await Contribution.find(query);
    
    const totalContributions = contributions.reduce((sum, c) => sum + c.montant, 0);
    const nombrePaiements = contributions.length;
    const cycleCourant = cycle || tontine.cycleCourant;
    const nombreMembresAttendus = tontine.nombreMembres;
    const montantAttendu = nombreMembresAttendus * tontine.montantCotisation;
    const tauxCollecte = (totalContributions / montantAttendu) * 100;

    res.json({
      success: true,
      data: {
        totalContributions,
        nombrePaiements,
        nombreMembresAttendus,
        montantAttendu,
        tauxCollecte: tauxCollecte.toFixed(2),
        cycleCourant
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques',
      error: error.message
    });
  }
});

// @route   GET /api/contributions
// @desc    Obtenir toutes les contributions
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { tontineId, membreId, cycle, statut } = req.query;
    let query = {};

    if (tontineId) query.tontine = tontineId;
    if (membreId) query.membre = membreId;
    if (cycle) query.cycle = cycle;
    if (statut) query.statut = statut;

    // Si l'utilisateur est un simple membre, filtrer les contributions par ses tontines
    if (req.user.role === 'membre') {
      const tontineIds = await getTontinesForMember(req.user._id);
      if (tontineId) {
        // Vérifier que le tontineId demandé est accessible
        if (!tontineIds.some(id => id.toString() === tontineId)) {
          return res.json({
            success: true,
            count: 0,
            data: []
          });
        }
      } else {
        query.tontine = { $in: tontineIds };
      }
    }

    const contributions = await Contribution.find(query)
      .populate('tontine', 'nom montantCotisation')
      .populate('membre', 'nom prenom telephone')
      .populate('tour', 'numeroTour beneficiaire')
      .populate('enregistrePar', 'nom prenom')
      .sort('-datePaiement');

    res.json({
      success: true,
      count: contributions.length,
      data: contributions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des contributions',
      error: error.message
    });
  }
});

// @route   GET /api/contributions/:id
// @desc    Obtenir une contribution par ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id)
      .populate('tontine', 'nom montantCotisation')
      .populate('membre', 'nom prenom telephone')
      .populate('enregistrePar', 'nom prenom');

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Contribution non trouvée'
      });
    }

    // Vérifier l'accès pour les membres
    if (req.user.role === 'membre') {
      const tontineIds = await getTontinesForMember(req.user._id);
      const contributionTontineId = contribution.tontine._id || contribution.tontine;
      
      if (!tontineIds.some(id => id.toString() === contributionTontineId.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à cette contribution'
        });
      }
    }

    res.json({
      success: true,
      data: contribution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la contribution',
      error: error.message
    });
  }
});

// @route   POST /api/contributions
// @desc    Enregistrer une nouvelle contribution
// @access  Private (Admin, Trésorier)
router.post('/', authorize('admin', 'tresorier'), [
  body('tontine').notEmpty().withMessage('La tontine est requise'),
  body('membre').notEmpty().withMessage('Le membre est requis'),
  body('montant').isNumeric().withMessage('Le montant doit être un nombre'),
  body('tour').notEmpty().withMessage('Le tour est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Vérifier que la tontine existe
    const tontine = await Tontine.findById(req.body.tontine);
    if (!tontine) {
      return res.status(404).json({
        success: false,
        message: 'Tontine non trouvée'
      });
    }

    // Vérifier que le tour existe
    const tour = await Tour.findById(req.body.tour);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    // Vérifier que le tour appartient à la tontine
    if (tour.tontine.toString() !== req.body.tontine) {
      return res.status(400).json({
        success: false,
        message: 'Ce tour n\'appartient pas à cette tontine'
      });
    }

    // Vérifier que le membre existe et est dans la tontine
    const member = await Member.findById(req.body.membre);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    const isMemberInTontine = tontine.membres.some(
      m => m.membre.toString() === req.body.membre && m.isActive
    );

    if (!isMemberInTontine) {
      return res.status(400).json({
        success: false,
        message: 'Ce membre ne fait pas partie de cette tontine'
      });
    }

    // Vérifier si le membre n'a pas déjà payé pour ce tour
    const existingContribution = await Contribution.findOne({
      tontine: req.body.tontine,
      membre: req.body.membre,
      tour: req.body.tour,
      statut: 'recu'
    });

    if (existingContribution) {
      return res.status(400).json({
        success: false,
        message: 'Ce membre a déjà payé pour ce tour'
      });
    }

    const contributionData = {
      ...req.body,
      cycle: tour.cycle,
      numeroTour: tour.numeroTour,
      enregistrePar: req.user.id
    };

    const contribution = await Contribution.create(contributionData);
    await contribution.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'membre', select: 'nom prenom telephone' },
      { path: 'tour', select: 'numeroTour beneficiaire cycle' },
      { path: 'enregistrePar', select: 'nom prenom' }
    ]);

    // Si la cotisation est reçue, mettre à jour la banque
    if (contribution.statut === 'recu') {
      let banque = await BanqueTontine.findOne({ tontine: contribution.tontine._id });
      
      if (!banque) {
        banque = await BanqueTontine.create({
          tontine: contribution.tontine._id
        });
      }

      // Ajouter la transaction
      banque.transactions.push({
        type: 'cotisation',
        montant: contribution.montant,
        description: `Cotisation pour Tour ${tour.numeroTour}`,
        contribution: contribution._id,
        tour: tour._id,
        membre: contribution.membre._id,
        date: contribution.datePaiement,
        effectuePar: req.user.id
      });

      banque.soldeCotisations += contribution.montant;
      banque.totalCotise += contribution.montant;

      await banque.save();

      // Mettre à jour le montant du tour avec la somme des cotisations
      const totalCotisationsTour = await Contribution.aggregate([
        { 
          $match: { 
            tour: tour._id, 
            statut: 'recu' 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$montant' } 
          } 
        }
      ]);

      const montantRecu = totalCotisationsTour.length > 0 ? totalCotisationsTour[0].total : 0;
      await Tour.findByIdAndUpdate(tour._id, { montantRecu });
    }

    res.status(201).json({
      success: true,
      data: contribution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de la contribution',
      error: error.message
    });
  }
});

// @route   PUT /api/contributions/:id
// @desc    Mettre à jour une contribution
// @access  Private (Admin, Trésorier)
router.put('/:id', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const contributionAvant = await Contribution.findById(req.params.id);

    if (!contributionAvant) {
      return res.status(404).json({
        success: false,
        message: 'Contribution non trouvée'
      });
    }

    const contribution = await Contribution.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'tontine', select: 'nom montantCotisation _id' },
      { path: 'membre', select: 'nom prenom telephone' },
      { path: 'enregistrePar', select: 'nom prenom' }
    ]);

    // Si le statut passe à "reçu" et n'était pas déjà reçu, mettre à jour la banque
    if (contribution.statut === 'recu' && contributionAvant.statut !== 'recu') {
      let banque = await BanqueTontine.findOne({ tontine: contribution.tontine._id });
      
      if (!banque) {
        banque = await BanqueTontine.create({
          tontine: contribution.tontine._id
        });
      }

      // Vérifier que la transaction n'existe pas déjà
      const transactionExists = banque.transactions.some(
        t => t.type === 'cotisation' && t.contribution?.toString() === contribution._id.toString()
      );

      if (!transactionExists) {
        // Ajouter la transaction
        banque.transactions.push({
          type: 'cotisation',
          montant: contribution.montant,
          description: 'Cotisation enregistrée',
          contribution: contribution._id,
          membre: contribution.membre._id,
          date: contribution.datePaiement,
          effectuePar: req.user.id
        });

        banque.soldeCotisations += contribution.montant;
        banque.totalCotise += contribution.montant;

        await banque.save();
      }
    }

    res.json({
      success: true,
      data: contribution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la contribution',
      error: error.message
    });
  }
});

// @route   DELETE /api/contributions/:id
// @desc    Supprimer une contribution
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Contribution non trouvée'
      });
    }

    await contribution.deleteOne();

    res.json({
      success: true,
      message: 'Contribution supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la contribution',
      error: error.message
    });
  }
});

module.exports = router;
