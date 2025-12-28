const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Tontine = require('../models/Tontine');
const Member = require('../models/Member');
const { protect, authorize } = require('../middleware/auth');

// Toutes les routes sont protégées
router.use(protect);

// Fonction utilitaire pour obtenir les tontines accessibles par un membre
async function getTontinesForMember(userId) {
  // Trouver le membre associé à cet utilisateur
  const member = await Member.findOne({ user: userId });
  if (!member) return [];
  
  // Trouver les tontines où ce membre est inscrit
  const tontines = await Tontine.find({
    'membres.membre': member._id
  });
  
  return tontines.map(t => t._id);
}

// @route   GET /api/tontines
// @desc    Obtenir toutes les tontines
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { statut } = req.query;
    let query = {};

    if (statut) {
      query.statut = statut;
    }

    // Si l'utilisateur est un simple membre, filtrer les tontines
    if (req.user.role === 'membre') {
      const tontineIds = await getTontinesForMember(req.user._id);
      query._id = { $in: tontineIds };
    }

    const tontines = await Tontine.find(query)
      .populate('membres.membre', 'nom prenom telephone')
      .populate('createdBy', 'nom prenom')
      .sort('-createdAt');

    res.json({
      success: true,
      count: tontines.length,
      data: tontines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tontines',
      error: error.message
    });
  }
});

// @route   GET /api/tontines/:id
// @desc    Obtenir une tontine par ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const tontine = await Tontine.findById(req.params.id)
      .populate('membres.membre', 'nom prenom telephone email')
      .populate('createdBy', 'nom prenom');

    if (!tontine) {
      return res.status(404).json({
        success: false,
        message: 'Tontine non trouvée'
      });
    }

    // Vérifier si le membre a accès à cette tontine
    if (req.user.role === 'membre') {
      const member = await Member.findOne({ user: req.user._id });
      if (!member) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à cette tontine'
        });
      }
      
      const isMember = tontine.membres.some(m => 
        m.membre._id.toString() === member._id.toString()
      );
      
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas membre de cette tontine'
        });
      }
    }

    res.json({
      success: true,
      data: tontine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la tontine',
      error: error.message
    });
  }
});

// @route   POST /api/tontines
// @desc    Créer une nouvelle tontine
// @access  Private (Admin, Trésorier)
router.post('/', authorize('admin', 'tresorier'), [
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('montantCotisation').isNumeric().withMessage('Le montant doit être un nombre'),
  body('dateDebut').isISO8601().withMessage('Date de début invalide'),
  body('membres').isArray({ min: 2 }).withMessage('Au moins 2 membres sont requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Vérifier que tous les membres existent
    const memberIds = req.body.membres.map(m => m.membre || m);
    const members = await Member.find({ _id: { $in: memberIds } });

    if (members.length !== memberIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Certains membres sont invalides'
      });
    }

    const tontineData = {
      ...req.body,
      createdBy: req.user.id,
      membres: memberIds.map(id => ({
        membre: id,
        dateAdhesion: new Date(),
        isActive: true
      }))
    };

    const tontine = await Tontine.create(tontineData);
    await tontine.populate('membres.membre', 'nom prenom telephone');

    res.status(201).json({
      success: true,
      data: tontine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la tontine',
      error: error.message
    });
  }
});

// @route   PUT /api/tontines/:id
// @desc    Mettre à jour une tontine
// @access  Private (Admin, Trésorier)
router.put('/:id', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    let tontine = await Tontine.findById(req.params.id);

    if (!tontine) {
      return res.status(404).json({
        success: false,
        message: 'Tontine non trouvée'
      });
    }

    tontine = await Tontine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('membres.membre', 'nom prenom telephone');

    res.json({
      success: true,
      data: tontine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la tontine',
      error: error.message
    });
  }
});

// @route   PUT /api/tontines/:id/status
// @desc    Changer le statut d'une tontine
// @access  Private (Admin, Trésorier)
router.put('/:id/status', authorize('admin', 'tresorier'), [
  body('statut').isIn(['planifie', 'actif', 'termine', 'suspendu']).withMessage('Statut invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const tontine = await Tontine.findByIdAndUpdate(
      req.params.id,
      { statut: req.body.statut },
      { new: true }
    ).populate('membres.membre', 'nom prenom');

    if (!tontine) {
      return res.status(404).json({
        success: false,
        message: 'Tontine non trouvée'
      });
    }

    res.json({
      success: true,
      data: tontine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de statut',
      error: error.message
    });
  }
});

// @route   POST /api/tontines/:id/members
// @desc    Ajouter un membre à une tontine
// @access  Private (Admin, Trésorier)
router.post('/:id/members', authorize('admin', 'tresorier'), [
  body('membreId').notEmpty().withMessage('L\'ID du membre est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const tontine = await Tontine.findById(req.params.id);

    if (!tontine) {
      return res.status(404).json({
        success: false,
        message: 'Tontine non trouvée'
      });
    }

    // Vérifier si le membre existe
    const member = await Member.findById(req.body.membreId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    // Vérifier si le membre n'est pas déjà dans la tontine
    const exists = tontine.membres.some(m => m.membre.toString() === req.body.membreId);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Ce membre est déjà dans la tontine'
      });
    }

    tontine.membres.push({
      membre: req.body.membreId,
      dateAdhesion: new Date(),
      isActive: true
    });

    // Forcer le recalcul avant la sauvegarde
    const activeMembers = tontine.membres.filter(m => m.isActive).length;
    tontine.nombreMembres = activeMembers;
    tontine.montantTotal = activeMembers * tontine.montantCotisation;
    tontine.totalCycles = activeMembers;

    // Sauvegarder (le hook pre('save') recalcule nombreMembres et montantTotal)
    await tontine.save();
    
    // Recharger la tontine avec les valeurs calculées et population complète
    const updatedTontine = await Tontine.findById(req.params.id)
      .populate('membres.membre', 'nom prenom telephone email')
      .populate('createdBy', 'nom prenom')
      .lean(); // Convertir en objet JavaScript pur
    
    console.log('=== BACKEND: Membre ajouté ===');
    console.log('Nombre de membres:', updatedTontine.nombreMembres);
    console.log('Montant total:', updatedTontine.montantTotal);
    console.log('Total cycles:', updatedTontine.totalCycles);
    console.log('Montant cotisation:', updatedTontine.montantCotisation);
    console.log('Membres dans array:', updatedTontine.membres?.length);

    res.json({
      success: true,
      data: updatedTontine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du membre',
      error: error.message
    });
  }
});

// @route   DELETE /api/tontines/:id
// @desc    Supprimer une tontine
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const tontine = await Tontine.findById(req.params.id);

    if (!tontine) {
      return res.status(404).json({
        success: false,
        message: 'Tontine non trouvée'
      });
    }

    if (tontine.statut === 'actif') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une tontine active'
      });
    }

    await tontine.deleteOne();

    res.json({
      success: true,
      message: 'Tontine supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la tontine',
      error: error.message
    });
  }
});

module.exports = router;
