const fs = require('fs');
const path = require('path');

const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
const buffer = Buffer.from(base64Data, 'base64');

const files = [
    'assets/images/header_bg.png',
    'assets/images/onboarding_trust_secure_neon.png',
    'assets/images/onboarding_get_offers_neon.png',
    'assets/images/onboarding_fast_solution_neon.png',
    'assets/images/onboarding_emergency_sos_neon.png'
];

files.forEach(file => {
    const fullPath = path.join(__dirname, file);
    try {
        fs.writeFileSync(fullPath, buffer);
        console.log(`Successfully replaced ${file}`);
    } catch (err) {
        console.error(`Error replacing ${file}: ${err.message}`);
    }
});
