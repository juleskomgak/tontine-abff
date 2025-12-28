const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema({
  tontine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tontine',
    required: true
  },
  beneficiaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  cycle: {
    type: Number,
    required: true
  },
  numeroTour: {
    type: Number,
    required: true,
    default: 1
  },
  montantRecu: {
    type: Number,
    required: true
  },
  dateAttribution: {
    type: Date,
    default: Date.now
  },
  dateReceptionPrevue: {
    type: Date,
    required: true
  },
  datePaiement: {
    type: Date
  },
  modeAttribution: {
    type: String,
    enum: ['tirage_au_sort', 'ordre_alphabetique', 'manuel', 'urgence'],
    default: 'tirage_au_sort'
  },
  statut: {
    type: String,
    enum: ['attribue', 'paye', 'en_attente', 'refuse'],
    default: 'attribue'
  },
  notes: {
    type: String,
    trim: true
  },
  attribuePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Un membre ne peut avoir qu'un tour par cycle dans une tontine
tourSchema.index({ tontine: 1, beneficiaire: 1, cycle: 1 }, { unique: true });
tourSchema.index({ tontine: 1, cycle: 1 });

module.exports = mongoose.model('Tour', tourSchema);
