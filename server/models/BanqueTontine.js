const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['cotisation', 'paiement_tour', 'refus_tour', 'redistribution', 'ajustement'],
    required: true
  },
  montant: {
    type: Number,
    required: true
  },
  description: String,
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour'
  },
  contribution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contribution'
  },
  membre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member'
  },
  date: {
    type: Date,
    default: Date.now
  },
  effectuePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { _id: true });

const banqueTontineSchema = new mongoose.Schema({
  tontine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tontine',
    required: true,
    unique: true
  },
  soldeTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  soldeCotisations: {
    type: Number,
    default: 0,
    min: 0
  },
  soldeRefus: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCotise: {
    type: Number,
    default: 0
  },
  totalDistribue: {
    type: Number,
    default: 0
  },
  totalRefus: {
    type: Number,
    default: 0
  },
  toursRefuses: [{
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tour',
      required: true
    },
    beneficiaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true
    },
    montant: {
      type: Number,
      required: true
    },
    dateRefus: {
      type: Date,
      default: Date.now
    },
    raison: String,
    cycle: {
      type: Number,
      required: true
    }
  }],
  redistribue: {
    type: Boolean,
    default: false
  },
  dateRedistribution: Date,
  beneficiairesRedistribution: [{
    membre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    montant: Number,
    date: Date
  }],
  transactions: [transactionSchema],
  notes: String
}, { timestamps: true });

// Calculer le solde total
banqueTontineSchema.pre('save', function(next) {
  this.soldeTotal = this.soldeCotisations + this.soldeRefus;
  next();
});

// Index pour recherche rapide
banqueTontineSchema.index({ tontine: 1 });

module.exports = mongoose.model('BanqueTontine', banqueTontineSchema);
