// Test de la logique de calcul des dates

function getPremierDimancheDuMois(date) {
  const d = new Date(date);
  d.setDate(1);
  const jourSemaine = d.getDay();
  if (jourSemaine === 0) return d;
  const joursJusquAuDimanche = 7 - jourSemaine;
  d.setDate(1 + joursJusquAuDimanche);
  return d;
}

// Simulation pour une tontine débutant le 01/06/2025
const dateDebut = new Date('2025-06-01');
const frequence = 'mensuel';

console.log('Date de début:', dateDebut.toLocaleDateString('fr-FR'));

// Simuler les tours 1, 2, 3, 4
for (let numeroTour = 1; numeroTour <= 4; numeroTour++) {
  let dateReceptionPrevue;
  
  if (numeroTour === 1) {
    dateReceptionPrevue = new Date(dateDebut);
  } else {
    dateReceptionPrevue = new Date(dateDebut);
    
    switch (frequence) {
      case 'mensuel':
        dateReceptionPrevue.setMonth(dateReceptionPrevue.getMonth() + (numeroTour - 1));
        break;
    }
    
    dateReceptionPrevue = getPremierDimancheDuMois(dateReceptionPrevue);
  }
  
  console.log(`Tour ${numeroTour}: ${dateReceptionPrevue.toLocaleDateString('fr-FR')} (${dateReceptionPrevue.toDateString()})`);
}
