const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../constants/locations.ts');

const PROVINCES_URL = 'https://turkiyeapi.dev/api/v1/provinces';
const DISTRICTS_URL = 'https://turkiyeapi.dev/api/v1/districts';

const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed with status ${res.statusCode}`));
        return;
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } 
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
};

(async () => {
  try {
    console.log('Fetching provinces...');
    let res = await fetchJson(PROVINCES_URL);
    let provincesData = res.data;

    let cities = [];

    // Format provinces into simple map first
    for (let province of provincesData) {
      cities.push({
        name: province.name,
        _id: province.id, // temp
        districts: []
      });
    }

    console.log(`Fetched ${cities.length} provinces. Now fetching all districts...`);
    // Getting all districts includes neighborhoods
    let dRes = await fetchJson(DISTRICTS_URL);
    let districtsData = dRes.data;

    console.log(`Fetched ${districtsData.length} districts.`);

    for (let city of cities) {
      let cityDistricts = districtsData.filter(d => d.provinceId === city._id);
      
      for (let dist of cityDistricts) {
        let nNames = (dist.neighborhoods || []).map(n => n.name);
        
        city.districts.push({
          name: dist.name,
          neighborhoods: nNames.sort((a,b) => a.localeCompare(b, 'tr-TR'))
        });
      }
      
      city.districts.sort((a,b) => a.name.localeCompare(b.name, 'tr-TR'));
      delete city._id;
    }

    cities.sort((a,b) => a.name.localeCompare(b.name, 'tr-TR'));

    console.log('Generating locations.ts ...');

    const tsContent = `// Türkiye'nin şehir, ilçe ve mahalle verileri
// turkiyeapi.dev kullanılarak güncellenmiştir.

export interface City {
  name: string;
  districts: District[];
}

export interface District {
  name: string;
  neighborhoods: string[];
}

export const TURKISH_CITIES: City[] = ${JSON.stringify(cities, null, 2)};

// Şehir listesi (sadece isimler), A'dan Z'ye Türkçe karakter duyarlı
export const CITY_NAMES = TURKISH_CITIES
  .map(city => city.name)
  .sort((a, b) => a.localeCompare(b, 'tr-TR'));

// Şehre göre ilçe listesi, A'dan Z'ye Türkçe karakter duyarlı
export const getDistrictsByCity = (cityName: string): string[] => {
  const city = TURKISH_CITIES.find(c => c.name === cityName);
  return city ? city.districts.map(d => d.name).sort((a, b) => a.localeCompare(b, 'tr-TR')) : [];
};

// Şehir ve ilçeye göre mahalle listesi, A'dan Z'ye Türkçe karakter duyarlı
export const getNeighborhoodsByCityAndDistrict = (
  cityName: string,
  districtName: string
): string[] => {
  const city = TURKISH_CITIES.find(c => c.name === cityName);
  if (!city) return [];

  const district = city.districts.find(d => d.name === districtName);
  return district ? [...district.neighborhoods].sort((a, b) => a.localeCompare(b, 'tr-TR')) : [];
};
`;
    
    fs.writeFileSync(OUTPUT_PATH, tsContent, 'utf-8');
    console.log('Successfully saved to locations.ts');

  } catch (err) {
    console.error('Error:', err);
  }
})();
