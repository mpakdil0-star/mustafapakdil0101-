const https = require('https');
const fs = require('fs');

const url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=exp%3A%2F%2F192.168.1.44%3A8081';
const file = fs.createWriteStream('c:\\Users\\hp\\Desktop\\Elektrikciler\\expo_qr_code_8081.png');

https.get(url, function(response) {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('QR Code downloaded successfully!');
  });
}).on('error', (err) => {
  console.error('Error downloading QR code:', err);
});

