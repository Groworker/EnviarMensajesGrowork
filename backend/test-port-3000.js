const axios = require('axios');

async function testDirectBackend() {
    console.log('Testing backend directly on port 3000...\n');

    try {
        const res = await axios.get('http://localhost:3000/api/global-config');
        console.log('✅ SUCCESS!');
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.log('❌ ERROR');
        console.log('Message:', error.message);

        if (error.response) {
            console.log('HTTP Status:', error.response.status);
            console.log('Content-Type:', error.response.headers['content-type']);

            // Show first line of response
            const data = String(error.response.data);
            const firstLine = data.split('\n')[0];
            console.log('First line of response:', firstLine);
        }
    }
}

testDirectBackend();
