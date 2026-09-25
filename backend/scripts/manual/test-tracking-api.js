const axios = require('axios');

async function testTrackingAPI() {
  console.log('🔍 Test de l\'API de suivi de commandes...\n');

  try {
    // D'abord, récupérer une commande existante pour obtenir son code de tracking
    console.log('📦 Récupération des commandes...');
    
    try {
      const ordersResponse = await axios.get('http://localhost:9000/api/orders');
      console.log('❌ L\'API des commandes nécessite une authentification');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('🔐 API des commandes protégée (normal)');
      }
    }

    // Test avec un code de tracking fictif
    console.log('\n🧪 Test avec un code de tracking fictif...');
    
    try {
      const trackingResponse = await axios.get('http://localhost:9000/api/tracking/TRK-TEST-123');
      console.log('✅ Réponse de tracking:', trackingResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ API de tracking fonctionne (404 pour code inexistant)');
      } else {
        console.log('❌ Erreur inattendue:', error.response?.status, error.response?.data);
      }
    }

    // Test de recherche par email
    console.log('\n📧 Test de recherche par email...');
    
    try {
      const searchResponse = await axios.post('http://localhost:9000/api/tracking/search', {
        email: 'ahmedzekri143@gmail.com'
      });
      console.log('✅ Commandes trouvées:', searchResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Aucune commande trouvée pour cet email (normal si première commande)');
      } else {
        console.log('❌ Erreur:', error.response?.status, error.response?.data);
      }
    }

    // Instructions pour tester avec une vraie commande
    console.log('\n📋 Instructions pour tester avec une vraie commande:');
    console.log('1. Allez sur http://localhost:5173/admin/orders');
    console.log('2. Trouvez votre commande et notez le code TRK-...');
    console.log('3. Testez avec: curl http://localhost:9000/api/tracking/[VOTRE-CODE]');
    console.log('4. Ou allez sur http://localhost:5173/track-order');

    // Test de l'endpoint de santé
    console.log('\n🏥 Test de l\'endpoint de santé...');
    try {
      const healthResponse = await axios.get('http://localhost:9000/api/health');
      console.log('✅ Serveur en bonne santé:', healthResponse.data);
    } catch (error) {
      console.log('❌ Problème de santé du serveur:', error.message);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Solutions:');
      console.log('1. Vérifiez que le serveur backend est démarré');
      console.log('2. Vérifiez que le port 9000 est correct');
      console.log('3. Lancez: cd backend && npm run dev');
    }
  }
}

// Fonction pour tester avec un code de tracking spécifique
async function testSpecificTracking(trackingCode) {
  console.log(`\n🎯 Test avec le code: ${trackingCode}`);
  
  try {
    const response = await axios.get(`http://localhost:9000/api/tracking/${trackingCode}`);
    console.log('✅ Commande trouvée:');
    console.log('- Numéro:', response.data.orderNumber);
    console.log('- Statut:', response.data.status);
    console.log('- Client:', response.data.customer.name);
    console.log('- Total:', response.data.totalAmount, 'TND');
    console.log('- Créée le:', new Date(response.data.createdAt).toLocaleString());
    
    if (response.data.timeline) {
      console.log('- Timeline:', response.data.timeline.length, 'étapes');
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ Code de tracking non trouvé');
    } else {
      console.log('❌ Erreur:', error.response?.status, error.response?.data);
    }
  }
}

// Exécuter le test
testTrackingAPI();

// Si vous voulez tester un code spécifique, décommentez la ligne suivante et remplacez par votre code
// testSpecificTracking('TRK-1735659516825-ABC123');
