// Simuler exactement ce que fait le serveur
function getPremierDimancheDuMois(date) {
  const d = new Date(date);
  d.setDate(1);
  const jourSemaine = d.getDay();
  if (jourSemaine === 0) return d;
  const joursJusquAuDimanche = 7 - jourSemaine;
  d.setDate(1 + joursJusquAuDimanche);
  return d;
}

// Date de début exacte de la tontine (en UTC comme stockée dans MongoDB)
const dateDebut = new Date('2025-05-31T22:00:00.000Z');
console.log('Date début (UTC):', dateDebut.toISOString());
console.log('Date début (locale):', dateDebut.toString());

// Tour 2 : ajouter 1 mois
const tour2 = new Date(dateDebut);
tour2.setMonth(tour2.getMonth() + 1);
console.log('\nTour 2 après setMonth:', tour2.toString());
console.log('Tour 2 premier dimanche:', getPremierDimancheDuMois(tour2).toString());

// Juillet 2025
console.log('\n--- Calendrier Juillet 2025 ---');
const juillet = new Date('2025-07-01');
console.log('1er juillet:', juillet.toDateString(), '- jour:', juillet.getDay());
const dimJuillet = getPremierDimancheDuMois(juillet);
console.log('Premier dimanche de juillet:', dimJuillet.toDateString());
