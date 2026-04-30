const fs = require('fs');

// Read original data.js
const dataJs = fs.readFileSync('assets/js/data.js', 'utf8');

// Read transformed products
const transformedProducts = fs.readFileSync('transformed-products.js', 'utf8');

// Find the products array boundaries
// The products array starts with "    products: [" and ends before "    projects: ["
const productsStartMarker = '    products: [';
const productsEndMarker = '    ],\n    projects: [';

const startIdx = dataJs.indexOf(productsStartMarker);
if (startIdx === -1) {
  console.error('Could not find products start marker');
  process.exit(1);
}

// Find the "],\r\n    projects: [" or similar pattern
// Need to handle both \r\n and \n line endings
let endMarker1 = '    ],\r\n    projects: [';
let endMarker2 = '    ],\n    projects: [';

let endIdx = dataJs.indexOf(endMarker1, startIdx);
let markerLen = endMarker1.length;
if (endIdx === -1) {
  endIdx = dataJs.indexOf(endMarker2, startIdx);
  markerLen = endMarker2.length;
}

if (endIdx === -1) {
  console.error('Could not find products end marker');
  // Try alternative approach - find "]," followed by "projects:"
  const regex = /    \],\s*\n\s*projects:\s*\[/;
  const match = regex.exec(dataJs.substring(startIdx));
  if (match) {
    endIdx = startIdx + match.index;
    markerLen = match[0].length;
    console.log('Found via regex at offset:', match.index);
  } else {
    console.error('Also failed with regex');
    process.exit(1);
  }
}

console.log('Products section found:');
console.log('  Start index:', startIdx);
console.log('  End index:', endIdx);
console.log('  Section length:', endIdx - startIdx, 'chars');

// Build new data.js
const before = dataJs.substring(0, startIdx);
const after = dataJs.substring(endIdx + '    ],'.length + (dataJs[endIdx + 6] === '\r' ? 2 : 1));

// The transformed products already includes "    products: [" at start and "    ]," at end  
const newDataJs = before + transformedProducts + '\n    projects: [' + after.substring(after.indexOf('[') + 1);

// Wait, let me be more careful about this

// Actually: 
//   before = everything before "    products: ["
//   transformed = "    products: [\n ... \n    ],"
//   after = everything starting from "    projects: [" 

const projectsStart = dataJs.indexOf('    projects: [', startIdx);
if (projectsStart === -1) {
  console.error('Could not find projects start');
  process.exit(1);
}

const newDataJs2 = before + transformedProducts + '\r\n' + dataJs.substring(projectsStart);

fs.writeFileSync('assets/js/data.js', newDataJs2, 'utf8');

console.log('\ndata.js updated successfully!');
console.log('  Before products section:', before.length, 'chars');
console.log('  New products section:', transformedProducts.length, 'chars');
console.log('  After (from projects):', dataJs.substring(projectsStart).length, 'chars');
console.log('  Total new file:', newDataJs2.length, 'chars');
