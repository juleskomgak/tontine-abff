// Test de la logique de calcul de date de réception prévue
// Nouvelle logique : basée sur la date du Tour 1 du cycle

function calculateDateReception(dateDebut, numeroTour, frequence, dateTour1 = null) {
  let dateReceptionPrevue;

  if (numeroTour === 1 || !dateTour1) {
    // Tour 1 : utiliser la date actuelle ou la date de début (la plus récente)
    const maintenant = new Date();
    const debut = new Date(dateDebut);
    dateReceptionPrevue = debut > maintenant ? debut : maintenant;
  } else {
    // Tours suivants : calculer à partir du tour 1
    dateReceptionPrevue = new Date(dateTour1);
    let joursAjouter = 0;

    switch (frequence) {
      case 'hebdomadaire':
        joursAjouter = (numeroTour - 1) * 7;
        break;
      case 'bimensuel':
        joursAjouter = (numeroTour - 1) * 15;
        break;
      case 'mensuel':
      default:
        dateReceptionPrevue.setMonth(dateReceptionPrevue.getMonth() + (numeroTour - 1));
        joursAjouter = 0;
        break;
    }

    if (joursAjouter > 0) {
      dateReceptionPrevue.setDate(dateReceptionPrevue.getDate() + joursAjouter);
    }
  }

  return dateReceptionPrevue;
}

// Tests
console.log('=== Tests de calcul de date de réception prévue (Nouvelle logique) ===\n');

// Test 1: Tontine commençant dans le futur
const futurDate = new Date('2026-06-01');
const dateTour1Future = calculateDateReception(futurDate, 1, 'mensuel');
console.log('Test 1: Tontine future (01/06/2026)');
console.log('- Tour 1 mensuel (référence):', dateTour1Future.toLocaleDateString('fr-FR'));
console.log('- Tour 2 mensuel:', calculateDateReception(futurDate, 2, 'mensuel', dateTour1Future).toLocaleDateString('fr-FR'));
console.log('- Tour 3 mensuel:', calculateDateReception(futurDate, 3, 'mensuel', dateTour1Future).toLocaleDateString('fr-FR'));
console.log('- Tour 4 mensuel:', calculateDateReception(futurDate, 4, 'mensuel', dateTour1Future).toLocaleDateString('fr-FR'));
console.log();

// Test 2: Tontine commençant dans le passé
const pastDate = new Date('2025-01-01');
const dateTour1Past = calculateDateReception(pastDate, 1, 'mensuel');
console.log('Test 2: Tontine passée (01/01/2025)');
console.log('- Tour 1 mensuel (référence):', dateTour1Past.toLocaleDateString('fr-FR'));
console.log('- Tour 2 mensuel:', calculateDateReception(pastDate, 2, 'mensuel', dateTour1Past).toLocaleDateString('fr-FR'));
console.log('- Tour 3 mensuel:', calculateDateReception(pastDate, 3, 'mensuel', dateTour1Past).toLocaleDateString('fr-FR'));
console.log('Note: Tour 1 ajusté à aujourd\'hui, les suivants calculés à partir de là');
console.log();

// Test 3: Fréquences différentes
const testDate = new Date('2026-01-01');
const dateTour1Test = calculateDateReception(testDate, 1, 'hebdomadaire');
console.log('Test 3: Différentes fréquences (01/01/2026)');
console.log('- Tour 1 hebdomadaire (référence):', dateTour1Test.toLocaleDateString('fr-FR'));
console.log('- Tour 2 hebdomadaire (+7j):', calculateDateReception(testDate, 2, 'hebdomadaire', dateTour1Test).toLocaleDateString('fr-FR'));
console.log('- Tour 3 hebdomadaire (+14j):', calculateDateReception(testDate, 3, 'hebdomadaire', dateTour1Test).toLocaleDateString('fr-FR'));
console.log();

const dateTour1Bimensuel = calculateDateReception(testDate, 1, 'bimensuel');
console.log('- Tour 1 bimensuel (référence):', dateTour1Bimensuel.toLocaleDateString('fr-FR'));
console.log('- Tour 2 bimensuel (+15j):', calculateDateReception(testDate, 2, 'bimensuel', dateTour1Bimensuel).toLocaleDateString('fr-FR'));
console.log('- Tour 3 bimensuel (+30j):', calculateDateReception(testDate, 3, 'bimensuel', dateTour1Bimensuel).toLocaleDateString('fr-FR'));
console.log();

// Test 4: Cohérence des incréments mensuels
console.log('Test 4: Cohérence mensuelle depuis aujourd\'hui');
const maintenant = new Date();
const tour1Maintenant = calculateDateReception(pastDate, 1, 'mensuel');
console.log('- Tour 1 (référence):', tour1Maintenant.toLocaleDateString('fr-FR'));
console.log('- Tour 2 (+1 mois):', calculateDateReception(pastDate, 2, 'mensuel', tour1Maintenant).toLocaleDateString('fr-FR'));
console.log('- Tour 3 (+2 mois):', calculateDateReception(pastDate, 3, 'mensuel', tour1Maintenant).toLocaleDateString('fr-FR'));
console.log('- Tour 4 (+3 mois):', calculateDateReception(pastDate, 4, 'mensuel', tour1Maintenant).toLocaleDateString('fr-FR'));
console.log('- Tour 5 (+4 mois):', calculateDateReception(pastDate, 5, 'mensuel', tour1Maintenant).toLocaleDateString('fr-FR'));
console.log();

console.log('✅ Tous les tests terminés!');
console.log('\n💡 Logique: Les dates sont calculées à partir du Tour 1, pas de la date de début de la tontine');

