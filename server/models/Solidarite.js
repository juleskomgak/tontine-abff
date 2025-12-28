const mongoose = require('mongoose');

// Schéma pour définir les types de solidarité et leurs configurations
const SolidariteConfigSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom de la solidarité est requis'],
    enum: ['repas', 'membre', 'assurance_rapatriement'],
    unique: true
  },
  libelle: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  montantMensuel: {
    type: Number,
    required: [true, 'Le montant mensuel est requis'],
    min: 0
  },
  montantTrimestriel: {
    type: Number,
    min: 0
  },
  montantAnnuel: {
    type: Number,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculer automatiquement les montants trimestriels et annuels
SolidariteConfigSchema.pre('save', function(next) {
  if (!this.montantTrimestriel) {
    this.montantTrimestriel = this.montantMensuel * 3;
  }
  if (!this.montantAnnuel) {
    this.montantAnnuel = this.montantMensuel * 12;
  }
  next();
});

module.exports = mongoose.model('SolidariteConfig', SolidariteConfigSchema);
