// Test de la version V4 du calcul de dates
// V4: Utilise getDatePartsEurope pour cohérence timezone

function getDatePartsEurope(date) {
  const d = new Date(date);
  // Ajouter 2h pour simuler Europe/Paris
  const europeOffset = 2 * 60 * 60 * 1000;
  const europeDate = new Date(d.getTime() + europeOffset);
  return {
    annee: europeDate.getUTCFullYear(),
    mois: europeDate.getUTCMonth(),
    jour: europeDate.getUTCDate()
  };
}

function getPremierDimancheDuMoisPourAnneeEtMois(annee, mois) {
  const premierDuMois = new Date(Date.UTC(annee, mois, 1, 12, 0, 0));
  const jourSemaine = premierDuMois.getUTCDay();
  
  if (jourSemaine === 0) {
    return premierDuMois;
  }
  
  const joursJusquAuDimanche = 7 - jourSemaine;
  premierDuMois.setUTCDate(1 + joursJusquAuDimanche);
  
  return premierDuMois;
}

function calculerDateReceptionTour(dateDebutTontine, numeroTour, frequence) {
  if (numeroTour === 1) {
    return new Date(dateDebutTontine);
  }
  
  const { annee: anneeDebut, mois: moisDebut } = getDatePartsEurope(dateDebutTontine);
  
  let dateReception;
  
  switch (frequence) {
    case 'hebdomadaire':
      dateReception = new Date(dateDebutTontine);
      dateReception.setDate(dateReception.getDate() + (numeroTour - 1) * 7);
      break;
    case 'bimensuel':
      dateReception = new Date(dateDebutTontine);
      dateReception.setDate(dateReception.getDate() + (numeroTour - 1) * 15);
      break;
    case 'mensuel':
    default:
      const totalMois = moisDebut + (numeroTour - 1);
      const anneeCible = anneeDebut + Math.floor(totalMois / 12);
      const moisCible = totalMois % 12;
      
      dateReception = getPremierDimancheDuMoisPourAnneeEtMois(anneeCible, moisCible);
      break;
  }
  
  return dateReception;
}

// Test avec la date de début de tontine Grand-Cahier
const tontineDebut = new Date('2025-05-31T22:00:00.000Z');
console.log('=== TEST CALCUL DATE TOUR V4 ===');
console.log('Date début tontine (UTC):', tontineDebut.toISOString());

const partsEurope = getDatePartsEurope(tontineDebut);
console.log('Date en Europe:', partsEurope.jour + '/' + (partsEurope.mois + 1) + '/' + partsEurope.annee);

console.log('\n--- Résultats attendus ---');
console.log('Tour 1: 01/06/2025 (date de début, 1er juin)');
console.log('Tour 2: 06/07/2025 (premier dimanche de juillet)');
console.log('Tour 3: 03/08/2025 (premier dimanche août)');
console.log('Tour 4: 07/09/2025 (premier dimanche septembre)');

console.log('\n--- Résultats calculés ---');
for (let numeroTour = 1; numeroTour <= 5; numeroTour++) {
  const dateReception = calculerDateReceptionTour(tontineDebut, numeroTour, 'mensuel');
  const jour = dateReception.getUTCDate().toString().padStart(2, '0');
  const mois = (dateReception.getUTCMonth() + 1).toString().padStart(2, '0');
  const annee = dateReception.getUTCFullYear();
  console.log('Tour ' + numeroTour + ': ' + jour + '/' + mois + '/' + annee + ' (' + dateReception.toDateString() + ')');
}
