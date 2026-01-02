const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Tour = require('../models/Tour');
const Tontine = require('../models/Tontine');
const Member = require('../models/Member');
const BanqueCentrale = require('../models/BanqueCentrale');
const Contribution = require('../models/Contribution');
const { protect, authorize } = require('../middleware/auth');

// V4: Fonctions utilitaires pour le calcul des dates de réception
// Gère correctement le décalage timezone Europe/Paris vs UTC

// Extraire année, mois, jour en "temps local Europe" depuis une date UTC
// Ex: 2025-05-31T22:00:00.000Z -> 2025, 5 (juin), 1 en Europe (UTC+2)
function getDatePartsEurope(date) {
  const d = new Date(date);
  // Ajouter 2h pour simuler Europe/Paris (approximation, couvre été+hiver)
  const europeOffset = 2 * 60 * 60 * 1000; // 2 heures en ms
  const europeDate = new Date(d.getTime() + europeOffset);
  return {
    annee: europeDate.getUTCFullYear(),
    mois: europeDate.getUTCMonth(), // 0-indexed
    jour: europeDate.getUTCDate()
  };
}

// Trouver le premier dimanche d'un mois donné (année et mois en paramètres)
function getPremierDimancheDuMoisPourAnneeEtMois(annee, mois) {
  // Créer une date au 1er du mois à midi UTC
  const premierDuMois = new Date(Date.UTC(annee, mois, 1, 12, 0, 0));
  
  const jourSemaine = premierDuMois.getUTCDay(); // 0 = Dimanche
  
  if (jourSemaine === 0) {
    return premierDuMois;
  }
  
  // Calculer le premier dimanche
  const joursJusquAuDimanche = 7 - jourSemaine;
  premierDuMois.setUTCDate(1 + joursJusquAuDimanche);
  
  return premierDuMois;
}

// Calculer la date de réception pour un tour donné
// Tour 1 = date de début, Tours suivants = premier dimanche du mois correspondant
function calculerDateReceptionTour(dateDebutTontine, numeroTour, frequence) {
  if (numeroTour === 1) {
    return new Date(dateDebutTontine);
  }
  
  // Extraire année/mois en "temps Europe" pour être cohérent avec ce que l'utilisateur voit
  const { annee: anneeDebut, mois: moisDebut } = getDatePartsEurope(dateDebutTontine);
  
  let dateReception;
  
  switch (frequence) {
    case 'hebdomadaire':
      dateReception = new Date(dateDebutTontine);
      dateReception.setDate(dateReception.getDate() + (numeroTour - 1) * 7);
      break;
    case 'bimensuel':
      dateReception = new Date(dateDebutTontine);
      dateReception.setDate(dateReception.getDate() + (numeroTour - 1) * 15);
      break;
    case 'mensuel':
    default:
      // Pour mensuel: mois de début + (numeroTour - 1) mois
      const totalMois = moisDebut + (numeroTour - 1);
      const anneeCible = anneeDebut + Math.floor(totalMois / 12);
      const moisCible = totalMois % 12;
      
      dateReception = getPremierDimancheDuMoisPourAnneeEtMois(anneeCible, moisCible);
      break;
  }
  
  return dateReception;
}

