const axios = require('axios');

async function testCreateOrder() {
  console.log('🧪 Test de création de commande...\n');

  try {
    // D'abord, récupérer un produit pour le test
    console.log('📦 Récupération des produits...');
    const productsResponse = await axios.get('http://localhost:9000/api/products');
    const products = productsResponse.data.products || productsResponse.data;
    
    if (products.length === 0) {
      console.log('❌ Aucun produit disponible pour le test');
      return;
    }

    const testProduct = products[0];
    console.log(`✅ Produit de test: ${testProduct.name} (${testProduct._id})`);

    // Préparer les données de commande
    const orderData = {
      customer: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '12345678',
        address: {
          street: '123 Test Street',
          city: 'Tunis',
          postalCode: '1000',
          country: 'Tunisia'
        }
      },
      items: [
        {
          product: testProduct._id,
          quantity: 1
        }
      ],
      shippingCost: 10,
      notes: 'Commande de test',
      status: 'pending'
    };

    console.log('\n📋 Données de commande:');
    console.log(JSON.stringify(orderData, null, 2));

    // Tenter de créer la commande (sans authentification d'abord)
    console.log('\n🚀 Tentative de création de commande...');
    
    try {
      const response = await axios.post('http://localhost:9000/api/orders/admin', orderData);
      console.log('✅ Commande créée avec succès !');
      console.log('📄 Réponse:', response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('🔐 Erreur d\'authentification (normal - API protégée)');
        console.log('💡 L\'API nécessite une authentification admin');
      } else {
        console.log('❌ Erreur lors de la création:');
        console.log('- Status:', error.response?.status);
        console.log('- Message:', error.response?.data?.message);
        console.log('- Erreurs:', error.response?.data?.errors);
        console.log('- Détails:', error.response?.data);
      }
    }

    // Test de validation des données
    console.log('\n🔍 Test de validation...');
    
    const invalidOrderData = {
      customer: {
        firstName: '', // Invalide - vide
        lastName: 'User',
        email: 'invalid-email', // Invalide - format email
        phone: '12345678',
        address: {
          street: '123 Test Street',
          city: 'Tunis',
          postalCode: '1000',
          country: 'Tunisia'
        }
      },
      items: [], // Invalide - aucun item
      shippingCost: -5, // Invalide - négatif
      notes: 'Test de validation',
      status: 'invalid-status' // Invalide - statut non autorisé
    };

    try {
      await axios.post('http://localhost:9000/api/orders/admin', invalidOrderData);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Validation fonctionne correctement');
        console.log('📋 Erreurs de validation:', error.response.data.errors?.map(e => e.msg));
      } else if (error.response?.status === 401) {
        console.log('🔐 Authentification requise (normal)');
      } else {
        console.log('❌ Erreur inattendue:', error.response?.status, error.response?.data);
      }
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

testCreateOrder();
