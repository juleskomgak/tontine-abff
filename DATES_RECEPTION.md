# 📅 Dates de Réception des Tours

## Vue d'ensemble

Le système calcule automatiquement la **date de réception prévue** pour chaque bénéficiaire lors de l'attribution d'un tour. Cette date est calculée en fonction de la fréquence de la tontine et du numéro du tour.

---

## 🔢 Calcul de la Date

La date de réception prévue est calculée comme suit :

### Date de Base
- **Point de départ** : Date de début de la tontine (`dateDebut`)

### Calcul selon la Fréquence

#### 📆 Mensuelle (par défaut)
```
Date réception = Date début + (Numéro tour - 1) mois
```
**Exemple** :
- Date début : 1er janvier 2025
- Tour 1 : 1er janvier 2025
- Tour 2 : 1er février 2025
- Tour 3 : 1er mars 2025
- Tour 4 : 1er avril 2025
- ...

#### 📅 Bimensuelle
```
Date réception = Date début + (Numéro tour - 1) × 15 jours
```
**Exemple** :
- Date début : 1er janvier 2025
- Tour 1 : 1er janvier 2025
- Tour 2 : 16 janvier 2025
- Tour 3 : 31 janvier 2025
- Tour 4 : 15 février 2025
- ...

#### 🗓️ Hebdomadaire
```
Date réception = Date début + (Numéro tour - 1) × 7 jours
```
**Exemple** :
- Date début : 1er janvier 2025
- Tour 1 : 1er janvier 2025
- Tour 2 : 8 janvier 2025
- Tour 3 : 15 janvier 2025
- Tour 4 : 22 janvier 2025
- ...

---

## 💻 Implémentation Technique

### Backend - Modèle Tour

Le champ `dateReceptionPrevue` a été ajouté au modèle Tour :

```javascript
dateReceptionPrevue: {
  type: Date,
  required: true
}
```

### Backend - Calcul lors de l'Attribution

Le calcul est effectué automatiquement dans deux cas :

#### 1. Attribution Manuelle (`POST /api/tours`)
```javascript
// Compter le numéro du tour dans le cycle
const numeroTour = await Tour.countDocuments({
  tontine: req.body.tontine,
  cycle: req.body.cycle
}) + 1;

// Calculer la date selon la fréquence
const dateReceptionPrevue = new Date(tontine.dateDebut);

switch (tontine.frequence) {
  case 'hebdomadaire':
    dateReceptionPrevue.setDate(dateReceptionPrevue.getDate() + (numeroTour - 1) * 7);
    break;
  case 'bimensuel':
    dateReceptionPrevue.setDate(dateReceptionPrevue.getDate() + (numeroTour - 1) * 15);
    break;
  case 'mensuel':
  default:
    dateReceptionPrevue.setMonth(dateReceptionPrevue.getMonth() + (numeroTour - 1));
    break;
}

// Protection contre les dates dans le passé
const maintenant = new Date();
if (dateReceptionPrevue < maintenant) {
  dateReceptionPrevue.setTime(maintenant.getTime());
}
```

#### 2. Tirage Aléatoire (`POST /api/tours/tirage/:tontineId`)
Le même algorithme est appliqué lors d'un tirage aléatoire.

### Frontend - Interface TypeScript

Le modèle `Tour` a été mis à jour :

```typescript
export interface Tour {
  _id: string;
  tontine: Tontine | string;
  beneficiaire: Member | string;
  cycle: number;
  montantRecu: number;
  dateAttribution: Date;
  dateReceptionPrevue: Date;  // ✨ Nouveau champ
  datePaiement?: Date;
  modeAttribution: 'tirage_au_sort' | 'ordre_alphabetique' | 'manuel' | 'urgence';
  statut: 'attribue' | 'paye' | 'en_attente';
  notes?: string;
  attribuePar: User;
  createdAt?: Date;
  updatedAt?: Date;
}
```

---

## 🎨 Affichage dans l'Interface

### Page Gestion des Tours

La date de réception prévue apparaît dans une nouvelle colonne du tableau :

```
| Cycle | N° Tour | Bénéficiaire | Tontine | Montant | Mode | Date attribution | 📅 Date réception prévue | Statut | Actions |
```

**Style** :
- Icône calendrier 📅 (bleue)
- Formatage de date lisible
- Mise en évidence visuelle

### Page Bénéficiaires & Paiements

Dans les détails de chaque bénéficiaire, la date apparaît dans une zone mise en évidence :

```
┌─────────────────────────────────────────────┐
│ 📅 Date réception prévue: 01/02/2025       │
│ [Zone bleue avec bordure gauche]            │
└─────────────────────────────────────────────┘
```

