# 🚀 Guide de Démarrage Rapide - Tontine ABFF

## ✅ État Actuel

### Backend (Serveur)
- ✅ MongoDB en cours d'exécution (Docker sur port 27017)
- ✅ Serveur Express en cours d'exécution (port 5000)
- ✅ Base de données initialisée avec des données de test

### Frontend (Angular)
- ✅ Application Angular compilée et prête
- ⏳ En cours d'exécution sur http://localhost:4200

---

## 🔑 Comptes de Test

Vous pouvez vous connecter avec ces comptes :

### 👨‍💼 Administrateur
- **Email** : admin@tontine.com
- **Mot de passe** : Admin123!
- **Permissions** : Accès complet

### 💼 Trésorier
- **Email** : tresorier@tontine.com
- **Mot de passe** : Tresorier123!
- **Permissions** : Gestion tontines, membres, cotisations

### 👤 Membre
- **Email** : membre@tontine.com
- **Mot de passe** : Membre123!
- **Permissions** : Consultation uniquement

---

## 🌐 URLs de l'Application

- **Frontend** : http://localhost:4200
- **Backend API** : http://localhost:5000
- **API Documentation** : http://localhost:5000/ (welcome page)

---

## 📱 Fonctionnalités Implémentées

### ✅ Authentification
- [x] Connexion / Déconnexion
- [x] Inscription
- [x] Gestion des rôles (admin, trésorier, membre)
- [x] Protection des routes avec guards

### ✅ Backend API
- [x] **Authentification** (`/api/auth`)
  - POST /login - Connexion
  - POST /register - Inscription
  - GET /me - Profil utilisateur
  - PUT /updatepassword - Changer mot de passe

- [x] **Membres** (`/api/members`)
  - GET / - Liste des membres
  - GET /:id - Détails d'un membre
  - POST / - Créer un membre
  - PUT /:id - Modifier un membre
  - DELETE /:id - Supprimer un membre

- [x] **Tontines** (`/api/tontines`)
  - GET / - Liste des tontines
  - GET /:id - Détails d'une tontine
  - POST / - Créer une tontine
  - PUT /:id - Modifier une tontine
  - PUT /:id/status - Changer le statut
  - POST /:id/members - Ajouter un membre
  - DELETE /:id - Supprimer une tontine

- [x] **Cotisations** (`/api/contributions`)
  - GET / - Liste des cotisations
  - GET /:id - Détails d'une cotisation
  - POST / - Enregistrer une cotisation
  - PUT /:id - Modifier une cotisation
  - GET /tontine/:id/stats - Statistiques
  - GET /stats/monthly - Statistiques mensuelles
  - DELETE /:id - Supprimer une cotisation

- [x] **Tours** (`/api/tours`)
  - GET / - Liste des tours
  - GET /:id - Détails d'un tour
  - POST / - Attribuer un tour
  - POST /tirage/:id - Tirage au sort
  - PUT /:id/status - Changer le statut
  - DELETE /:id - Supprimer un tour

### 🚧 Frontend Pages
- [x] Page de connexion
- [x] Page d'inscription
- [x] Dashboard (tableau de bord)
  - [x] Statistiques générales
  - [x] Activités récentes
  - [x] **Graphiques de collectes mensuelles** 📊
  - [x] **Statistiques par tontine et méthode de paiement** 💰
- [x] Gestion des membres
- [x] Gestion des tontines
  - [x] Création de tontines
  - [x] Modification de tontines
  - [x] Ajout de membres à une tontine
- [x] Gestion des cotisations
- [x] **Gestion des tours** 🎰
  - [x] **Tirage aléatoire automatique**
  - [x] **Attribution manuelle des tours**
  - [x] **Date de réception prévue** 📅 - Calcul automatique basé sur la fréquence
  - [x] Liste et suivi des tours attribués
- [x] **Gestion des bénéficiaires** 💰
  - [x] **Vue détaillée par tontine et par tour**
  - [x] **Suivi des paiements reçus par bénéficiaire**
  - [x] **Génération de rapports PDF individuels et globaux**
  - [x] **Statistiques de collecte et taux de paiement**
