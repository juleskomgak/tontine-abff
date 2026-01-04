const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const SolidariteConfig = require('../models/Solidarite');
const PaiementSolidarite = require('../models/PaiementSolidarite');
const BanqueCentrale = require('../models/BanqueCentrale');
const Member = require('../models/Member');

// Protection de toutes les routes
router.use(protect);

// ============== CONFIGURATION DES SOLIDARITÉS ==============

// @route   GET /api/solidarites/config
// @desc    Obtenir toutes les configurations de solidarité
// @access  Private
router.get('/config', async (req, res) => {
  try {
    const configs = await SolidariteConfig.find().sort({ nom: 1 });
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// @route   POST /api/solidarites/config
// @desc    Créer ou mettre à jour une configuration de solidarité
// @access  Private/Admin
router.post('/config', authorize('admin'), [
  body('nom').isIn(['repas', 'membre', 'assurance_rapatriement']),
  body('libelle').notEmpty().withMessage('Le libellé est requis'),
  body('montantMensuel').isNumeric().withMessage('Le montant mensuel est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { nom, libelle, description, montantMensuel, montantTrimestriel, montantAnnuel } = req.body;

    let config = await SolidariteConfig.findOne({ nom });
    
    if (config) {
      // Mise à jour
      config.libelle = libelle;
      config.description = description;
      config.montantMensuel = montantMensuel;
      config.montantTrimestriel = montantTrimestriel || montantMensuel * 3;
      config.montantAnnuel = montantAnnuel || montantMensuel * 12;
      await config.save();
    } else {
      // Création
      config = await SolidariteConfig.create({
        nom,
        libelle,
        description,
        montantMensuel,
        montantTrimestriel,
        montantAnnuel,
        createdBy: req.user._id
      });
    }

    res.status(201).json({ success: true, data: config });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// @route   PUT /api/solidarites/config/:nom
// @desc    Mettre à jour une configuration de solidarité
// @access  Private/Admin/Tresorier
router.put('/config/:nom', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    console.log('Mise à jour config:', req.params.nom, req.body);
    
    const config = await SolidariteConfig.findOneAndUpdate(
      { nom: req.params.nom },
      req.body,
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({ success: false, error: 'Configuration non trouvée' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============== PAIEMENTS DE SOLIDARITÉ ==============

// @route   GET /api/solidarites/paiements
// @desc    Obtenir tous les paiements avec filtres
// @access  Private
router.get('/paiements', async (req, res) => {
  try {
    const { membre, typeSolidarite, annee, mois, trimestre, statut } = req.query;
    
    let query = {};
    if (membre) query.membre = membre;
    if (typeSolidarite) query.typeSolidarite = typeSolidarite;
    if (annee) query.annee = parseInt(annee);
    if (mois) query.mois = parseInt(mois);
    if (trimestre) query.trimestre = parseInt(trimestre);
    if (statut) query.statut = statut;

    const paiements = await PaiementSolidarite.find(query)
      .populate('membre', 'nom prenom telephone')
      .populate('enregistrePar', 'nom prenom')
      .sort({ datePaiement: -1 });

    res.json({ success: true, count: paiements.length, data: paiements });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// @route   POST /api/solidarites/paiements
// @desc    Enregistrer un paiement de solidarité
// @access  Private
router.post('/paiements', [
  body('membre').notEmpty().withMessage('Le membre est requis'),
  body('typeSolidarite').isIn(['repas', 'membre', 'assurance_rapatriement']),
  body('montant').isNumeric().withMessage('Le montant est requis'),
  body('frequence').isIn(['mensuel', 'trimestriel', 'annuel']),
  body('annee').isNumeric().withMessage('L\'année est requise')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { membre, typeSolidarite, montant, frequence, annee, mois, trimestre, 
            methodePaiement, referenceTransaction, notes } = req.body;

    // Calculer les périodes
    let periodeDebut, periodeFin;
    
    if (frequence === 'mensuel' && mois) {
      periodeDebut = new Date(annee, mois - 1, 1);
      periodeFin = new Date(annee, mois, 0);
    } else if (frequence === 'trimestriel' && trimestre) {
      const moisDebut = (trimestre - 1) * 3;
      periodeDebut = new Date(annee, moisDebut, 1);
      periodeFin = new Date(annee, moisDebut + 3, 0);
    } else if (frequence === 'annuel') {
      periodeDebut = new Date(annee, 0, 1);
      periodeFin = new Date(annee, 11, 31);
    }

    // Vérifier si le paiement existe déjà
    const existingQuery = { membre, typeSolidarite, annee };
    if (frequence === 'mensuel') existingQuery.mois = mois;
    if (frequence === 'trimestriel') existingQuery.trimestre = trimestre;
    
    const existingPaiement = await PaiementSolidarite.findOne(existingQuery);
    if (existingPaiement) {
      return res.status(400).json({ 
        success: false, 
        error: 'Un paiement existe déjà pour cette période' 
      });
    }

    const paiement = await PaiementSolidarite.create({
      membre,
      typeSolidarite,
      montant,
      frequence,
      periodeDebut,
      periodeFin,
      annee,
      mois: frequence === 'mensuel' ? mois : undefined,
      trimestre: frequence === 'trimestriel' ? trimestre : undefined,
      methodePaiement,
      referenceTransaction,
      notes,
      enregistrePar: req.user._id
    });

    const populatedPaiement = await PaiementSolidarite.findById(paiement._id)
      .populate('membre', 'nom prenom telephone')
      .populate('enregistrePar', 'nom prenom');

    // Enregistrer une transaction dans la banque centrale (global)
    try {
      let banque = await BanqueCentrale.findOne({});
      if (!banque) {
        banque = await BanqueCentrale.create({ notes: 'Banque centrale initialisée' });
      }
      banque.transactions.push({
        type: 'paiement_solidarite',
        montant: paiement.montant,
        paiementSolidarite: paiement._id,
        membre: paiement.membre,
        effectuePar: req.user._id,
        date: paiement.createdAt || Date.now(),
        description: `Paiement solidarité ${paiement.typeSolidarite} - ${paiement.annee}`
      });
      banque.soldeCotisations = (banque.soldeCotisations || 0) + paiement.montant;
      banque.totalCotise = (banque.totalCotise || 0) + paiement.montant;
      await banque.save();
    } catch (err) {
      console.error('Erreur en enregistrant la transaction solidarité dans la banque:', err);
    }

    res.status(201).json({ success: true, data: populatedPaiement });
  } catch (error) {
    console.error('Erreur:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Paiement déjà enregistré pour cette période' });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// @route   DELETE /api/solidarites/paiements/:id
// @desc    Supprimer un paiement
// @access  Private/Admin
router.delete('/paiements/:id', authorize('admin', 'tresorier'), async (req, res) => {
  try {
    const paiement = await PaiementSolidarite.findByIdAndDelete(req.params.id);
    
    if (!paiement) {
      return res.status(404).json({ success: false, error: 'Paiement non trouvé' });
    }

    res.json({ success: true, data: {} });
    // Retirer la transaction correspondante de la banque centrale si présente
    try {
      const banque = await BanqueCentrale.findOne({});
      if (banque) {
        // supprimer la transaction liée au paiement
        const beforeCount = banque.transactions.length;
        banque.transactions = banque.transactions.filter(t => !t.paiementSolidarite || t.paiementSolidarite.toString() !== req.params.id);
        if (banque.transactions.length !== beforeCount) {
          // ajuster les totaux
          banque.soldeCotisations = banque.transactions.reduce((sum, t) => sum + (t.type === 'paiement_solidarite' || t.type === 'cotisation' ? t.montant : 0), 0);
          banque.totalCotise = banque.soldeCotisations;
          await banque.save();
        }
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la banque après suppression paiement solidarité:', err);
    }
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============== STATUT DES MEMBRES ==============

// @route   GET /api/solidarites/statuts
// @desc    Obtenir le statut de tous les membres pour une année
// @access  Private
router.get('/statuts', async (req, res) => {
  try {
    const { annee = new Date().getFullYear(), typeSolidarite } = req.query;
    const anneeInt = parseInt(annee);

    // Récupérer tous les membres actifs
    const membres = await Member.find({ isActive: true }).sort({ nom: 1, prenom: 1 });
    
    // Récupérer les configurations
    const configs = await SolidariteConfig.find({ isActive: true });
    
    // Récupérer tous les paiements de l'année
    let paiementsQuery = { annee: anneeInt, statut: 'paye' };
    if (typeSolidarite) paiementsQuery.typeSolidarite = typeSolidarite;
    
    const paiements = await PaiementSolidarite.find(paiementsQuery);

    // Calculer le statut de chaque membre
    const moisActuel = new Date().getMonth() + 1;
    const statuts = [];

    for (const membre of membres) {
      const membreStatut = {
        membre: {
          _id: membre._id,
          nom: membre.nom,
          prenom: membre.prenom,
          telephone: membre.telephone
        },
        solidarites: {}
      };

      for (const config of configs) {
        if (typeSolidarite && config.nom !== typeSolidarite) continue;

        const paiementsMembre = paiements.filter(
          p => p.membre.toString() === membre._id.toString() && p.typeSolidarite === config.nom
        );

        // Calculer les mois payés (pour affichage)
        const moisPayes = new Set();
        paiementsMembre.forEach(p => {
          if (p.frequence === 'mensuel') {
            moisPayes.add(p.mois);
          } else if (p.frequence === 'trimestriel') {
            const moisDebut = (p.trimestre - 1) * 3 + 1;
            for (let m = moisDebut; m < moisDebut + 3; m++) {
              moisPayes.add(m);
            }
          } else if (p.frequence === 'annuel') {
            for (let m = 1; m <= 12; m++) {
              moisPayes.add(m);
            }
          }
        });

        // Calculer le montant total payé
        const totalPaye = paiementsMembre.reduce((sum, p) => sum + p.montant, 0);
        
        // Le montant attendu est le montant ANNUEL complet
        const montantAttendu = config.montantAnnuel || (config.montantMensuel * 12);
        
        // Déterminer le statut basé sur le MONTANT PAYÉ vs MONTANT ANNUEL
        // Le membre est à jour UNIQUEMENT si totalPaye >= montantAnnuel
        let statut = 'a_jour';
        const moisEnRetard = [];
        
        if (totalPaye < montantAttendu) {
          statut = 'en_retard';
          // Calculer les mois en retard pour affichage
          for (let m = 1; m <= moisActuel; m++) {
            if (!moisPayes.has(m)) {
              moisEnRetard.push(m);
            }
          }
          // Si tous les mois semblent payés mais le montant est insuffisant,
          // indiquer le déficit
          if (moisEnRetard.length === 0 && totalPaye < montantAttendu) {
            // Le membre a payé pour tous les mois mais avec un montant insuffisant
            // On calcule combien de mois équivalents il manque
            const moisEquivalentsPayes = Math.floor(totalPaye / config.montantMensuel);
            for (let m = moisEquivalentsPayes + 1; m <= 12; m++) {
              moisEnRetard.push(m);
            }
          }
        }

        membreStatut.solidarites[config.nom] = {
          libelle: config.libelle,
          totalPaye,
          montantAttendu,
          montantRestant: Math.max(0, montantAttendu - totalPaye),
          moisPayes: Array.from(moisPayes).sort((a, b) => a - b),
          moisEnRetard,
          statut,
          paiements: paiementsMembre
        };
      }

      statuts.push(membreStatut);
    }

    res.json({ 
      success: true, 
      data: {
        annee: anneeInt,
        moisActuel,
        configs,
        statuts
      }
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// @route   GET /api/solidarites/statuts/:membreId
// @desc    Obtenir le statut détaillé d'un membre
// @access  Private
router.get('/statuts/:membreId', async (req, res) => {
  try {
    const { annee = new Date().getFullYear() } = req.query;
    const anneeInt = parseInt(annee);

    const membre = await Member.findById(req.params.membreId);
    if (!membre) {
      return res.status(404).json({ success: false, error: 'Membre non trouvé' });
    }

    const configs = await SolidariteConfig.find({ isActive: true });
    const paiements = await PaiementSolidarite.find({
      membre: req.params.membreId,
      annee: anneeInt,
      statut: 'paye'
    }).populate('enregistrePar', 'nom prenom').sort({ datePaiement: -1 });

    const moisActuel = new Date().getMonth() + 1;
    const solidarites = {};

    for (const config of configs) {
      const paiementsType = paiements.filter(p => p.typeSolidarite === config.nom);
      
      const moisPayes = new Set();
      paiementsType.forEach(p => {
        if (p.frequence === 'mensuel') {
          moisPayes.add(p.mois);
        } else if (p.frequence === 'trimestriel') {
          const moisDebut = (p.trimestre - 1) * 3 + 1;
          for (let m = moisDebut; m < moisDebut + 3; m++) {
            moisPayes.add(m);
          }
        } else if (p.frequence === 'annuel') {
          for (let m = 1; m <= 12; m++) {
            moisPayes.add(m);
          }
        }
      });

      const totalPaye = paiementsType.reduce((sum, p) => sum + p.montant, 0);
      // Le montant attendu est le montant ANNUEL complet
      const montantAttendu = config.montantAnnuel || (config.montantMensuel * 12);
      
      // Déterminer le statut basé sur le MONTANT PAYÉ vs MONTANT ANNUEL
      const moisEnRetard = [];
      let statut = 'a_jour';
      
      if (totalPaye < montantAttendu) {
        statut = 'en_retard';
        for (let m = 1; m <= moisActuel; m++) {
          if (!moisPayes.has(m)) {
            moisEnRetard.push(m);
          }
        }
        // Si tous les mois semblent payés mais le montant est insuffisant
        if (moisEnRetard.length === 0 && totalPaye < montantAttendu) {
          const moisEquivalentsPayes = Math.floor(totalPaye / config.montantMensuel);
          for (let m = moisEquivalentsPayes + 1; m <= 12; m++) {
            moisEnRetard.push(m);
          }
        }
      }

      solidarites[config.nom] = {
        config,
        totalPaye,
        montantAttendu,
        montantRestant: Math.max(0, montantAttendu - totalPaye),
        moisPayes: Array.from(moisPayes).sort((a, b) => a - b),
        moisEnRetard,
        statut,
        paiements: paiementsType
      };
    }

    res.json({
      success: true,
      data: {
        membre,
        annee: anneeInt,
        moisActuel,
        solidarites
      }
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============== STATISTIQUES GLOBALES ==============

// @route   GET /api/solidarites/stats
// @desc    Obtenir les statistiques globales
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const { annee = new Date().getFullYear() } = req.query;
    const anneeInt = parseInt(annee);

    const membres = await Member.countDocuments({ isActive: true });
    const configs = await SolidariteConfig.find({ isActive: true });
    
    const stats = {
      annee: anneeInt,
      totalMembres: membres,
      solidarites: {}
    };

    for (const config of configs) {
      const paiements = await PaiementSolidarite.find({
        typeSolidarite: config.nom,
        annee: anneeInt,
        statut: 'paye'
      });

      const totalCollecte = paiements.reduce((sum, p) => sum + p.montant, 0);
      const montantAttenduTotal = config.montantAnnuel * membres;

      // Compter les membres à jour
      const membresAvecPaiements = new Set(paiements.map(p => p.membre.toString()));
      
      stats.solidarites[config.nom] = {
        libelle: config.libelle,
        montantMensuel: config.montantMensuel,
        montantAnnuel: config.montantAnnuel,
        totalCollecte,
        montantAttendu: montantAttenduTotal,
        tauxCollecte: montantAttenduTotal > 0 ? ((totalCollecte / montantAttenduTotal) * 100).toFixed(1) : 0,
        nombrePaiements: paiements.length,
        membresAyantPaye: membresAvecPaiements.size
      };
    }

    // Total global
    stats.totalGlobal = {
      totalCollecte: Object.values(stats.solidarites).reduce((sum, s) => sum + s.totalCollecte, 0),
      montantAttendu: Object.values(stats.solidarites).reduce((sum, s) => sum + s.montantAttendu, 0)
    };
    stats.totalGlobal.tauxCollecte = stats.totalGlobal.montantAttendu > 0 
      ? ((stats.totalGlobal.totalCollecte / stats.totalGlobal.montantAttendu) * 100).toFixed(1) 
      : 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// @route   POST /api/solidarites/init
// @desc    Initialiser les configurations par défaut
// @access  Private/Admin
router.post('/init', authorize('admin'), async (req, res) => {
  try {
    const defaultConfigs = [
      {
        nom: 'repas',
        libelle: 'Solidarité Repas',
        description: 'Contribution pour les repas lors des réunions',
        montantMensuel: 5000
      },
      {
        nom: 'membre',
        libelle: 'Solidarité Membre',
        description: 'Contribution de solidarité entre membres',
        montantMensuel: 10000
      },
      {
        nom: 'assurance_rapatriement',
        libelle: 'Assurance Rapatriement',
        description: 'Contribution pour l\'assurance rapatriement',
        montantMensuel: 15000
      }
    ];

    const created = [];
    for (const config of defaultConfigs) {
      const existing = await SolidariteConfig.findOne({ nom: config.nom });
      if (!existing) {
        const newConfig = await SolidariteConfig.create({
          ...config,
          createdBy: req.user._id
        });
        created.push(newConfig);
      }
    }

    const allConfigs = await SolidariteConfig.find();
    res.json({ 
      success: true, 
      message: `${created.length} configuration(s) créée(s)`,
      data: allConfigs 
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