---

## 🔄 Migration des Données Existantes

### Script de Migration

Un script `add-date-reception.js` a été créé pour ajouter les dates aux tours existants :

```bash
node server/add-date-reception.js
```

**Ce script** :
1. ✅ Se connecte à MongoDB
2. ✅ Trouve tous les tours sans `dateReceptionPrevue`
3. ✅ Calcule le numéro du tour dans son cycle
4. ✅ Calcule et enregistre la date selon la fréquence
5. ✅ Affiche les résultats pour chaque tour

**Résultat exemple** :
```
Connecté à MongoDB
Nombre de tours à mettre à jour: 6
Tour 694719332ad3cd1c09ca895b mis à jour - Numéro: 1, Date: 01/01/2025
Tour 694719602ad3cd1c09ca8976 mis à jour - Numéro: 2, Date: 01/02/2025
Tour 694719702ad3cd1c09ca8991 mis à jour - Numéro: 3, Date: 01/03/2025
Tour 6947197f2ad3cd1c09ca89ac mis à jour - Numéro: 4, Date: 01/04/2025
Tour 694719962ad3cd1c09ca89c7 mis à jour - Numéro: 5, Date: 01/05/2025
Tour 69471a4d2ad3cd1c09ca8ab7 mis à jour - Numéro: 6, Date: 01/06/2025
✅ Migration terminée avec succès!
```

### Script de Correction des Dates Passées

Un script `fix-past-dates.js` a été créé pour corriger les tours dont la date de réception prévue est dans le passé :

```bash
node server/fix-past-dates.js
```

**Ce script** :
1. ✅ Trouve tous les tours avec date de réception dans le passé
2. ✅ Ignore les tours déjà payés (statut = 'paye')
3. ✅ Met à jour la date à la date actuelle (ou date d'attribution si future)
4. ✅ Affiche un rapport détaillé des corrections

**Résultat exemple** :
```
Date actuelle: 20/12/2025

Nombre de tours avec dates dans le passé: 6

--- Corrections ---

Tour 694719332ad3cd1c09ca895b: Utilisation de la date actuelle
  - Ancienne date: 01/01/2025
  - Nouvelle date: 20/12/2025
  - Tontine: Tontine ABFF 2025
  - Cycle: 1, Statut: attribue

✅ Correction terminée avec succès!
```

---

## 🎯 Avantages

### Pour les Membres
- ✅ **Transparence** : Savoir exactement quand ils recevront leur tour
- ✅ **Planification** : Possibilité de planifier l'utilisation des fonds
- ✅ **Visibilité** : Calendrier clair des réceptions

### Pour les Gestionnaires
- ✅ **Organisation** : Meilleure gestion du calendrier de la tontine
- ✅ **Communication** : Information précise à communiquer aux membres
- ✅ **Suivi** : Détection facile des retards de paiement

### Pour le Système
- ✅ **Automatisation** : Calcul automatique, pas d'erreur humaine
- ✅ **Cohérence** : Dates cohérentes avec la fréquence de la tontine
- ✅ **Historique** : Conservation de la planification initiale

---

## 🔮 Évolutions Futures Possibles

1. **Notifications automatiques** 🔔
   - Rappels avant la date de réception prévue
   - Alertes en cas de retard

2. **Calendrier visuel** 📆
   - Vue calendrier des dates de réception
   - Export iCal pour agenda personnel

3. **Ajustements dynamiques** ⚙️
   - Modification des dates en cas d'événements exceptionnels
   - Gestion des jours fériés

4. **Statistiques** 📊
   - Analyse des délais réels vs prévus
   - Taux de ponctualité des paiements

---

## 📝 Notes Techniques

### Gestion des Cycles
- Le numéro du tour est calculé **par cycle**
- Permet à un membre de recevoir un tour dans chaque cycle
- L'index unique MongoDB inclut le cycle : `{ tontine, beneficiaire, cycle }`

### Précision des Dates
- Les dates mensuelles utilisent `setMonth()` pour gérer les mois de longueurs différentes
- Les dates hebdomadaires/bimensuelles ajoutent des jours fixes
- **Protection contre les dates passées** : Si la date calculée est dans le passé, le système utilise automatiquement la date actuelle
- Cela garantit que la date de réception prévue est toujours >= date de début de la tontine
- Pour les tours attribués en retard, la date de réception prévue sera la date d'attribution ou plus tard

### Base de Données
- Le champ est `required: true` pour tous les nouveaux tours
- Les tours existants ont été migrés avec le script

---

**Date de mise à jour** : 20 décembre 2024  
**Version** : 1.0
