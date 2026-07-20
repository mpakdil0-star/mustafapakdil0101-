const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const files = process.argv.slice(2);
if (!files.length) {
  throw new Error('Pass one or more service-account JSON paths');
}

const encode = (value) => Buffer.from(value).toString('base64url');

async function test(file) {
  const account = JSON.parse(fs.readFileSync(file, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = encode(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: account.private_key_id }));
  const payload = encode(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), account.private_key).toString('base64url');
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = await response.json();
  let publisherStatus = null;
  let publisherAuthorized = null;
  if (response.ok && body.access_token && process.env.GOOGLE_PLAY_PACKAGE_NAME) {
    const productId = process.env.GOOGLE_PLAY_PRODUCT_ID;
    const publisherUrl = productId
      ? `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(process.env.GOOGLE_PLAY_PACKAGE_NAME)}/purchases/products/${encodeURIComponent(productId)}/tokens/permission-probe-invalid-token`
      : `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(process.env.GOOGLE_PLAY_PACKAGE_NAME)}/inappproducts?maxResults=1`;
    const publisherResponse = await fetch(
      publisherUrl,
      { headers: { Authorization: `Bearer ${body.access_token}` } },
    );
    publisherStatus = publisherResponse.status;
    publisherAuthorized = ![401, 403].includes(publisherResponse.status);
  }
  console.log(JSON.stringify({
    file: path.basename(file),
    clientEmail: account.client_email,
    tokenEndpointStatus: response.status,
    authenticated: response.ok && typeof body.access_token === 'string',
    publisherStatus,
    publisherAuthorized,
    error: response.ok ? null : body.error,
  }));
}

Promise.all(files.map(test)).catch((error) => {
  console.error(`FATAL=${error.message}`);
  process.exitCode = 1;
});
