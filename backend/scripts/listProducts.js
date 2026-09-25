const mongoose = require('mongoose');
require('../config/env');
const Product = require('../models/Product');

async function testProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');
    console.log('✅ Connected to MongoDB');

    // Get all products from database
    const allProducts = await Product.find({});
    console.log(`📦 Total products in database: ${allProducts.length}`);

    if (allProducts.length > 0) {
      console.log('\n📋 Products details:');
      allProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   - Category: ${product.category}`);
        console.log(`   - Price: ${product.price}`);
        console.log(`   - Stock: ${product.stockQuantity}`);
        console.log(`   - InStock: ${product.inStock}`);
        console.log(`   - Featured: ${product.featured}`);
        console.log(`   - Created: ${product.createdAt}`);
        console.log('');
      });

      // Check products with inStock = true
      const inStockProducts = await Product.find({ inStock: true });
      console.log(`🟢 Products with inStock=true: ${inStockProducts.length}`);

      // Check products with inStock = false
      const outOfStockProducts = await Product.find({ inStock: false });
      console.log(`🔴 Products with inStock=false: ${outOfStockProducts.length}`);

      // Update all products to ensure inStock is correctly set
      console.log('\n🔄 Updating inStock status for all products...');
      for (const product of allProducts) {
        const shouldBeInStock = product.stockQuantity > 0;
        if (product.inStock !== shouldBeInStock) {
          await Product.findByIdAndUpdate(product._id, { inStock: shouldBeInStock });
          console.log(`Updated ${product.name}: inStock = ${shouldBeInStock}`);
        }
      }

      // Check again after update
      const updatedInStockProducts = await Product.find({ inStock: true });
      console.log(`\n✅ After update - Products with inStock=true: ${updatedInStockProducts.length}`);
    } else {
      console.log('❌ No products found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testProducts();
