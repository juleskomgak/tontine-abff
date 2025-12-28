const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  tontine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tontine',
    required: true
  },
  membre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  montant: {
    type: Number,
    required: [true, 'Le montant est requis'],
    min: [0, 'Le montant doit être positif']
  },
  datePaiement: {
    type: Date,
    default: Date.now
  },
  cycle: {
    type: Number,
    required: true
  },
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour'
  },
  numeroTour: {
    type: Number
  },
  methodePaiement: {
    type: String,
    enum: ['especes', 'mobile_money', 'virement', 'cheque'],
    default: 'especes'
  },
  referenceTransaction: {
    type: String,
    trim: true
  },
  statut: {
    type: String,
    enum: ['recu', 'en_attente', 'refuse'],
    default: 'recu'
  },
  notes: {
    type: String,
    trim: true
  },
  enregistrePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Index pour requêtes fréquentes
contributionSchema.index({ tontine: 1, cycle: 1 });
contributionSchema.index({ tontine: 1, tour: 1 });
contributionSchema.index({ membre: 1, datePaiement: -1 });

module.exports = mongoose.model('Contribution', contributionSchema);
