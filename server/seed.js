require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Member = require('./models/Member');
const Tontine = require('./models/Tontine');
const Contribution = require('./models/Contribution');
const Tour = require('./models/Tour');
const BanqueCentrale = require('./models/BanqueCentrale');
const BanqueTontine = require('./models/BanqueTontine');

const seedDatabase = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connecté à MongoDB');

    // Supprimer les données existantes
    await User.deleteMany({});
    await Member.deleteMany({});
    await Tontine.deleteMany({});
    await Contribution.deleteMany({});
    await Tour.deleteMany({});
    await BanqueTontine.deleteMany({});
    await BanqueCentrale.deleteMany({});
    console.log('🗑️  Données existantes supprimées');

    // Créer les utilisateurs
    const admin = await User.create({
      nom: 'Administrateur',
      prenom: 'System',
      email: 'admin@tontine.com',
      password: 'Admin123!',
      telephone: '+237 6 99 99 99 99',
      role: 'admin'
    });

    const tresorier = await User.create({
      nom: 'Kamga',
      prenom: 'Jules',
      email: 'tresorier@tontine.com',
      password: 'Tresorier123!',
      telephone: '+237 6 88 88 88 88',
      role: 'tresorier'
    });

    const membre = await User.create({
      nom: 'Membre',
      prenom: 'Test',
      email: 'membre@tontine.com',
      password: 'Membre123!',
      telephone: '+237 6 77 77 77 77',
      role: 'membre'
    });

    console.log('✅ Utilisateurs créés');

    // Créer les membres
    const membres = await Member.create([
      {
        nom: 'Mbarga',
        prenom: 'Marie',
        email: 'marie.mbarga@email.com',
        telephone: '+237 6 70 00 00 01',
        adresse: 'Yaoundé, Cameroun',
        profession: 'Commerçante',
        user: membre._id,
        createdBy: admin._id
      },
      {
        nom: 'Nkomo',
        prenom: 'Jean',
        email: 'jean.nkomo@email.com',
        telephone: '+237 6 70 00 00 02',
        adresse: 'Douala, Cameroun',
        profession: 'Chauffeur',
        createdBy: admin._id
      },
      {
        nom: 'Fouda',
        prenom: 'Grace',
        email: 'grace.fouda@email.com',
        telephone: '+237 6 70 00 00 03',
        adresse: 'Yaoundé, Cameroun',
        profession: 'Enseignante',
        createdBy: admin._id
      },
      {
        nom: 'Essomba',
        prenom: 'Paul',
        email: 'paul.essomba@email.com',
        telephone: '+237 6 70 00 00 04',
        adresse: 'Bafoussam, Cameroun',
        profession: 'Mécanicien',
        createdBy: admin._id
      },
      {
        nom: 'Tchatchou',
        prenom: 'Antoinette',
        email: 'antoinette.tchatchou@email.com',
        telephone: '+237 6 70 00 00 05',
        adresse: 'Yaoundé, Cameroun',
        profession: 'Coiffeuse',
        createdBy: admin._id
      },
      {
        nom: 'Onana',
        prenom: 'François',
        email: 'francois.onana@email.com',
        telephone: '+237 6 70 00 00 06',
        adresse: 'Douala, Cameroun',
        profession: 'Informaticien',
        createdBy: admin._id
      }
    ]);

    console.log('✅ Membres créés');

    // Créer une tontine de démonstration
    const tontine = await Tontine.create({
      nom: 'Tontine ABFF 2025',
      description: 'Tontine mensuelle de l\'association ABFF',
      montantCotisation: 50000,
      frequence: 'mensuel',
      dateDebut: new Date('2025-01-01'),
      membres: membres.slice(0, 5).map(m => ({
        membre: m._id,
        dateAdhesion: new Date(),
        isActive: true
      })),
      statut: 'actif',
      cycleCourant: 1,
      createdBy: admin._id
    });

    console.log('✅ Tontine créée');

    // Créer des contributions de test pour différents mois et méthodes de paiement
    const methodesPayment = ['especes', 'mobile_money', 'virement', 'cheque'];
    const contributions = [];
    
    // Générer des contributions pour les 6 derniers mois
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const date = new Date();
      date.setMonth(date.getMonth() - monthOffset);
      
      // Pour chaque membre de la tontine
      for (let i = 0; i < 5; i++) {
        const methodePaiement = methodesPayment[Math.floor(Math.random() * methodesPayment.length)];
        
        contributions.push({
          tontine: tontine._id,
          membre: membres[i]._id,
          montant: 50000,
          cycle: 6 - monthOffset,
          datePaiement: date,
          methodePaiement: methodePaiement,
          statut: 'recu',
          enregistrePar: tresorier._id
        });
      }
    }

    await Contribution.create(contributions);
    console.log(`✅ ${contributions.length} contributions créées`);

    console.log('\n========================================');
    console.log('🎉 Base de données initialisée avec succès !');
    console.log('========================================\n');
    console.log('📧 Comptes de test :');
    console.log('\n👤 Administrateur:');
    console.log('   Email: admin@tontine.com');
    console.log('   Mot de passe: Admin123!');
    console.log('\n👤 Trésorier:');
    console.log('   Email: tresorier@tontine.com');
    console.log('   Mot de passe: Tresorier123!');
    console.log('\n👤 Membre:');
    console.log('   Email: membre@tontine.com');
    console.log('   Mot de passe: Membre123!');
    console.log('\n========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
