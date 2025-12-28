const mongoose = require('mongoose');

const tontineSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom de la tontine est requis'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  montantCotisation: {
    type: Number,
    required: [true, 'Le montant de la cotisation est requis'],
    min: [0, 'Le montant doit être positif']
  },
  frequence: {
    type: String,
    enum: ['hebdomadaire', 'bimensuel', 'mensuel'],
    default: 'mensuel'
  },
  dateDebut: {
    type: Date,
    required: [true, 'La date de début est requise']
  },
  dateFin: {
    type: Date
  },
  membres: [{
    membre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true
    },
    dateAdhesion: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  nombreMembres: {
    type: Number,
    default: 0
  },
  montantTotal: {
    type: Number,
    default: 0
  },
  statut: {
    type: String,
    enum: ['planifie', 'actif', 'termine', 'suspendu'],
    default: 'planifie'
  },
  cycleCourant: {
    type: Number,
    default: 1
  },
  totalCycles: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Calculer le nombre de membres et montant total
tontineSchema.pre('save', function(next) {
  const activeMembers = this.membres.filter(m => m.isActive).length;
  this.nombreMembres = activeMembers;
  this.montantTotal = activeMembers * this.montantCotisation;
  this.totalCycles = activeMembers;
  
  console.log('Hook pre(save) - Membres actifs:', activeMembers);
  console.log('Hook pre(save) - Nombre de membres:', this.nombreMembres);
  console.log('Hook pre(save) - Montant total:', this.montantTotal);
  
  next();
});

module.exports = mongoose.model('Tontine', tontineSchema);
