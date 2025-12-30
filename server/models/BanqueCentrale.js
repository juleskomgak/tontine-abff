const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['cotisation', 'paiement_tour', 'refus_tour', 'redistribution', 'ajustement', 'paiement_solidarite', 'paiement_carte_codebaf'],
    required: true
  },
  montant: {
    type: Number,
    required: true
  },
  description: String,
  tontine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tontine'
  },
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour'
  },
  contribution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contribution'
  },
  paiementSolidarite: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaiementSolidarite'
  },
  paiementCarte: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaiementCarte'
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

const banqueCentraleSchema = new mongoose.Schema({
  // Optionally linked to a tontine; when absent the record represents global central bank
  tontine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tontine'
  },
  soldeTotal: {
    type: Number,
    default: 0
  },
  soldeCotisations: {
    type: Number,
    default: 0
  },
  soldeRefus: {
    type: Number,
    default: 0
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
  // Solidarités summary
  solidarites: [{
    typeSolidarite: String,
    totalCollecte: { type: Number, default: 0 },
    montantAttendu: { type: Number, default: 0 }
  }],
  // Cartes CODEBAF summary
  cartesCodebaf: {
    totalCartes: { type: Number, default: 0 },
    totalMontantAttendu: { type: Number, default: 0 },
    totalMontantPaye: { type: Number, default: 0 }
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

banqueCentraleSchema.pre('save', function(next) {
  this.soldeTotal = (this.soldeCotisations || 0) + (this.soldeRefus || 0);
  next();
});

banqueCentraleSchema.index({ tontine: 1 });

module.exports = mongoose.model('BanqueCentrale', banqueCentraleSchema);
