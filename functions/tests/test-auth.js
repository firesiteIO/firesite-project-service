const fetch = require('node-fetch');
const { getServiceAccountToken } = require('./src/services/auth');

async function testServiceAccount() {
  try {
    console.log('Getting service account token...');
    const token = await getServiceAccountToken();

    if (!token) {
      throw new Error('Failed to get token');
    }

    console.log('\nToken:', token);

    // Test the privateStuff endpoint
    console.log('\nTesting privateStuff endpoint...');
    const response = await fetch('http://localhost:5002/app/data/privateStuff/testDoc', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'user123',
        data: { foo: 'bar' },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('\nResponse:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testServiceAccount();
