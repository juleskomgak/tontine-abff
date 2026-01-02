const express = require('express');
const router = express.Router();
const { CategorieAide, AideAccordee } = require('../models/Aide');
const Member = require('../models/Member');
const BanqueCentrale = require('../models/BanqueCentrale');
const Tour = require('../models/Tour');
const { protect, authorize } = require('../middleware/auth');

// ============== CATEGORIES D'AIDE ==============

// @route   GET /api/aides/categories
// @desc    Obtenir toutes les catégories d'aide
// @access  Private
router.get('/categories', protect, async (req, res) => {
  try {
    const categories = await CategorieAide.find()
      .populate('createdBy', 'nom prenom')
      .sort('type nom');

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories',
      error: error.message
    });
  }
});

// @route   POST /api/aides/categories
// @desc    Créer une nouvelle catégorie d'aide
// @access  Private (Admin)
router.post('/categories', protect, authorize('admin'), async (req, res) => {
  try {
    const { nom, type, description, montantDefaut } = req.body;

    const categorie = await CategorieAide.create({
      nom,
      type,
      description,
      montantDefaut,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: categorie
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Une catégorie avec ce nom existe déjà'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la catégorie',
      error: error.message
    });
  }
});

// @route   PUT /api/aides/categories/:id
// @desc    Modifier une catégorie d'aide
// @access  Private (Admin)
router.put('/categories/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { nom, type, description, montantDefaut, isActive } = req.body;

    const categorie = await CategorieAide.findByIdAndUpdate(
      req.params.id,
      { nom, type, description, montantDefaut, isActive },
      { new: true, runValidators: true }
    );

    if (!categorie) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Catégorie modifiée avec succès',
      data: categorie
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la catégorie',
      error: error.message
    });
  }
});

