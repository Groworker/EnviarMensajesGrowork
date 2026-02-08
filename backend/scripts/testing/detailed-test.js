const axios = require('axios');

async function detailedTest() {
    try {
        console.log('Testing: GET http://localhost:3001/api/global-config');
        const res = await axios.get('http://localhost:3001/api/global-config');
        console.log('\n✅ Success!');
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.log('\n❌ Error occurred');
        console.log('Message:', error.message);

        if (error.response) {
            console.log('\nResponse Details:');
            console.log('Status:', error.response.status);
            console.log('StatusText:', error.response.statusText);
            console.log('Headers:', error.response.headers);
            console.log('Data type:', typeof error.response.data);

            if (typeof error.response.data === 'string') {
                console.log('Data (first 500 chars):', error.response.data.substring(0, 500));
            } else {
                console.log('Data:', error.response.data);
            }
        } else if (error.request) {
            console.log('\nRequest was made but no response');
            console.log('Request:', error.request);
        }
    }
}

detailedTest();
