const { admin } = require('../../config/firebase-admin');
const fetch = require('node-fetch');

async function getServiceAccountToken() {
  try {
    // Create a custom token with service account claim
    const customToken = await admin.auth().createCustomToken('service-account', {
      service_account: true,
    });

    console.log('Custom token created:', customToken);

    // Exchange custom token for ID token using v3 endpoint
    const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=${process.env.FIREBASE_API_KEY}`;
    console.log('Making request to:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Response error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
      });
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorData}`);
    }

    const data = await response.json();
    return data.idToken;
  } catch (error) {
    console.error('Error getting service account token:', error);
    throw error;
  }
}

module.exports = {
  getServiceAccountToken,
};
