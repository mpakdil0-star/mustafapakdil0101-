const fs = require('fs');
const PNG = require('pngjs').PNG;

const file = 'c:/Users/hp/Desktop/Elektrikciler/mobile/assets/images/categories/electric_3d_clean_v3.png';
if (!fs.existsSync(file)) {
  console.log("File does not exist:", file);
  process.exit(1);
}

const data = fs.readFileSync(file);
const png = PNG.sync.read(data);

let maxRowWhiteLength = 0;

for (let y = 0; y < png.height; y++) {
  let currentLength = 0;
  for (let x = 0; x < png.width; x++) {
    const idx = (y * png.width + x) * 4;
    const r = png.data[idx];
    const g = png.data[idx+1];
    const b = png.data[idx+2];
    const a = png.data[idx+3];
    
    // Check if pixel is near-white and not transparent
    if (a > 0 && r > 200 && g > 200 && b > 200) {
      currentLength++;
      if (currentLength > maxRowWhiteLength) {
        maxRowWhiteLength = currentLength;
      }
    } else {
      currentLength = 0;
    }
  }
}

console.log(`Max contiguous near-white horizontal pixels in any row: ${maxRowWhiteLength}`);