- [x] **Banque Tontine** 🏦
  - [x] **Suivi des fonds cotisés et distribués**
  - [x] **Gestion des tours refusés**
  - [x] **Redistribution des fonds en fin de cycle**
  - [x] **Historique complet des transactions**

---

## � Nouvelles Fonctionnalités - Statistiques de Collectes

### Vue d'ensemble
Le dashboard comprend désormais un tableau de bord complet des collectes avec visualisation graphique et tableaux récapitulatifs.

### Fonctionnalités

#### 📈 Graphiques Interactifs
- **Graphique mensuel** : Visualisation des collectes mois par mois
- **Graphique par tontine** : Comparaison des collectes entre tontines
- Graphiques empilés avec code couleur par méthode de paiement

#### 🎨 Codes Couleur des Méthodes de Paiement
- 🟢 **Espèces** : Vert (#059669)
- 🔴 **Mobile Money** : Rouge (#dc2626)
- 🔵 **Virement** : Bleu (#2563eb)
- 🟣 **Chèque** : Violet (#7c3aed)

#### 🔍 Filtres Disponibles
- **Par année** : Sélection de l'année à analyser (2023-2026)
- **Par tontine** : Vue globale ou par tontine spécifique

#### 📋 Tableau Récapitulatif
- Montants collectés par tontine et par méthode de paiement
- Totaux par méthode de paiement
- Total général de toutes les collectes

### Accès
Connectez-vous et accédez au **Dashboard** pour voir les statistiques de collectes en bas de la page.

---

## �🛠️ Commandes Utiles

### Démarrer l'application

```bash
# 1. Démarrer MongoDB (si Docker)
docker start mongodb

# 2. Démarrer le backend (depuis la racine du projet)
npm run server

# 3. Démarrer le frontend (dans un autre terminal)
cd client
ng serve
```

### Réinitialiser la base de données

```bash
node server/seed.js
```

### Arrêter l'application

```bash
# Arrêter le serveur backend : Ctrl+C dans le terminal
# Arrêter Angular : Ctrl+C dans le terminal
# Arrêter MongoDB Docker
docker stop mongodb
```

---

## 📊 Données de Test Disponibles

La base de données contient :
- **3 utilisateurs** (admin, trésorier, membre)
- **6 membres** de l'association
- **1 tontine active** avec 5 membres participants
- Montant de cotisation : 50 000 FCFA
- Fréquence : Mensuelle

---

## 🔧 Dépannage

### Le frontend ne se connecte pas au backend
- Vérifiez que le backend tourne sur http://localhost:5000
- Vérifiez le fichier `client/src/environments/environment.ts`

### Erreur de connexion MongoDB
```bash
# Vérifier que MongoDB tourne
docker ps | grep mongodb

# Si pas actif, démarrer
docker start mongodb
```

### Port 5000 déjà utilisé
```bash
# Changer le PORT dans .env
PORT=5001
```

---

## 📚 Prochaines Étapes

Pour continuer le développement :

1. **Compléter les pages frontend** :
   - Liste et gestion des membres
   - Formulaire de création de tontine
   - Enregistrement des cotisations
   - Système de tirage au sort

2. **Ajouter des fonctionnalités** :
   - Notifications
   - Génération de rapports PDF
   - Graphiques et statistiques
   - Export Excel
   - Historique des transactions

3. **Améliorer l'UX** :
   - Filtres et recherche
   - Pagination
   - Validation avancée
   - Messages de confirmation

---

## 💡 Astuces

- Utilisez le compte **admin@tontine.com** pour tester toutes les fonctionnalités
- Les mots de passe de test sont : Admin123!, Tresorier123!, Membre123!
- L'API est documentée et testable via des outils comme Postman
- Les routes sont protégées par JWT et rôles

---

## 📞 Support

Pour toute question sur le code :
- Consultez les fichiers dans `server/routes/` pour l'API
- Consultez les fichiers dans `client/src/app/pages/` pour le frontend
- Vérifiez les models dans `server/models/` pour la structure de données

**Bon développement ! 🚀**
