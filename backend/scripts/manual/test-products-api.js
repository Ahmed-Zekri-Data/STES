const axios = require('axios');

async function testProductsAPI() {
  console.log('🧪 Test de l\'API des produits...\n');

  try {
    // Test de l'API des produits
    console.log('📦 Récupération des produits...');
    const response = await axios.get('http://localhost:9000/api/products');
    
    console.log('✅ API des produits fonctionne !');
    console.log(`📊 Nombre de produits: ${response.data.products?.length || response.data.length || 0}`);
    
    const products = response.data.products || response.data;
    
    if (products.length > 0) {
      console.log('\n📋 Premiers produits:');
      products.slice(0, 3).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} - ${product.price} TND (ID: ${product._id})`);
      });
    } else {
      console.log('⚠️  Aucun produit trouvé dans la base de données');
      console.log('💡 Créez des produits dans l\'admin pour tester la création de commandes');
    }

    console.log('\n🔗 Structure de réponse:');
    console.log('- Type:', typeof response.data);
    console.log('- Clés:', Object.keys(response.data));
    
  } catch (error) {
    console.error('❌ Erreur lors du test de l\'API des produits:');
    console.error('- Message:', error.message);
    
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Data:', error.response.data);
    } else if (error.request) {
      console.error('- Pas de réponse du serveur');
      console.error('- Vérifiez que le serveur backend est démarré sur le port 9000');
    }
    
    console.log('\n🔧 Solutions possibles:');
    console.log('1. Démarrer le serveur backend: cd backend && npm run dev');
    console.log('2. Vérifier que MongoDB est en cours d\'exécution');
    console.log('3. Créer des produits dans l\'admin: http://localhost:5173/admin/products');
  }
}

testProductsAPI();
