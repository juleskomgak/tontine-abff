# 🏦 Système de Banque Tontine

## Vue d'ensemble

Le système de **Banque Tontine** est un composant de gestion financière qui permet de suivre les fonds cotisés, les paiements de tours, les refus de tours, et la redistribution des fonds en fin de cycle.

---

## 🎯 Fonctionnalités

### 1. Suivi Financier Complet
- **Solde Total** : Vue en temps réel du solde disponible
- **Solde Cotisations** : Fonds provenant des cotisations des membres
- **Solde Refus** : Fonds des tours refusés par les bénéficiaires
- **Total Cotisé** : Cumul de toutes les cotisations reçues
- **Total Distribué** : Cumul de tous les paiements effectués

### 2. Gestion des Transactions
Chaque mouvement de fonds est enregistré avec :
- **Type** : cotisation, paiement_tour, refus_tour, redistribution, ajustement
- **Montant** : Montant de la transaction (positif ou négatif)
- **Description** : Détails de la transaction
- **Date** : Date de l'opération
- **Effectué par** : Utilisateur ayant effectué l'opération

### 3. Tours Refusés
Lorsqu'un membre refuse de recevoir son tour :
- Le montant est conservé dans un fonds séparé (`soldeRefus`)
- Les détails du refus sont enregistrés (membre, montant, raison, date)
- Le tour est marqué avec le statut `refuse`

### 4. Redistribution en Fin de Cycle
À la fin du cycle, les administrateurs peuvent :
- Voir tous les tours refusés
- Redistribuer les fonds aux membres désignés
- Enregistrer les bénéficiaires de la redistribution

---

## 💾 Structure de Données

### Modèle BanqueTontine

```javascript
{
  tontine: ObjectId,              // Référence à la tontine
  soldeTotal: Number,             // Solde total (cotisations + refus)
  soldeCotisations: Number,       // Solde disponible pour paiements
  soldeRefus: Number,             // Fonds des tours refusés
  totalCotise: Number,            // Total cotisé depuis le début
  totalDistribue: Number,         // Total distribué aux bénéficiaires
  totalRefus: Number,             // Total des refus
  
  toursRefuses: [{
    tour: ObjectId,               // Référence au tour
    beneficiaire: ObjectId,       // Membre ayant refusé
    montant: Number,              // Montant refusé
    dateRefus: Date,              // Date du refus
    raison: String,               // Raison du refus
    cycle: Number                 // Cycle concerné
  }],
  
  redistribue: Boolean,           // Redistribution effectuée ?
  dateRedistribution: Date,       // Date de redistribution
  
  beneficiairesRedistribution: [{
    membre: ObjectId,             // Bénéficiaire
    montant: Number,              // Montant reçu
    date: Date                    // Date de paiement
  }],
  
  transactions: [{
    type: String,                 // Type de transaction
    montant: Number,              // Montant
    description: String,          // Description
    tour: ObjectId,               // Référence tour (optionnel)
    contribution: ObjectId,       // Référence contribution (optionnel)
    membre: ObjectId,             // Membre concerné
    date: Date,                   // Date
    effectuePar: ObjectId         // Utilisateur
  }]
}
```

---

## 🔄 Flux de Fonctionnement

### 1. Enregistrement d'une Cotisation
```
Membre paie → Cotisation créée → Banque mise à jour
                                 ↓
                        soldeCotisations += montant
                        totalCotise += montant
                        Transaction créée
```

### 2. Paiement d'un Tour
```
Tour attribué → Bénéficiaire reçoit → Banque mise à jour
                                       ↓
                        soldeCotisations -= montant
                        totalDistribue += montant
                        Transaction créée
                        Tour marqué "payé"
```

### 3. Refus de Tour
```
Bénéficiaire refuse → Tour marqué "refusé" → Banque mise à jour
                                               ↓
                                  soldeRefus += montant
                                  totalRefus += montant
                                  Tour ajouté à toursRefuses[]
                                  Transaction créée
```

### 4. Redistribution
```
Admin sélectionne bénéficiaires → Montants alloués → Banque mise à jour
                                                       ↓
                                          soldeRefus -= total
                                          beneficiairesRedistribution[]
                                          redistribue = true
                                          Transactions créées
```

---

## 📡 API Endpoints

### GET /api/banque/tontine/:tontineId
Récupère la banque d'une tontine (créée automatiquement si inexistante)