// Fonction utilitaire pour recalculer le montant d'un tour
async function recalculerMontantTour(tourId) {
  try {
    // Calculer la somme des cotisations reçues pour ce tour
    const totalCotisations = await Contribution.aggregate([
      { 
        $match: { 
          tour: tourId, 
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

    const montantRecu = totalCotisations.length > 0 ? totalCotisations[0].total : 0;
    
    // Mettre à jour le montant du tour
    await Tour.findByIdAndUpdate(tourId, { montantRecu });
    
    return montantRecu;
  } catch (error) {
    console.error('Erreur lors du recalcul du montant du tour:', error);
    return 0;
  }
}

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

// @route   GET /api/tours
// @desc    Obtenir tous les tours
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { tontineId, beneficiaireId, cycle, statut } = req.query;
    let query = {};

    if (tontineId) query.tontine = tontineId;
    if (beneficiaireId) query.beneficiaire = beneficiaireId;
    if (cycle) query.cycle = cycle;
    if (statut) query.statut = statut;

    // Si l'utilisateur est un simple membre, filtrer les tours par ses tontines
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

    const tours = await Tour.find(query)
      .populate('tontine', 'nom montantCotisation')
      .populate('beneficiaire', 'nom prenom telephone')
      .populate('attribuePar', 'nom prenom')
      .sort('-dateAttribution');

    res.json({
      success: true,
      count: tours.length,
      data: tours
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tours',
      error: error.message
    });
  }
});

// @route   GET /api/tours/:id
// @desc    Obtenir un tour par ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id)
      .populate('tontine', 'nom montantCotisation')
      .populate('beneficiaire', 'nom prenom telephone')
      .populate('attribuePar', 'nom prenom');

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    // Vérifier l'accès pour les membres
    if (req.user.role === 'membre') {
      const tontineIds = await getTontinesForMember(req.user._id);
      const tourTontineId = tour.tontine._id || tour.tontine;
      
      if (!tontineIds.some(id => id.toString() === tourTontineId.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à ce tour'
        });
      }
    }

    res.json({
      success: true,
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du tour',
      error: error.message
    });
  }
});

// @route   POST /api/tours
// @desc    Attribuer un tour
// @access  Private (Admin, Trésorier)
router.post('/', authorize('admin', 'tresorier'), [
  body('tontine').notEmpty().withMessage('La tontine est requise'),
  body('beneficiaire').notEmpty().withMessage('Le bénéficiaire est requis'),
  body('cycle').isNumeric().withMessage('Le cycle doit être un nombre'),
  body('montantRecu').isNumeric().withMessage('Le montant doit être un nombre')
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

    // Vérifier que le membre existe et est dans la tontine
    const member = await Member.findById(req.body.beneficiaire);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    const isMemberInTontine = tontine.membres.some(
      m => m.membre.toString() === req.body.beneficiaire && m.isActive
    );

    if (!isMemberInTontine) {
      return res.status(400).json({
        success: false,
        message: 'Ce membre ne fait pas partie de cette tontine'
      });
    }

    // Vérifier si le membre n'a pas déjà reçu son tour
    const existingTour = await Tour.findOne({
      tontine: req.body.tontine,
      beneficiaire: req.body.beneficiaire
    });

    if (existingTour) {
      return res.status(400).json({
        success: false,
        message: 'Ce membre a déjà reçu son tour dans cette tontine'
      });
    }

    // Calculer la date de réception prévue
    const numeroTour = await Tour.countDocuments({
      tontine: req.body.tontine,
      cycle: req.body.cycle
    }) + 1;

    // Utiliser la fonction unifiée pour calculer la date de réception
    const dateReceptionPrevue = calculerDateReceptionTour(tontine.dateDebut, numeroTour, tontine.frequence);

    // Calculer le montant réel des cotisations reçues pour ce tour spécifique
    let montantRecu = req.body.montantRecu;
    if (!montantRecu || montantRecu === 0) {
      // Calculer la somme des cotisations pour ce tour spécifique
      const contributionsDuTour = await Contribution.find({
        tour: req.body.tour || null, // Si un tour spécifique est fourni
        tontine: req.body.tontine,
        cycle: req.body.cycle,
        statut: 'recu'
      });
      montantRecu = contributionsDuTour.reduce((sum, c) => sum + c.montant, 0);
    }

    const tourData = {
      tontine: req.body.tontine,
      beneficiaire: req.body.beneficiaire,
      cycle: req.body.cycle,
      modeAttribution: req.body.modeAttribution || 'manuel',
      montantRecu,
      numeroTour,
      dateReceptionPrevue,
      attribuePar: req.user.id
    };

    const tour = await Tour.create(tourData);
    await tour.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'beneficiaire', select: 'nom prenom telephone' },
      { path: 'attribuePar', select: 'nom prenom' }
    ]);

    res.status(201).json({
      success: true,
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'attribution du tour',
      error: error.message
    });
  }
});

