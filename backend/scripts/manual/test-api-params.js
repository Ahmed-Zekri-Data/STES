const axios = require('axios');

async function testAPIWithEmptyParams() {
  try {
    console.log('Testing API with empty parameters...');
    
    // Test with empty parameters (like the frontend sends)
    const response = await axios.get('http://localhost:9000/api/products', {
      params: {
        category: '',
        subcategory: '',
        minPrice: '',
        maxPrice: '',
        search: '',
        brand: '',
        minRating: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 12
      }
    });
    
    console.log('✅ API call successful!');
    console.log('Products found:', response.data.products?.length || 0);
    console.log('Total products:', response.data.pagination?.totalProducts || 0);
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testAPIWithEmptyParams();