// @route   DELETE /api/aides/categories/:id
// @desc    Supprimer une catégorie d'aide
// @access  Private (Admin)
router.delete('/categories/:id', protect, authorize('admin'), async (req, res) => {
  try {
    // Vérifier s'il y a des aides liées
    const aidesLiees = await AideAccordee.countDocuments({ categorie: req.params.id });
    if (aidesLiees > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer: ${aidesLiees} aide(s) liée(s) à cette catégorie`
      });
    }

    const categorie = await CategorieAide.findByIdAndDelete(req.params.id);
    if (!categorie) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
});

// @route   POST /api/aides/categories/init
// @desc    Initialiser les catégories par défaut
// @access  Private (Admin)
router.post('/categories/init', protect, authorize('admin'), async (req, res) => {
  try {
    const categoriesDefaut = [
      { nom: 'Décès proche', type: 'malheureux', description: 'Aide en cas de décès d\'un proche', montantDefaut: 50000 },
      { nom: 'Maladie grave', type: 'malheureux', description: 'Aide en cas de maladie grave', montantDefaut: 30000 },
      { nom: 'Mariage', type: 'heureux', description: 'Aide pour mariage du membre', montantDefaut: 25000 },
      { nom: 'Naissance', type: 'heureux', description: 'Aide pour naissance d\'un enfant', montantDefaut: 20000 },
      { nom: 'Chefferie Bangang-Fokam', type: 'chefferie', description: 'Aide pour les activités de la chefferie', montantDefaut: 15000 },
      { nom: 'Aide repas réunion', type: 'repas', description: 'Aide pour l\'organisation des repas lors des réunions', montantDefaut: 50000 }
    ];

    const resultats = [];
    for (const cat of categoriesDefaut) {
      const existe = await CategorieAide.findOne({ nom: cat.nom });
      if (!existe) {
        const nouvelle = await CategorieAide.create({
          ...cat,
          createdBy: req.user.id
        });
        resultats.push({ nom: cat.nom, status: 'créée' });
      } else {
        resultats.push({ nom: cat.nom, status: 'existe déjà' });
      }
    }

    res.json({
      success: true,
      message: 'Initialisation terminée',
      data: resultats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initialisation',
      error: error.message
    });
  }
});

// ============== AIDES ACCORDEES ==============

// @route   GET /api/aides
// @desc    Obtenir toutes les aides avec filtres
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { annee, categorie, membre, statut, type, sourceDebit } = req.query;
    
    let query = {};
    
    if (annee) query.annee = parseInt(annee);
    if (categorie) query.categorie = categorie;
    if (membre) query.membre = membre;
    if (statut) query.statut = statut;
    if (sourceDebit) query.sourceDebit = sourceDebit;

    // Filtrer par type de catégorie
    if (type) {
      const categoriesType = await CategorieAide.find({ type }).select('_id');
      query.categorie = { $in: categoriesType.map(c => c._id) };
    }

    const aides = await AideAccordee.find(query)
      .populate('membre', 'nom prenom telephone')
      .populate('categorie', 'nom type montantDefaut')
      .populate('tour', 'numeroTour dateReceptionPrevue')
      .populate('tontine', 'nom')
      .populate('createdBy', 'nom prenom')
      .populate('approuvePar', 'nom prenom')
      .populate('payePar', 'nom prenom')
      .sort('-createdAt');

    res.json({
      success: true,
      count: aides.length,
      data: aides
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des aides',
      error: error.message
    });
  }
});

// @route   GET /api/aides/stats
// @desc    Obtenir les statistiques des aides
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const annee = parseInt(req.query.annee) || new Date().getFullYear();

    // Stats par catégorie
    const statsParCategorie = await AideAccordee.aggregate([
      { $match: { annee, statut: { $in: ['approuve', 'paye'] } } },
      {
        $lookup: {
          from: 'categorieaides',
          localField: 'categorie',
          foreignField: '_id',
          as: 'categorieInfo'
        }
      },
      { $unwind: '$categorieInfo' },
      {
        $group: {
          _id: '$categorie',
          nomCategorie: { $first: '$categorieInfo.nom' },
          typeCategorie: { $first: '$categorieInfo.type' },
          totalMontant: { $sum: '$montant' },
          nombreAides: { $count: {} }
        }
      },
      { $sort: { typeCategorie: 1, nomCategorie: 1 } }
    ]);

    // Stats par type
    const statsParType = await AideAccordee.aggregate([
      { $match: { annee, statut: { $in: ['approuve', 'paye'] } } },
      {
        $lookup: {
          from: 'categorieaides',
          localField: 'categorie',
          foreignField: '_id',
          as: 'categorieInfo'
        }
      },
      { $unwind: '$categorieInfo' },
      {
        $group: {
          _id: '$categorieInfo.type',
          totalMontant: { $sum: '$montant' },
          nombreAides: { $count: {} }
        }
      }
    ]);

    // Stats par statut
    const statsParStatut = await AideAccordee.aggregate([
      { $match: { annee } },
      {
        $group: {
          _id: '$statut',
          totalMontant: { $sum: '$montant' },
          nombre: { $count: {} }
        }
      }
    ]);

    // Total général
    const totalAides = await AideAccordee.aggregate([
      { $match: { annee, statut: { $in: ['approuve', 'paye'] } } },
      {
        $group: {
          _id: null,
          totalMontant: { $sum: '$montant' },
          nombreAides: { $count: {} }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        annee,
        totalGeneral: totalAides[0] || { totalMontant: 0, nombreAides: 0 },
        parCategorie: statsParCategorie,
        parType: statsParType,
        parStatut: statsParStatut
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

// @route   GET /api/aides/membres-eligibles
// @desc    Obtenir les membres éligibles aux aides (actifs et en règle solidarité)
// @access  Private
router.get('/membres-eligibles', protect, async (req, res) => {
  try {
    const annee = parseInt(req.query.annee) || new Date().getFullYear();
    
    // Récupérer tous les membres actifs
    const membres = await Member.find({ isActive: true })
      .select('nom prenom telephone email')
      .sort('nom prenom');

    // TODO: Vérifier le statut de solidarité membre pour chaque membre
    // Pour l'instant, on retourne tous les membres actifs
    // Une amélioration future pourrait vérifier les paiements de solidarité

    res.json({
      success: true,
      count: membres.length,
      data: membres
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des membres',
      error: error.message
    });
  }
});

// @route   POST /api/aides
// @desc    Créer une nouvelle demande d'aide
// @access  Private (Admin, Trésorier)
router.post('/', protect, authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const { membre, categorie, montant, motif, description, dateEvenement, tour, tontine, sourceDebit, notes } = req.body;

    // Vérifier que le membre existe et est actif
    const membreDoc = await Member.findById(membre);
    if (!membreDoc) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé'
      });
    }
    if (!membreDoc.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Ce membre n\'est pas actif'
      });
    }

    // Vérifier la catégorie
    const categorieDoc = await CategorieAide.findById(categorie);
    if (!categorieDoc) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie d\'aide non trouvée'
      });
    }

    // Déterminer la source de débit automatiquement si non fournie
    let source = sourceDebit;
    if (!source) {
      switch (categorieDoc.type) {
        case 'repas':
          source = 'solidarite_repas';
          break;
        case 'chefferie':
          source = 'caisse_chefferie';
          break;
        default:
          source = 'cotisation_membre';
      }
    }

    const aide = await AideAccordee.create({
      membre,
      categorie,
      montant: montant || categorieDoc.montantDefaut,
      motif,
      description,
      dateEvenement,
      tour,
      tontine,
      sourceDebit: source,
      notes,
      createdBy: req.user.id,
      annee: new Date().getFullYear()
    });

    await aide.populate([
      { path: 'membre', select: 'nom prenom telephone' },
      { path: 'categorie', select: 'nom type montantDefaut' },
      { path: 'createdBy', select: 'nom prenom' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Demande d\'aide créée avec succès',
      data: aide
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'aide',
      error: error.message
    });
  }
});

// @route   PUT /api/aides/:id/approuver
// @desc    Approuver une demande d'aide
// @access  Private (Admin)
router.put('/:id/approuver', protect, authorize('admin'), async (req, res) => {
  try {
    const aide = await AideAccordee.findById(req.params.id);
    if (!aide) {
      return res.status(404).json({
        success: false,
        message: 'Aide non trouvée'
      });
    }

    if (aide.statut !== 'en_attente') {
      return res.status(400).json({
        success: false,
        message: `Cette aide ne peut pas être approuvée (statut actuel: ${aide.statut})`
      });
    }

    aide.statut = 'approuve';
    aide.approuvePar = req.user.id;
    aide.dateApprobation = new Date();
    await aide.save();

    await aide.populate([
      { path: 'membre', select: 'nom prenom telephone' },
      { path: 'categorie', select: 'nom type' },
      { path: 'approuvePar', select: 'nom prenom' }
    ]);

    res.json({
      success: true,
      message: 'Aide approuvée avec succès',
      data: aide
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'approbation',
      error: error.message
    });
  }
});

// @route   PUT /api/aides/:id/payer
// @desc    Marquer une aide comme payée et débiter la banque
// @access  Private (Admin, Trésorier)
router.put('/:id/payer', protect, authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const aide = await AideAccordee.findById(req.params.id)
      .populate('membre', 'nom prenom')
      .populate('categorie', 'nom type');
      
    if (!aide) {
      return res.status(404).json({
        success: false,
        message: 'Aide non trouvée'
      });
    }

    if (aide.statut !== 'approuve') {
      return res.status(400).json({
        success: false,
        message: `Cette aide doit d'abord être approuvée (statut actuel: ${aide.statut})`
      });
    }

    // Trouver ou créer la banque centrale
    let banque = await BanqueCentrale.findOne({ tontine: { $exists: false } });
    if (!banque) {
      // Chercher une banque existante liée à une tontine
      banque = await BanqueCentrale.findOne({});
    }

    // Enregistrer la transaction selon la source
    if (banque) {
      const typeTransaction = aide.sourceDebit === 'solidarite_repas' 
        ? 'paiement_solidarite' 
        : 'ajustement';
      
      banque.transactions.push({
        type: typeTransaction,
        montant: -aide.montant,
        description: `Aide ${aide.categorie.nom} à ${aide.membre.nom} ${aide.membre.prenom}: ${aide.motif}`,
        membre: aide.membre._id,
        date: new Date(),
        effectuePar: req.user.id
      });

      // Débiter selon la source
      if (aide.sourceDebit === 'cotisation_membre') {
        banque.soldeCotisations = Math.max(0, (banque.soldeCotisations || 0) - aide.montant);
      }
      
      await banque.save();
    }

    // Mettre à jour l'aide
    aide.statut = 'paye';
    aide.datePaiement = new Date();
    aide.payePar = req.user.id;
    await aide.save();

    await aide.populate('payePar', 'nom prenom');

    res.json({
      success: true,
      message: 'Aide payée et débitée avec succès',
      data: aide
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du paiement',
      error: error.message
    });
  }
});

