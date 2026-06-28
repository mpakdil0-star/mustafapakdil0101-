const fs = require('fs');
const PNG = require('pngjs').PNG;

const file = 'c:/Users/hp/Desktop/Elektrikciler/mobile/assets/images/categories/electric_v2.png';
if (!fs.existsSync(file)) {
  console.log("File does not exist:", file);
  process.exit(1);
}

const data = fs.readFileSync(file);
const png = PNG.sync.read(data);

const colors = {};
let totalNonTransparent = 0;

for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (y * png.width + x) * 4;
    const r = png.data[idx];
    const g = png.data[idx+1];
    const b = png.data[idx+2];
    const a = png.data[idx+3];
    
    if (a > 0) {
      totalNonTransparent++;
      const key = `${r},${g},${b}`;
      colors[key] = (colors[key] || 0) + 1;
    }
  }
}

console.log(`Total non-transparent pixels: ${totalNonTransparent}`);
const sorted = Object.entries(colors).sort((a, b) => b[1] - a[1]);
console.log("Top 20 colors by pixel count:");
sorted.slice(0, 20).forEach(([color, count]) => {
  console.log(`  Color [${color}]: ${count} pixels (${(count/totalNonTransparent*100).toFixed(2)}%)`);
});
