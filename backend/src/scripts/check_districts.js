const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('c:/Users/hp/Desktop/Elektrikciler/backend/data/mock_users.json', 'utf8'));

const masters = Object.values(data).filter(u => u.userType === 'ELECTRICIAN');
const districts = new Set();

masters.forEach(m => {
    if (m.locations) {
        m.locations.forEach(l => districts.add(`${l.city} - ${l.district}`));
    }
    if (m.district) districts.add(`${m.city} - ${m.district}`);
});

console.log('Districts found in mock_users.json:');
Array.from(districts).sort().forEach(d => console.log(d));
