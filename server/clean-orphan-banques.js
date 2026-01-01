/**
 * Script pour nettoyer les banques orphelines
 * 
 * Supprime les banques qui sont liées à des tontines qui n'existent plus
 * et réinitialise les soldes à 0 si aucune tontine n'existe
 * 
 * Usage: 
 *   - Pour la base locale: node clean-orphan-banques.js
 *   - Pour la production: MONGODB_URI="mongodb+srv://..." node clean-orphan-banques.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function cleanOrphanBanques() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tontine_abff';
    console.log('Connecting to:', mongoUri.substring(0, 30) + '...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    const BanqueTontine = require('./server/models/BanqueTontine');
    const BanqueCentrale = require('./server/models/BanqueCentrale');
    const Tontine = require('./server/models/Tontine');
    const Tour = require('./server/models/Tour');
    
    // Récupérer toutes les tontines existantes
    const tontines = await Tontine.find({});
    const tontineIds = tontines.map(t => t._id.toString());
    console.log('\n📊 Tontines existantes:', tontines.length);
    tontines.forEach(t => console.log('   -', t.nom));
    
    // Récupérer toutes les banques
    const banquesTontine = await BanqueTontine.find({});
    console.log('\n🏦 Banques tontine trouvées:', banquesTontine.length);
    
    let orphelinesSuprimees = 0;
    let banquesRecalculees = 0;
    
    for (const banque of banquesTontine) {
      const tontineIdStr = banque.tontine ? banque.tontine.toString() : null;
      
      if (!tontineIdStr || !tontineIds.includes(tontineIdStr)) {
        // Banque orpheline - supprimer
        console.log(`   ❌ Suppression banque orpheline: ${banque._id} (tontine: ${tontineIdStr})`);
        await BanqueTontine.findByIdAndDelete(banque._id);
        orphelinesSuprimees++;
      } else {
        // Recalculer les montants basés sur les tours
        const tours = await Tour.find({
          tontine: banque.tontine,
          statut: { $in: ['paye', 'refuse'] }
        });
        
        const totalCollecte = tours
          .filter(t => t.statut === 'paye')
          .reduce((sum, t) => sum + (t.montantRecu || 0), 0);
        
        const totalRefus = tours
          .filter(t => t.statut === 'refuse')
          .reduce((sum, t) => sum + (t.montantRecu || 0), 0);
        
        const anciensValeurs = {
          soldeTotal: banque.soldeTotal,
          totalCotise: banque.totalCotise,
          totalDistribue: banque.totalDistribue,
          totalRefus: banque.totalRefus
        };
        
        banque.totalCotise = totalCollecte;
        banque.totalDistribue = totalCollecte;
        banque.totalRefus = totalRefus;
        banque.soldeCotisations = 0;
        banque.soldeRefus = totalRefus;
        banque.soldeTotal = totalRefus;
        
        await banque.save();
        
        console.log(`   ✅ Recalcul banque ${banque._id}:`);
        console.log(`      Avant: soldeTotal=${anciensValeurs.soldeTotal}, totalCotise=${anciensValeurs.totalCotise}`);
        console.log(`      Après: soldeTotal=${banque.soldeTotal}, totalCotise=${banque.totalCotise}`);
        banquesRecalculees++;
      }
    }
    
    // Nettoyer aussi les banques centrales orphelines
    const banquesCentrale = await BanqueCentrale.find({ tontine: { $exists: true, $ne: null } });
    console.log('\n🏛️  Banques centrales avec tontine:', banquesCentrale.length);
    
    let centralesOrphelinesSuprimees = 0;
    for (const banque of banquesCentrale) {
      const tontineIdStr = banque.tontine.toString();
      if (!tontineIds.includes(tontineIdStr)) {
        console.log(`   ❌ Suppression banque centrale orpheline: ${banque._id}`);
        await BanqueCentrale.findByIdAndDelete(banque._id);
        centralesOrphelinesSuprimees++;
      }
    }
    
    console.log('\n📈 Résumé:');
    console.log(`   - Banques orphelines supprimées: ${orphelinesSuprimees}`);
    console.log(`   - Banques centrales orphelines supprimées: ${centralesOrphelinesSuprimees}`);
    console.log(`   - Banques recalculées: ${banquesRecalculees}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Nettoyage terminé');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

cleanOrphanBanques();