**Réponse** :
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "tontine": {...},
    "soldeTotal": 1550000,
    "soldeCotisations": 1550000,
    "soldeRefus": 0,
    "totalCotise": 1550000,
    "totalDistribue": 0,
    "toursRefuses": [],
    "transactions": [...]
  }
}
```

### GET /api/banque/tontine/:tontineId/statistiques
Obtient les statistiques financières

**Réponse** :
```json
{
  "success": true,
  "data": {
    "soldeTotal": 1550000,
    "tauxDistribution": "0.00",
    "nombreToursRefuses": 0,
    "redistribue": false
  }
}
```

### POST /api/banque/tontine/:tontineId/cotisation
Enregistre une cotisation dans la banque

**Body** :
```json
{
  "contributionId": "...",
  "montant": 50000
}
```

### POST /api/banque/tontine/:tontineId/paiement-tour
Enregistre un paiement de tour

**Body** :
```json
{
  "tourId": "...",
  "montant": 250000
}
```

### POST /api/banque/tontine/:tontineId/refus-tour
Enregistre un refus de tour

**Body** :
```json
{
  "tourId": "...",
  "raison": "Raison du refus (optionnel)"
}
```

### POST /api/banque/tontine/:tontineId/redistribuer
Redistribue les fonds refusés (Admin uniquement)

**Body** :
```json
{
  "beneficiaires": [
    { "membreId": "...", "montant": 50000 },
    { "membreId": "...", "montant": 30000 }
  ]
}
```

### GET /api/banque
Liste toutes les banques (Admin uniquement)

---

## 🎨 Interface Utilisateur

### Page Banque Tontine

#### 1. Statistiques en Haut
- 6 cartes affichant les indicateurs clés
- Codes couleur pour identification rapide

#### 2. Onglet Transactions
- Historique complet de tous les mouvements
- Filtres par type de transaction
- Montants en vert (entrées) ou rouge (sorties)

#### 3. Onglet Tours Refusés
- Liste déroulante des tours refusés
- Détails : bénéficiaire, montant, raison, date
- Bouton "Redistribuer" si fonds disponibles

#### 4. Onglet Redistribution
- Statut de la redistribution
- Liste des bénéficiaires si redistribution effectuée
- Interface pour effectuer la redistribution

---

## 🔐 Permissions

### Lecture (Tous les utilisateurs connectés)
- Consulter la banque d'une tontine
- Voir les statistiques
- Consulter l'historique des transactions

### Écriture (Admin + Trésorier)
- Enregistrer cotisations
- Enregistrer paiements de tours
- Enregistrer refus de tours

### Administration (Admin uniquement)
- Redistribuer les fonds
- Voir toutes les banques

---

## 🛠️ Scripts Utilitaires

### sync-banques.js
Synchronise les banques avec les données existantes

```bash
node server/sync-banques.js
```

**Actions** :
1. Crée les banques manquantes
2. Importe toutes les cotisations reçues
3. Importe tous les tours payés
4. Calcule les soldes corrects
5. Génère l'historique des transactions

**Résultat** :
```
Connecté à MongoDB
Nombre de tontines: 1

--- Traitement de la tontine: Tontine ABFF 2025 ---
✅ Banque créée
  Cotisations: 31 - Total: 1550000 FCFA
  Tours payés: 0 - Total: 0 FCFA
  ✅ Solde final: 1550000 FCFA
     - Cotisations: 1550000 FCFA
     - Refus: 0 FCFA

✅ Synchronisation terminée avec succès!
```

---

## 📊 Cas d'Usage

### Scénario 1 : Cycle Normal
1. 5 membres cotisent 50,000 FCFA chacun → Solde : 250,000 FCFA
2. Premier bénéficiaire reçoit 250,000 FCFA → Solde : 0 FCFA
3. 5 membres cotisent à nouveau → Solde : 250,000 FCFA
4. Etc.

### Scénario 2 : Avec Refus
1. 5 membres cotisent 50,000 FCFA → Solde : 250,000 FCFA
2. Bénéficiaire 1 refuse son tour → soldeRefus : 250,000 FCFA
3. 5 membres cotisent → soldeCotisations : 250,000 FCFA
4. Bénéficiaire 2 reçoit 250,000 FCFA → soldeCotisations : 0 FCFA
5. En fin de cycle : Admin redistribue les 250,000 FCFA refusés

### Scénario 3 : Redistribution
À la fin du cycle, si 2 membres ont refusé (500,000 FCFA) :
- Option 1 : Partager équitablement entre tous (100,000 FCFA chacun)
- Option 2 : Redistribuer selon besoins spécifiques
- Option 3 : Reporter au cycle suivant

---

## ✅ Avantages du Système

### Transparence
- Tous les mouvements sont tracés
- Historique complet disponible
- Audit facilité

### Flexibilité
- Gestion des refus sans blocage
- Redistribution personnalisable
- Ajustements possibles

### Sécurité
- Vérification des soldes avant paiement
- Permissions par rôle
- Prévention des doubles paiements

### Équité
- Fonds refusés redistribués équitablement
- Transparence des décisions
- Historique consultable par tous

---

## 🔮 Évolutions Futures

1. **Alertes automatiques** 🔔
   - Notification quand solde bas
   - Rappel de redistribution en fin de cycle

2. **Rapports financiers** 📊
   - Export Excel/PDF
   - Graphiques d'évolution
   - Comparaison entre cycles

3. **Placement des fonds** 💰
   - Intérêts sur soldes non utilisés
   - Investissement temporaire

4. **Multi-devises** 🌍
   - Support de plusieurs devises
   - Conversion automatique

---

**Date de création** : 21 décembre 2024  
**Version** : 1.0  
**Statut** : ✅ Opérationnel
