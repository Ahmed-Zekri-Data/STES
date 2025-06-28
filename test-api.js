const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing API connection...');

    // Test admin login first
    const loginResponse = await axios.post('http://localhost:9000/api/auth/login', {
      username: 'ahmedzekri143@gmail.com',
      password: 'admin123456'
    });
    console.log('✅ Admin login working');
    console.log('Admin:', loginResponse.data.admin.username);

    const token = loginResponse.data.token;

    // Test products endpoint with auth
    const response = await axios.get('http://localhost:9000/api/products', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Products API working');
    console.log('Products found:', response.data.products?.length || response.data.length || 'No products');

    // Test creating a product
    const newProduct = {
      name: 'Test Product',
      description: 'This is a test product',
      price: 99.99,
      category: 'pools',
      stockQuantity: 10,
      featured: false
    };

    const createResponse = await axios.post('http://localhost:9000/api/products', newProduct, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Product creation working');
    console.log('Created product:', createResponse.data.name);

  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI();
