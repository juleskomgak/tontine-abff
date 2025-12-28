const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  telephone: {
    type: String,
    required: [true, 'Le téléphone est requis'],
    trim: true
  },
  adresse: {
    type: String,
    trim: true
  },
  numeroIdentite: {
    type: String,
    trim: true
  },
  profession: {
    type: String,
    trim: true
  },
  dateNaissance: {
    type: Date
  },
  photo: {
    type: String
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Index pour recherche rapide
memberSchema.index({ nom: 1, prenom: 1 });
memberSchema.index({ telephone: 1 });

module.exports = mongoose.model('Member', memberSchema);
