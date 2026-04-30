const fs = require('fs');

// Read products
const products = JSON.parse(fs.readFileSync('migration-full-input/products.json', 'utf8'));
const categories = JSON.parse(fs.readFileSync('migration-full-input/categories.json', 'utf8'));

// Build category lookup
const catMap = {};
categories.forEach(c => { catMap[c._id] = c; });

console.log('=== PRODUCTS SUMMARY ===');
console.log('Total products:', products.length);
console.log('');

// Show unique categories used
const catIds = [...new Set(products.map(p => p.categoryId))];
console.log('Categories used:', catIds.length);
catIds.forEach(id => {
  const cat = catMap[id];
  if (cat) {
    console.log(`  - ${cat.name} (${cat.slug}) [${id}]`);
    // Check for parent
    if (cat.parentId) {
      const parent = catMap[cat.parentId];
      if (parent) console.log(`    Parent: ${parent.name} (${parent.slug})`);
    }
  } else {
    console.log(`  - UNKNOWN [${id}]`);
  }
});

console.log('');
console.log('=== FIRST 3 PRODUCTS (key fields) ===');
products.slice(0, 3).forEach((p, i) => {
  console.log(`\n--- Product ${i+1} ---`);
  console.log('name:', p.name);
  console.log('slug:', p.slug);
  console.log('description:', (p.description || '').substring(0, 200));
  console.log('price:', p.price);
  console.log('originalPrice:', p.originalPrice);
  console.log('stock:', p.stock);
  console.log('images:', p.images);
  console.log('isActive:', p.isActive);
  console.log('categoryId:', p.categoryId);
  const cat = catMap[p.categoryId];
  console.log('category:', cat ? cat.name : 'unknown');
  console.log('tags:', p.tags);
  console.log('sku:', p.sku);
  console.log('features:', (p.features || '').substring(0, 100));
});

console.log('\n=== ALL PRODUCT NAMES + PRICES + CATEGORY ===');
products.forEach((p, i) => {
  const cat = catMap[p.categoryId];
  console.log(`${i+1}. ${p.name} | ${p.price}đ | ${cat ? cat.name : 'N/A'} | stock:${p.stock} | images:${(p.images||[]).length} | active:${p.isActive}`);
});
