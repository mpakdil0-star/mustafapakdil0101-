const fs = require('fs');
const forge = require('node-forge');

try {
    // Read the JKS file
    const jksB64 = fs.readFileSync('C:/Users/hp/Downloads/@tugce0101__elektrikciler-mobile-keystore.bak.jks', 'base64');
    const jksBuffer = Buffer.from(jksB64, 'base64');

    // Convert to forge format
    const msg = forge.util.createBuffer(jksBuffer.toString('binary'), 'binary');

    // Note: node-forge doesn't natively parse JKS (Java KeyStore) format. 
    // It natively supports PKCS#12 (.p12). 
    // We need to use child_process with keytool since node-forge can't parse JKS directly.
} catch (e) {
    console.log("Error:", e);
}
