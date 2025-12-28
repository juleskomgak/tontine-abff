const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Member = require('../models/Member');
const { protect, authorize } = require('../middleware/auth');

// Toutes les routes sont protégées
router.use(protect);

// @route   GET /api/members
// @desc    Obtenir tous les membres
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { search, isActive } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
        { telephone: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const members = await Member.find(query)
      .populate('user', 'email role')
      .populate('createdBy', 'nom prenom')
      .sort('-createdAt');

    res.json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des membres',
      error: error.message
    });
  }
});

// @route   GET /api/members/:id
// @desc    Obtenir un membre par ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate('user', 'email role')
      .populate('createdBy', 'nom prenom');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du membre',
      error: error.message
    });
  }
});

// @route   POST /api/members
// @desc    Créer un nouveau membre
// @access  Private (Admin, Trésorier)
router.post('/', authorize('admin', 'tresorier'), [
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('prenom').notEmpty().withMessage('Le prénom est requis'),
  body('telephone').notEmpty().withMessage('Le téléphone est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const memberData = {
      ...req.body,
      createdBy: req.user.id
    };

    const member = await Member.create(memberData);

    res.status(201).json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du membre',
      error: error.message
    });
  }
});

// @route   PUT /api/members/:id
// @desc    Mettre à jour un membre
// @access  Private (Admin, Trésorier)
router.put('/:id', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    let member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    member = await Member.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du membre',
      error: error.message
    });
  }
});

// @route   DELETE /api/members/:id
// @desc    Supprimer un membre
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }

    await member.deleteOne();

    res.json({
      success: true,
      message: 'Membre supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du membre',
      error: error.message
    });
  }
});

module.exports = router;
