const fs = require('fs');

const products = JSON.parse(fs.readFileSync('migration-full-input/products.json', 'utf8'));
const categories = JSON.parse(fs.readFileSync('migration-full-input/categories.json', 'utf8'));

// Category lookup
const catMap = {};
categories.forEach(c => { catMap[c._id] = c; });

// Category ID to taxonomy theme mapping
const catThemeMap = {
  '689c3d1f16119f26788584ac': ['robotics', 'engineering'],
  '689c3d1f16119f26788584ad': ['coding', 'art-tech'],
  '689d3f1765af4229229a7037': ['engineering', 'art-tech'],
  '68b1151839e01ecd48d433dd': ['science', 'engineering'],
};

const catFormatMap = {
  '689c3d1f16119f26788584ac': ['kit'],
  '689c3d1f16119f26788584ad': ['course'],
  '689d3f1765af4229229a7037': ['kit'],
  '68b1151839e01ecd48d433dd': ['kit'],
};

const catAgeMap = {
  '689c3d1f16119f26788584ac': ['7-9', '10-12', '13-15'],
  '689c3d1f16119f26788584ad': ['10-12', '13-15'],
  '689d3f1765af4229229a7037': ['7-9', '10-12', '13-15'],
  '68b1151839e01ecd48d433dd': ['10-12', '13-15'],
};

const catDifficultyMap = {
  '689c3d1f16119f26788584ac': ['intermediate'],
  '689c3d1f16119f26788584ad': ['intermediate', 'advanced'],
  '689d3f1765af4229229a7037': ['beginner', 'intermediate'],
  '68b1151839e01ecd48d433dd': ['intermediate'],
};

// Comprehensive HTML entity decoder
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&hellip;/g, '…')
    .replace(/&aacute;/g, 'á')
    .replace(/&agrave;/g, 'à')
    .replace(/&atilde;/g, 'ã')
    .replace(/&acirc;/g, 'â')
    .replace(/&aring;/g, 'å')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&iacute;/g, 'í')
    .replace(/&igrave;/g, 'ì')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ograve;/g, 'ò')
    .replace(/&oacute;/g, 'ó')
    .replace(/&otilde;/g, 'õ')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&Agrave;/g, 'À')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Acirc;/g, 'Â')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Ecirc;/g, 'Ê')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Ocirc;/g, 'Ô')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ugrave;/g, 'Ù')
    // Catch remaining numeric entities
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripHtml(html) {
  if (!html) return '';
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return decodeHtmlEntities(text);
}

function formatPrice(price) {
  if (!price || price === 0) return 'Liên hệ';
  return price.toLocaleString('vi-VN') + 'đ';
}

function formatPriceEn(price) {
  if (!price || price === 0) return 'Contact us';
  return price.toLocaleString('vi-VN') + ' VND';
}

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
}

function getStockStatus(stock) {
  if (!stock || stock <= 0) return { vi: 'Liên hệ đặt hàng', en: 'Contact to order' };
  if (stock < 5) return { vi: 'Còn ít hàng', en: 'Limited stock' };
  if (stock < 20) return { vi: 'Còn hàng', en: 'In stock' };
  return { vi: 'Sẵn hàng', en: 'Available' };
}

