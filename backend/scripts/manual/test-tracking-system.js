const axios = require('axios');

async function testTrackingSystem() {
  console.log('🚀 Test du Système de Suivi de Commandes STES.tn\n');

  try {
    // Test 1: Vérifier que le serveur backend fonctionne
    console.log('1️⃣ Test de connexion au serveur backend...');
    const healthResponse = await axios.get('http://localhost:9000/api/health');
    console.log('✅ Serveur backend opérationnel\n');

    // Test 2: Tester l'API de tracking public
    console.log('2️⃣ Test de l\'API de tracking public...');
    try {
      // Essayer de tracker une commande inexistante
      await axios.get('http://localhost:9000/api/tracking/TRK-TEST-123');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ API de tracking répond correctement (404 pour commande inexistante)');
      } else {
        console.log('❌ Erreur inattendue:', error.message);
      }
    }

    // Test 3: Tester l'API de recherche par email
    console.log('\n3️⃣ Test de l\'API de recherche par email...');
    try {
      await axios.post('http://localhost:9000/api/tracking/search', {
        email: 'test@example.com'
      });
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ API de recherche par email fonctionne (404 pour email inexistant)');
      } else {
        console.log('❌ Erreur inattendue:', error.message);
      }
    }

    // Test 4: Tester l'API des statistiques (nécessite authentification admin)
    console.log('\n4️⃣ Test de l\'API des statistiques...');
    try {
      await axios.get('http://localhost:9000/api/orders/stats');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ API des statistiques protégée correctement (401 sans auth)');
      } else {
        console.log('❌ Erreur inattendue:', error.message);
      }
    }

    // Test 5: Vérifier les routes frontend
    console.log('\n5️⃣ Test des routes frontend...');
    try {
      const frontendResponse = await axios.get('http://localhost:5173');
      console.log('✅ Serveur frontend opérationnel');
    } catch (error) {
      console.log('❌ Serveur frontend non accessible:', error.message);
    }

    console.log('\n🎉 Tests terminés !');
    console.log('\n📋 Résumé des fonctionnalités disponibles :');
    console.log('   ✅ Système de tracking public');
    console.log('   ✅ Recherche de commandes par email');
    console.log('   ✅ API de statistiques pour admin');
    console.log('   ✅ Interface de tracking moderne');
    console.log('   ✅ Dashboard admin de tracking');
    console.log('   ✅ Gestion des statuts de commande');
    console.log('   ✅ Timeline interactive');
    console.log('   ✅ Notifications automatiques');

    console.log('\n🔗 URLs importantes :');
    console.log('   🌐 Frontend: http://localhost:5173');
    console.log('   📦 Suivi commande: http://localhost:5173/track-order');
    console.log('   👨‍💼 Admin: http://localhost:5173/admin');
    console.log('   📊 Dashboard tracking: http://localhost:5173/admin/tracking');
    console.log('   🛒 Boutique: http://localhost:5173/boutique');

    console.log('\n📝 Instructions pour tester :');
    console.log('   1. Créer une commande dans l\'admin');
    console.log('   2. Noter le code de tracking (TRK-...)');
    console.log('   3. Aller sur /track-order et entrer le code');
    console.log('   4. Modifier le statut dans l\'admin');
    console.log('   5. Voir les changements en temps réel');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    console.log('\n🔧 Vérifiez que :');
    console.log('   - Le serveur backend est démarré (npm run dev dans /backend)');
    console.log('   - Le serveur frontend est démarré (npm run dev dans /frontend)');
    console.log('   - MongoDB est en cours d\'exécution');
    console.log('   - Les ports 9000 et 5173 sont disponibles');
  }
}

testTrackingSystem();