// @route   POST /api/tours/tirage/:tontineId
// @desc    Effectuer un tirage au sort pour le prochain tour
// @access  Private (Admin, Trésorier)
router.post('/tirage/:tontineId', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const tontine = await Tontine.findById(req.params.tontineId);
    
    if (!tontine) {
      return res.status(404).json({
        success: false,
        message: 'Tontine non trouvée'
      });
    }

    if (tontine.statut !== 'actif') {
      return res.status(400).json({
        success: false,
        message: 'La tontine doit être active pour effectuer un tirage'
      });
    }

    // Obtenir tous les tours déjà attribués
    const toursAttribues = await Tour.find({ tontine: req.params.tontineId });
    const beneficiairesIds = toursAttribues.map(t => t.beneficiaire.toString());

    // Filtrer les membres qui n'ont pas encore reçu leur tour
    const membresDisponibles = tontine.membres.filter(
      m => m.isActive && !beneficiairesIds.includes(m.membre.toString())
    );

    if (membresDisponibles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tous les membres ont déjà reçu leur tour'
      });
    }

    // Tirage au sort
    const randomIndex = Math.floor(Math.random() * membresDisponibles.length);
    const beneficiaire = membresDisponibles[randomIndex].membre;

    // Calculer la date de réception prévue
    const toursExistantsDansCycle = toursAttribues.filter(t => t.cycle === tontine.cycleCourant);
    const numeroTour = toursExistantsDansCycle.length + 1;
    
    // Utiliser la fonction unifiée pour calculer la date de réception
    const dateReceptionPrevue = calculerDateReceptionTour(tontine.dateDebut, numeroTour, tontine.frequence);

    // Calculer le montant réel des cotisations reçues pour ce cycle (sera recalculé après création du tour)
    const contributionsDuCycle = await Contribution.find({
      tontine: req.params.tontineId,
      cycle: tontine.cycleCourant,
      statut: 'recu'
    });
    
    const montantReelCotise = contributionsDuCycle.reduce((sum, c) => sum + c.montant, 0);
    
    // Utiliser le montant réel si disponible, sinon 0 (sera recalculé après)
    const montantTour = montantReelCotise > 0 ? montantReelCotise : 0;

    // Créer le tour
    const tour = await Tour.create({
      tontine: req.params.tontineId,
      beneficiaire,
      cycle: tontine.cycleCourant,
      numeroTour,
      montantRecu: montantTour,
      dateReceptionPrevue,
      modeAttribution: 'tirage_au_sort',
      attribuePar: req.user.id
    });

    // Recalculer le montant du tour basé sur les cotisations spécifiques à ce tour
    await recalculerMontantTour(tour._id);

    await tour.populate([
      { path: 'tontine', select: 'nom montantCotisation' },
      { path: 'beneficiaire', select: 'nom prenom telephone' },
      { path: 'attribuePar', select: 'nom prenom' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Tirage effectué avec succès',
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du tirage au sort',
      error: error.message
    });
  }
});

// @route   PUT /api/tours/:id/status
// @desc    Mettre à jour le statut d'un tour
// @access  Private (Admin, Trésorier)
router.put('/:id/status', authorize('admin', 'tresorier'), [
  body('statut').isIn(['attribue', 'paye', 'en_attente', 'refuse']).withMessage('Statut invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Récupérer le tour avant mise à jour pour vérifier l'ancien statut
    const tourAvant = await Tour.findById(req.params.id);
    
    if (!tourAvant) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    const updateData = { statut: req.body.statut };
    
    if (req.body.statut === 'paye' && !req.body.datePaiement) {
      updateData.datePaiement = new Date();
    }

    const tour = await Tour.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate([
      { path: 'tontine', select: 'nom montantCotisation _id' },
      { path: 'beneficiaire', select: 'nom prenom telephone' }
    ]);

    // Si le statut du tour a changé, recalculer les montants de la banque
    if (tourAvant.statut !== req.body.statut) {
      const { recalculerMontantsBanque } = require('./banque');
      await recalculerMontantsBanque(tour.tontine._id);
    }

    res.json({
      success: true,
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
      error: error.message
    });
  }
});

// @route   DELETE /api/tours/:id
// @desc    Supprimer un tour
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour non trouvé'
      });
    }

    if (tour.statut === 'paye') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un tour déjà payé'
      });
    }

    await tour.deleteOne();

    res.json({
      success: true,
      message: 'Tour supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du tour',
      error: error.message
    });
  }
});

module.exports = router;
