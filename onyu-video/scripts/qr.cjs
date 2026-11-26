// 마지막 화면 QR: https://daymate-onyu.vercel.app/ (오류정정 M, 여백 4모듈)
const QRCode = require('qrcode');
const path = require('path');
const URL = 'https://daymate-onyu.vercel.app/';
QRCode.toFile(path.join(__dirname, '..', 'public', 'qr.png'), URL, {
  errorCorrectionLevel: 'M', margin: 4, width: 960, color: { dark: '#302B25', light: '#FFFFFF' },
}).then(() => console.log('qr ok', URL));
