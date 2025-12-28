# Application de Gestion de Tontine ABFF 🇨🇲

Application web moderne pour gérer les tontines d'une association africaine.

## 🎯 Fonctionnalités

- 👥 **Gestion des membres** : Ajouter, modifier, supprimer des membres
- 💰 **Gestion des tontines** : Créer et gérer plusieurs cycles de tontine
- 📊 **Suivi des cotisations** : Enregistrer et suivre les paiements
- 🎲 **Attribution des tours** : Système de tirage au sort ou attribution manuelle
- 📈 **Tableau de bord** : Statistiques et visualisations en temps réel
- 📱 **Interface responsive** : Compatible mobile, tablette, desktop
- 🔐 **Authentification sécurisée** : JWT avec gestion des rôles
- 📄 **Rapports** : Génération de rapports PDF
- 🔔 **Notifications** : Alertes pour les paiements et événements

## 🛠 Technologies

### Backend
- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **JWT** pour l'authentification
- **Express Validator** pour la validation

### Frontend
- **Angular 17**
- **Angular Material**
- **RxJS**
- **Chart.js** pour les graphiques

## 📋 Prérequis

- Node.js (v18+)
- npm ou yarn
- MongoDB (v6+)
- Angular CLI (`npm install -g @angular/cli`)

## 🚀 Installation

### 1. Cloner et accéder au projet
```bash
cd tontine_abff
```

### 2. Installer les dépendances du serveur
```bash
npm install
```

### 3. Configurer les variables d'environnement
```bash
cp .env.example .env
```
Éditez le fichier `.env` avec vos configurations.

### 4. Créer l'application Angular
```bash
ng new client --routing --style=scss
cd client
npm install @angular/material @angular/cdk @angular/animations
npm install chart.js ng2-charts
npm install @auth0/angular-jwt
cd ..
```

### 5. Démarrer MongoDB
```bash
# Assurez-vous que MongoDB est en cours d'exécution
mongod
```

### 6. Lancer l'application
```bash
# En mode développement (serveur + client)
npm run dev

# Ou séparément :
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

## 🌐 Accès

- **Frontend** : http://localhost:4200
- **Backend API** : http://localhost:5000
- **MongoDB** : mongodb://localhost:27017/tontine_abff

## 📁 Structure du Projet

```
tontine_abff/
├── client/                     # Application Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Composants réutilisables
│   │   │   ├── pages/          # Pages de l'application
│   │   │   ├── services/       # Services Angular
│   │   │   ├── guards/         # Guards de route
│   │   │   ├── models/         # Interfaces TypeScript
│   │   │   ├── interceptors/   # HTTP Interceptors
│   │   │   └── shared/         # Modules partagés
│   │   ├── assets/             # Images, fonts, etc.
│   │   └── environments/       # Configuration environnement
│   ├── angular.json
│   └── package.json
├── server/                     # API Express
│   ├── models/                # Modèles Mongoose
│   │   ├── User.js
│   │   ├── Tontine.js
│   │   ├── Member.js
│   │   ├── Contribution.js
│   │   └── Tour.js
│   ├── routes/                # Routes API
│   │   ├── auth.js
│   │   ├── tontines.js
│   │   ├── members.js
│   │   └── contributions.js
│   ├── middleware/            # Middleware Express
│   │   ├── auth.js
│   │   └── validation.js
│   ├── config/               # Configuration
│   │   └── db.js
│   └── index.js              # Point d'entrée serveur
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🔑 Comptes par défaut

### Administrateur
- **Email** : admin@tontine.com
- **Mot de passe** : Admin123!

### Utilisateur
- **Email** : user@tontine.com
- **Mot de passe** : User123!

## 📖 Guide d'utilisation

### Créer une nouvelle tontine
1. Connectez-vous avec un compte administrateur
2. Cliquez sur "Nouvelle Tontine"
3. Remplissez les informations :
   - Nom de la tontine
   - Montant de la cotisation
   - Fréquence (hebdomadaire, mensuelle)
   - Date de début
4. Ajoutez les membres participants
5. Validez et lancez le cycle

### Enregistrer une cotisation
1. Sélectionnez la tontine active
2. Cliquez sur "Enregistrer paiement"
3. Sélectionnez le membre
4. Confirmez le montant
5. Enregistrez

### Attribuer un tour
1. Accédez à la tontine
2. Cliquez sur "Attribuer tour"
3. Choisissez le mode (tirage au sort ou manuel)
4. Validez l'attribution

## 🔒 Sécurité

- Authentification JWT avec refresh tokens
- Hashage des mots de passe avec bcrypt
- Validation des entrées côté serveur
- Protection CSRF
- Rate limiting sur les endpoints sensibles

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

ISC

## 👨‍💻 Auteur

Développé avec ❤️ pour les associations africaines

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur le dépôt.


========================================
🎉 Base de données initialisée avec succès !
========================================

📧 Comptes de test :

👤 Administrateur:
   Email: admin@tontine.com
   Mot de passe: Admin123!

👤 Trésorier:
   Email: tresorier@tontine.com
   Mot de passe: Tresorier123!

👤 Membre:
   Email: membre@tontine.com
   Mot de passe: Membre123!

========================================