function normalizeImageSource(src) {
  if (!src) return '';
  const source = String(src).trim()
    .replace(/^https?:\/\/api\.smartsteam\.store\/(images|uploads)\//i, '/$1/')
    .replace(/^https?:\/\/(?:www\.)?smartsteam\.vn\/(images|uploads)\//i, '/$1/')
    .replace(/^https?:\/\/ssteam\.onrender\.com\/(images|uploads)\//i, '/$1/');
  if (/^(images|uploads)\//i.test(source)) return '/' + source;
  return source;
}

// Filter active products
const activeProducts = products.filter(p => p.isActive !== false);

let output = '    products: [\n';

activeProducts.forEach((p, idx) => {
  const cat = catMap[p.categoryId];
  const catName = cat ? decodeHtmlEntities(cat.name) : 'Sản phẩm STEM';
  const themes = catThemeMap[p.categoryId] || ['science'];
  const formats = catFormatMap[p.categoryId] || ['kit'];
  const ages = catAgeMap[p.categoryId] || ['10-12'];
  const difficulty = catDifficultyMap[p.categoryId] || ['intermediate'];
  const stockStatus = getStockStatus(p.stock);
  const desc = stripHtml(p.description);
  const fullDesc = stripHtml(p.fullDescription);
  const mainDesc = fullDesc.length > desc.length ? fullDesc : desc;
  const shortDesc = desc.length > 200 ? desc.substring(0, 200) + '...' : desc;
  const summaryText = shortDesc || catName;

  const images = (p.images || []).map(normalizeImageSource).filter(Boolean);
  const coverImg = images[0] || '/assets/img/product-science.svg';
  const heroImg = images[0] || '/assets/img/product-science.svg';
  const galleryImages = images.slice(0, 5);

  const hasDiscount = p.originalPrice && p.originalPrice > p.price && p.price > 0;

  // Clean description for display (max 500 chars, single line)
  const descForDisplay = mainDesc.substring(0, 500).replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();

  output += `      {\n`;
  output += `        slug: "${p.slug}",\n`;

  // Cover media
  output += `        cover: {\n`;
  output += `          src: "${escapeStr(coverImg)}",\n`;
  output += `          width: 800, height: 1000, ratio: "4 / 5", fit: "cover",\n`;
  output += `          focalX: 50, focalY: 50, preserveTextSafeArea: false,\n`;
  output += `          role: "catalogue", loadingTier: "near",\n`;
  output += `          alt: { vi: "${escapeStr(decodeHtmlEntities(p.name))}", en: "${escapeStr(decodeHtmlEntities(p.name))}" },\n`;
  output += `        },\n`;

  // Hero media
  output += `        hero: {\n`;
  output += `          src: "${escapeStr(heroImg)}",\n`;
  output += `          width: 1200, height: 1440, ratio: "5 / 6", fit: "cover",\n`;
  output += `          focalX: 50, focalY: 50, preserveTextSafeArea: false,\n`;
  output += `          role: "hero", loadingTier: "critical",\n`;
  output += `          alt: { vi: "${escapeStr(decodeHtmlEntities(p.name))}", en: "${escapeStr(decodeHtmlEntities(p.name))}" },\n`;
  output += `        },\n`;

  // Gallery
  output += `        gallery: [\n`;
  galleryImages.forEach((img, gi) => {
    output += `          {\n`;
    output += `            src: "${escapeStr(img)}",\n`;
    output += `            width: 800, height: 600, ratio: "4 / 3", fit: "cover",\n`;
    output += `            focalX: 50, focalY: 50, preserveTextSafeArea: false,\n`;
    output += `            role: "editorial", loadingTier: "${gi === 0 ? 'near' : 'deferred'}",\n`;
    output += `            alt: { vi: "${escapeStr(decodeHtmlEntities(p.name))} - ${gi + 1}", en: "${escapeStr(decodeHtmlEntities(p.name))} - ${gi + 1}" },\n`;
    output += `          },\n`;
  });
  output += `        ],\n`;

  // Titles
  const cleanName = decodeHtmlEntities(p.name);
  output += `        titleVi: "${escapeStr(cleanName)}",\n`;
  output += `        titleEn: "${escapeStr(cleanName)}",\n`;

  // Taglines
  output += `        taglineVi: "${escapeStr(catName)}",\n`;
  output += `        taglineEn: "${escapeStr(catName)}",\n`;

  // Summary
  output += `        summaryVi: "${escapeStr(decodeHtmlEntities(summaryText))}",\n`;
  output += `        summaryEn: "${escapeStr(decodeHtmlEntities(summaryText))}",\n`;

  // Description
  output += `        descriptionVi: "${escapeStr(decodeHtmlEntities(descForDisplay))}",\n`;
  output += `        descriptionEn: "${escapeStr(decodeHtmlEntities(descForDisplay))}",\n`;
  output += `        descriptionHtmlVi: "${escapeStr(String(p.fullDescription || ""))}",\n`;
  output += `        descriptionHtmlEn: "${escapeStr(String(p.fullDescription || ""))}",\n`;

  // Price
  output += `        priceVi: "${formatPrice(p.price)}",\n`;
  output += `        priceEn: "${formatPriceEn(p.price)}",\n`;

  if (hasDiscount) {
    output += `        originalPriceVi: "${formatPrice(p.originalPrice)}",\n`;
    output += `        originalPriceEn: "${formatPriceEn(p.originalPrice)}",\n`;
  }

  // Availability
  output += `        availabilityVi: "${stockStatus.vi}",\n`;
  output += `        availabilityEn: "${stockStatus.en}",\n`;
  output += `        stock: ${p.stock || 0},\n`;

  // Taxonomy
  output += `        age: ${JSON.stringify(ages)},\n`;
  output += `        theme: ${JSON.stringify(themes)},\n`;
  output += `        format: ${JSON.stringify(formats)},\n`;
  output += `        occasion: ["school", "family"],\n`;
  output += `        difficulty: ${JSON.stringify(difficulty)},\n`;

  // Facts
  output += `        facts: [\n`;
  output += `          { labelVi: "Danh mục", labelEn: "Category", valueVi: "${escapeStr(catName)}", valueEn: "${escapeStr(catName)}" },\n`;
  output += `          { labelVi: "Tình trạng", labelEn: "Stock", valueVi: "${stockStatus.vi}", valueEn: "${stockStatus.en}" },\n`;
  if (p.sku) {
    output += `          { labelVi: "Mã SP", labelEn: "SKU", valueVi: "${escapeStr(p.sku)}", valueEn: "${escapeStr(p.sku)}" },\n`;
  }
  output += `          { labelVi: "Giá", labelEn: "Price", valueVi: "${formatPrice(p.price)}", valueEn: "${formatPriceEn(p.price)}" },\n`;
  output += `        ],\n`;

  // Highlight quote
  output += `        highlightQuote: {\n`;
  output += `          textVi: "Sản phẩm STEM chất lượng cao, phù hợp cho học tập và sáng tạo.",\n`;
  output += `          textEn: "High-quality STEM product, perfect for learning and creativity.",\n`;
  output += `          authorVi: "STEMORA Team",\n`;
  output += `          authorEn: "STEMORA Team",\n`;
  output += `        },\n`;

  // Detail sections
  output += `        detailSections: [],\n`;
  output += `        outcomesVi: [],\n`;
  output += `        outcomesEn: [],\n`;

  // Meta
  output += `        shareEnabled: true,\n`;
  output += `        ctaType: "contact",\n`;
  output += `        featuredOrder: ${idx + 1},\n`;
  output += `        isActive: ${p.isActive !== false},\n`;
  output += `        categoryId: "${p.categoryId}",\n`;

  output += `      },\n`;
});

output += '    ],';

fs.writeFileSync('transformed-products.js', output, 'utf8');
console.log(`Transformed ${activeProducts.length} active products (out of ${products.length} total)`);
console.log('Output written to transformed-products.js');

// Verify a sample
const sample = activeProducts[0];
console.log('\nSample product:');
console.log('  Name:', decodeHtmlEntities(sample.name));
console.log('  Slug:', sample.slug);
console.log('  Price:', formatPrice(sample.price));
console.log('  Images:', (sample.images || []).length);
console.log('  Cover URL:', sample.images?.[0] || '');
