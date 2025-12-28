# 📊 Statistiques de Collectes - Documentation Technique

## Vue d'ensemble

Cette fonctionnalité permet de visualiser les montants collectés par mois et par tontine, avec une distinction par méthode de paiement utilisant un code couleur.

---

## 🏗️ Architecture

### Backend

#### Route API : `/api/contributions/stats/monthly`
- **Méthode** : GET
- **Protection** : JWT authentification requise
- **Paramètres query** :
  - `year` (optionnel) : Année à analyser (défaut: année courante)
  - `tontineId` (optionnel) : ID d'une tontine spécifique (défaut: toutes)

#### Réponse
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "monthlyStats": [
      {
        "_id": {
          "month": 1,
          "methodePaiement": "especes",
          "tontine": "..."
        },
        "montantTotal": 250000,
        "nombrePaiements": 5
      }
    ],
    "tontineStats": [
      {
        "_id": {
          "tontine": { "_id": "...", "nom": "Tontine Mensuelle" },
          "methodePaiement": "mobile_money"
        },
        "montantTotal": 500000,
        "nombrePaiements": 10
      }
    ]
  }
}
```

#### Agrégation MongoDB
- Utilise `aggregate()` pour grouper par mois et méthode de paiement
- Filtre les contributions avec statut "recu"
- Population des informations de tontine

---

### Frontend

#### Composant : `CollectionsStatsComponent`
**Emplacement** : `client/src/app/pages/dashboard/collections-stats.component.ts`

#### Dépendances
- **Chart.js** : Bibliothèque de graphiques
- **Angular Material** : Composants UI (cards, select, spinner)
- **Services** :
  - `ContributionService` : Récupération des statistiques
  - `TontineService` : Liste des tontines

#### Structure des données

```typescript
interface MonthlyData {
  month: number;           // 1-12
  especes: number;         // Montant en FCFA
  mobile_money: number;
  virement: number;
  cheque: number;
}

interface TontineData {
  tontineId: string;
  tontineName: string;
  especes: number;
  mobile_money: number;
  virement: number;
  cheque: number;
  total: number;
}
```

---

## 🎨 Code Couleur

| Méthode de Paiement | Couleur | Code Hex |
|---------------------|---------|----------|
| Espèces | 🟢 Vert | #059669 |
| Mobile Money | 🔴 Rouge | #dc2626 |
| Virement | 🔵 Bleu | #2563eb |
| Chèque | 🟣 Violet | #7c3aed |

---

## 📈 Graphiques

### 1. Graphique Mensuel (Bar Chart Empilé)
- **Type** : Barres verticales empilées
- **Axes** :
  - X : Mois (Jan-Déc)
  - Y : Montants en FCFA
- **Datasets** : 4 (une par méthode de paiement)
- **Hauteur** : 350px

### 2. Graphique par Tontine (Horizontal Bar Chart)
- **Type** : Barres horizontales empilées
- **Axes** :
  - X : Montants en FCFA
  - Y : Noms des tontines
- **Datasets** : 4 (une par méthode de paiement)
- **Hauteur** : 350px

---

## 📋 Tableau Récapitulatif

### Colonnes
1. **Tontine** : Nom de la tontine
2. **Espèces** : Montant collecté en espèces (couleur verte)
3. **Mobile Money** : Montant via mobile money (couleur rouge)
4. **Virement** : Montant via virement (couleur bleue)
5. **Chèque** : Montant via chèque (couleur violette)
6. **Total** : Somme de toutes les méthodes

### Ligne de Total
- Affiche la somme de chaque colonne
- Style différent (fond gris-bleu)

---

## 🔧 Configuration

### Installation des dépendances
```bash
cd client
npm install chart.js ng2-charts
```

### Intégration dans le Dashboard
```typescript
// dashboard.component.ts
import { CollectionsStatsComponent } from './collections-stats.component';

@Component({
  imports: [
    // ... autres imports
    CollectionsStatsComponent
  ]
})
```

---

## 🚀 Utilisation

### 1. Démarrer le serveur
```bash
npm run server
```

### 2. Démarrer le frontend
```bash
cd client
ng serve
```

### 3. Accéder au Dashboard
- URL : http://localhost:4200/dashboard
- Se connecter avec un compte (admin, trésorier ou membre)
- Faire défiler jusqu'à la section "Statistiques des Collectes"

### 4. Utiliser les filtres
- Sélectionner une **année** pour voir les données de cette période
- Sélectionner une **tontine** spécifique ou "Toutes les tontines"
- Les graphiques et le tableau se mettent à jour automatiquement

---

## 📊 Cas d'Usage

### Scénario 1 : Analyse annuelle globale
- **Filtre** : Année 2025, Toutes les tontines
- **Résultat** : Vue d'ensemble de toutes les collectes de l'année

### Scénario 2 : Suivi d'une tontine spécifique
- **Filtre** : Année 2025, Tontine "Mensuelle 2025"
- **Résultat** : Performance de cette tontine uniquement

### Scénario 3 : Comparaison des méthodes de paiement
- **Utilisation** : Observer les couleurs dans les graphiques
- **Résultat** : Voir quelle méthode est la plus utilisée

---

## 🎯 Avantages

### Pour les Administrateurs
- Vue d'ensemble rapide des collectes
- Identification des tendances mensuelles
- Comparaison entre tontines

### Pour les Trésoriers
- Suivi précis des entrées d'argent
- Détail par méthode de paiement
- Export possible des données (future fonctionnalité)

### Pour les Membres
- Transparence sur les collectes
- Visualisation claire et intuitive

---

## 🔮 Améliorations Futures

- [ ] Export des données en Excel/PDF
- [ ] Graphiques circulaires pour les proportions
- [ ] Comparaison année par année
- [ ] Prévisions basées sur l'historique
- [ ] Filtres par période personnalisée
- [ ] Notifications sur les objectifs atteints

---

## 📞 Support Technique

Pour toute question :
- Backend : `server/routes/contributions.js` (ligne ~215)
- Frontend : `client/src/app/pages/dashboard/collections-stats.component.ts`
- Service : `client/src/app/services/contribution.service.ts`

**Date de création** : 20 décembre 2025
