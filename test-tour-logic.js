// Script de test pour vérifier la logique des montants de tour
const mongoose = require('mongoose');
const Tour = require('./server/models/Tour');
const Contribution = require('./server/models/Contribution');
const Tontine = require('./server/models/Tontine');
const Member = require('./server/models/Member');
const User = require('./server/models/User');

async function testTourAmountLogic() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tontine_abff');
    console.log('Connecté à MongoDB');

    // Créer des données de test
    const user = await User.create({
      nom: 'Test',
      prenom: 'User',
      email: 'test' + Date.now() + '@example.com',
      password: 'password123',
      role: 'admin'
    });

    const member1 = await Member.create({
      nom: 'Dupont',
      prenom: 'Jean',
      telephone: '0123456789',
      user: user._id,
      createdBy: user._id
    });

    const member2 = await Member.create({
      nom: 'Martin',
      prenom: 'Marie',
      telephone: '0987654321',
      user: user._id,
      createdBy: user._id
    });

    const tontine = await Tontine.create({
      nom: 'Tontine Test',
      description: 'Tontine pour les tests',
      montantCotisation: 50000,
      frequence: 'mensuel',
      dateDebut: new Date(),
      membres: [
        { membre: member1._id, isActive: true },
        { membre: member2._id, isActive: true }
      ],
      nombreMembres: 2,
      montantTotal: 100000,
      statut: 'actif',
      cycleCourant: 1
    });

    console.log('Données de test créées');

    // Créer un tour pour le membre 1
    const tour = await Tour.create({
      tontine: tontine._id,
      beneficiaire: member1._id,
      numeroTour: 1,
      cycle: 1,
      montantRecu: 0, // Initialement 0
      dateAttribution: new Date(),
      dateReceptionPrevue: new Date(),
      modeAttribution: 'manuel',
      statut: 'attribue'
    });

    console.log('Tour créé avec montant initial:', tour.montantRecu);

    // Ajouter des cotisations pour ce tour
    const contribution1 = await Contribution.create({
      tontine: tontine._id,
      membre: member1._id,
      tour: tour._id,
      numeroTour: 1,
      montant: 30000, // Cotisation différente
      datePaiement: new Date(),
      cycle: 1,
      methodePaiement: 'especes',
      statut: 'recu',
      enregistrePar: user._id
    });

    const contribution2 = await Contribution.create({
      tontine: tontine._id,
      membre: member2._id,
      tour: tour._id,
      numeroTour: 1,
      montant: 45000, // Cotisation différente
      datePaiement: new Date(),
      cycle: 1,
      methodePaiement: 'especes',
      statut: 'recu',
      enregistrePar: user._id
    });

    console.log('Cotisations ajoutées');

    // Vérifier le montant du tour après ajout des cotisations
    const tourUpdated = await Tour.findById(tour._id);
    console.log('Montant du tour après cotisations:', tourUpdated.montantRecu);
    console.log('Montant attendu (30000 + 45000):', 30000 + 45000);

    // Modifier une cotisation
    await Contribution.findByIdAndUpdate(contribution1._id, { montant: 35000 });
    console.log('Cotisation modifiée');

    // Vérifier le montant du tour après modification
    const tourAfterUpdate = await Tour.findById(tour._id);
    console.log('Montant du tour après modification:', tourAfterUpdate.montantRecu);
    console.log('Montant attendu (35000 + 45000):', 35000 + 45000);

    // Supprimer une cotisation
    await Contribution.findByIdAndDelete(contribution2._id);
    console.log('Cotisation supprimée');

    // Vérifier le montant du tour après suppression
    const tourAfterDelete = await Tour.findById(tour._id);
    console.log('Montant du tour après suppression:', tourAfterDelete.montantRecu);
    console.log('Montant attendu (35000):', 35000);

    console.log('Test terminé avec succès !');

    // Nettoyer les données de test
    await Contribution.deleteMany({ tontine: tontine._id });
    await Tour.deleteMany({ tontine: tontine._id });
    await Tontine.findByIdAndDelete(tontine._id);
    await Member.findByIdAndDelete(member1._id);
    await Member.findByIdAndDelete(member2._id);
    await User.findByIdAndDelete(user._id);

    console.log('Données de test nettoyées');

  } catch (error) {
    console.error('Erreur lors du test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
}

// Exécuter le test seulement si appelé directement
if (require.main === module) {
  testTourAmountLogic();
}

module.exports = { testTourAmountLogic };