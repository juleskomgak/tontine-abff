const mongoose = require('mongoose');

// Schéma pour les catégories d'aide
const categorieAideSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom de la catégorie est requis'],
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['malheureux', 'heureux', 'chefferie', 'repas'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  montantDefaut: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Schéma pour les aides accordées
const aideAccordeeSchema = new mongoose.Schema({
  membre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Le membre bénéficiaire est requis']
  },
  categorie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CategorieAide',
    required: [true, 'La catégorie d\'aide est requise']
  },
  montant: {
    type: Number,
    required: [true, 'Le montant de l\'aide est requis'],
    min: [0, 'Le montant ne peut pas être négatif']
  },
  motif: {
    type: String,
    required: [true, 'Le motif de l\'aide est requis'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  dateEvenement: {
    type: Date
  },
  dateAccord: {
    type: Date,
    default: Date.now
  },
  statut: {
    type: String,
    enum: ['en_attente', 'approuve', 'paye', 'refuse', 'annule'],
    default: 'en_attente'
  },
  datePaiement: {
    type: Date
  },
  // Pour les aides repas - lien avec un tour
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour'
  },
  tontine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tontine'
  },
  // Historique des validations
  approuvePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dateApprobation: Date,
  payePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Source de débit
  sourceDebit: {
    type: String,
    enum: ['cotisation_membre', 'solidarite_repas', 'caisse_chefferie'],
    required: true
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  annee: {
    type: Number,
    default: () => new Date().getFullYear()
  }
}, { timestamps: true });

// Index pour les recherches
aideAccordeeSchema.index({ membre: 1, annee: 1 });
aideAccordeeSchema.index({ categorie: 1, annee: 1 });
aideAccordeeSchema.index({ statut: 1 });
aideAccordeeSchema.index({ sourceDebit: 1 });

const CategorieAide = mongoose.model('CategorieAide', categorieAideSchema);
const AideAccordee = mongoose.model('AideAccordee', aideAccordeeSchema);

module.exports = { CategorieAide, AideAccordee };
