import QRCode from 'qrcode';

const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.isbitir.app&hl=tr';

await QRCode.toFile('public/google-play-qr.png', googlePlayUrl, {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 336,
  color: {
    dark: '#020617',
    light: '#ffffff',
  },
});
