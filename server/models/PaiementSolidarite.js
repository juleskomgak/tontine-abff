const mongoose = require('mongoose');

const PaiementSolidariteSchema = new mongoose.Schema({
  membre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Le membre est requis']
  },
  typeSolidarite: {
    type: String,
    required: [true, 'Le type de solidarité est requis'],
    enum: ['repas', 'membre', 'assurance_rapatriement']
  },
  montant: {
    type: Number,
    required: [true, 'Le montant est requis'],
    min: 0
  },
  frequence: {
    type: String,
    required: [true, 'La fréquence est requise'],
    enum: ['mensuel', 'trimestriel', 'annuel']
  },
  periodeDebut: {
    type: Date,
    required: [true, 'La période de début est requise']
  },
  periodeFin: {
    type: Date,
    required: [true, 'La période de fin est requise']
  },
  datePaiement: {
    type: Date,
    default: Date.now
  },
  annee: {
    type: Number,
    required: true
  },
  mois: {
    type: Number // 1-12 pour mensuel, null pour autres
  },
  trimestre: {
    type: Number // 1-4 pour trimestriel, null pour autres
  },
  methodePaiement: {
    type: String,
    enum: ['especes', 'mobile_money', 'virement', 'cheque'],
    default: 'especes'
  },
  referenceTransaction: {
    type: String
  },
  statut: {
    type: String,
    enum: ['paye', 'en_attente', 'annule'],
    default: 'paye'
  },
  notes: {
    type: String
  },
  enregistrePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index pour éviter les doublons de paiement
PaiementSolidariteSchema.index(
  { membre: 1, typeSolidarite: 1, annee: 1, mois: 1, trimestre: 1 },
  { unique: true, sparse: true }
);

// Méthode statique pour obtenir le statut d'un membre
PaiementSolidariteSchema.statics.getStatutMembre = async function(membreId, typeSolidarite, annee) {
  const paiements = await this.find({
    membre: membreId,
    typeSolidarite,
    annee,
    statut: 'paye'
  }).sort({ mois: 1, trimestre: 1 });
  
  return paiements;
};

module.exports = mongoose.model('PaiementSolidarite', PaiementSolidariteSchema);