// @route   PUT /api/aides/:id/refuser
// @desc    Refuser une demande d'aide
// @access  Private (Admin)
router.put('/:id/refuser', protect, authorize('admin'), async (req, res) => {
  try {
    const { raison } = req.body;
    
    const aide = await AideAccordee.findById(req.params.id);
    if (!aide) {
      return res.status(404).json({
        success: false,
        message: 'Aide non trouvée'
      });
    }

    if (!['en_attente', 'approuve'].includes(aide.statut)) {
      return res.status(400).json({
        success: false,
        message: `Cette aide ne peut pas être refusée (statut actuel: ${aide.statut})`
      });
    }

    aide.statut = 'refuse';
    aide.notes = raison ? `Refusée: ${raison}` : 'Refusée';
    await aide.save();

    await aide.populate([
      { path: 'membre', select: 'nom prenom' },
      { path: 'categorie', select: 'nom type' }
    ]);

    res.json({
      success: true,
      message: 'Aide refusée',
      data: aide
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du refus',
      error: error.message
    });
  }
});

// @route   PUT /api/aides/:id/annuler
// @desc    Annuler une aide (si payée, créditer la banque)
// @access  Private (Admin)
router.put('/:id/annuler', protect, authorize('admin'), async (req, res) => {
  try {
    const aide = await AideAccordee.findById(req.params.id)
      .populate('membre', 'nom prenom')
      .populate('categorie', 'nom type');
      
    if (!aide) {
      return res.status(404).json({
        success: false,
        message: 'Aide non trouvée'
      });
    }

    // Si l'aide était payée, rembourser la banque
    if (aide.statut === 'paye') {
      let banque = await BanqueCentrale.findOne({});
      if (banque) {
        banque.transactions.push({
          type: 'ajustement',
          montant: aide.montant,
          description: `Annulation aide ${aide.categorie.nom} à ${aide.membre.nom} ${aide.membre.prenom}`,
          membre: aide.membre._id,
          date: new Date(),
          effectuePar: req.user.id
        });

        if (aide.sourceDebit === 'cotisation_membre') {
          banque.soldeCotisations = (banque.soldeCotisations || 0) + aide.montant;
        }
        
        await banque.save();
      }
    }

    aide.statut = 'annule';
    aide.notes = `${aide.notes || ''} - Annulée le ${new Date().toLocaleDateString('fr-FR')}`;
    await aide.save();

    res.json({
      success: true,
      message: 'Aide annulée avec succès',
      data: aide
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation',
      error: error.message
    });
  }
});

// @route   DELETE /api/aides/:id
// @desc    Supprimer une aide (seulement si en attente)
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const aide = await AideAccordee.findById(req.params.id);
    if (!aide) {
      return res.status(404).json({
        success: false,
        message: 'Aide non trouvée'
      });
    }

    if (aide.statut !== 'en_attente') {
      return res.status(400).json({
        success: false,
        message: 'Seules les aides en attente peuvent être supprimées'
      });
    }

    await aide.deleteOne();

    res.json({
      success: true,
      message: 'Aide supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
});

// @route   GET /api/aides/tours-eligibles
// @desc    Obtenir les tours payés pour l'aide repas
// @access  Private
router.get('/tours-eligibles', protect, async (req, res) => {
  try {
    const tours = await Tour.find({ statut: 'paye' })
      .populate('tontine', 'nom')
      .populate('beneficiaire', 'nom prenom telephone')
      .sort('-dateReceptionPrevue')
      .limit(50);

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

module.exports = router;
