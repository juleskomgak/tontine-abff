const mongoose = require('mongoose');

const paiementSchema = new mongoose.Schema({
  montant: {
    type: Number,
    required: true,
    min: 0
  },
  datePaiement: {
    type: Date,
    default: Date.now
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
  notes: String,
  enregistrePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { _id: true, timestamps: true });

const carteCodebafSchema = new mongoose.Schema({
  membre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Le membre est requis']
  },
  annee: {
    type: Number,
    required: [true, 'L\'année est requise']
  },
  typeCarte: {
    type: String,
    enum: ['classique', 'bronze', 'silver', 'gold'],
    default: 'classique'
  },
  montantTotal: {
    type: Number,
    required: [true, 'Le montant total est requis'],
    min: 0
  },
  frequencePaiement: {
    type: String,
    enum: ['annuel', 'trimestriel', 'mensuel'],
    default: 'annuel'
  },
  montantParEcheance: {
    type: Number,
    min: 0
  },
  nombreEcheances: {
    type: Number,
    default: 1
  },
  paiements: [paiementSchema],
  montantPaye: {
    type: Number,
    default: 0
  },
  montantRestant: {
    type: Number,
    default: 0
  },
  statut: {
    type: String,
    enum: ['en_cours', 'complete', 'annule'],
    default: 'en_cours'
  },
  dateDebut: {
    type: Date,
    default: Date.now
  },
  dateFin: {
    type: Date
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Calculer le type de carte selon le montant
carteCodebafSchema.statics.determinerTypeCarte = function(montant) {
  if (montant >= 1000000) return 'gold';
  if (montant >= 500000) return 'silver';
  if (montant >= 100000) return 'bronze';
  return 'classique';
};

// Calculer le nombre d'échéances selon la fréquence
carteCodebafSchema.statics.calculerNombreEcheances = function(frequence) {
  switch (frequence) {
    case 'mensuel': return 12;
    case 'trimestriel': return 4;
    case 'annuel': 
    default: return 1;
  }
};

// Pré-save hook pour calculer les montants
carteCodebafSchema.pre('save', function(next) {
  // Déterminer le type de carte
  this.typeCarte = this.constructor.determinerTypeCarte(this.montantTotal);
  
  // Calculer le nombre d'échéances
  this.nombreEcheances = this.constructor.calculerNombreEcheances(this.frequencePaiement);
  
  // Calculer le montant par échéance
  this.montantParEcheance = Math.ceil(this.montantTotal / this.nombreEcheances);
  // Calculer le montant payé et restant en forçant les valeurs numériques
  this.montantPaye = this.paiements.reduce((sum, p) => sum + Number(p.montant || 0), 0);
  this.montantRestant = Math.max(0, this.montantTotal - this.montantPaye);

  /*
    Statut handling rules:
    - If fully paid (montantPaye >= montantTotal) -> set to 'complete'
    - Preserve explicit 'annule' status
    - If caller explicitly modified `statut`, respect it (unless invalid)
    - Otherwise default to 'en_cours' when not complete nor cancelled
  */
  if (this.montantPaye >= this.montantTotal) {
    this.statut = 'complete';
  } else if (this.statut === 'annule') {
    // keep cancelled status
  } else {
    if (!this.isModified('statut')) {
      this.statut = 'en_cours';
    } else {
      if (!['en_cours', 'complete', 'annule'].includes(this.statut)) {
        this.statut = 'en_cours';
      }
    }
  }
  
  // Calculer la date de fin (1 an après le début)
  if (!this.dateFin) {
    const debut = new Date(this.dateDebut);
    this.dateFin = new Date(debut.getFullYear() + 1, debut.getMonth(), debut.getDate());
  }
  
  next();
});

// Index pour recherche rapide
carteCodebafSchema.index({ membre: 1, annee: 1 }, { unique: true });
carteCodebafSchema.index({ annee: 1 });
carteCodebafSchema.index({ statut: 1 });
carteCodebafSchema.index({ typeCarte: 1 });

module.exports = mongoose.model('CarteCodebaf', carteCodebafSchema);
