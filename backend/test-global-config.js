const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testGlobalConfig() {
    console.log('🧪 Testing Global Config API...\n');

    try {
        // GET Config
        console.log('📥 GET /global-config');
        const getRes = await axios.get(`${BASE_URL}/global-config`);
        console.log('✅ Response:', JSON.stringify(getRes.data, null, 2));
        console.log('');

        // Update Config
        console.log('📝 PUT /global-config (test update)');
        const updateRes = await axios.put(`${BASE_URL}/global-config`, {
            startHour: 10,
            endHour: 17,
            minDelaySeconds: 45,
            maxDelaySeconds: 90,
            enabled: true,
        });
        console.log('✅ Updated:', JSON.stringify(updateRes.data, null, 2));
        console.log('');

        // Verify update
        console.log('📥 GET /global-config (verify update)');
        const verifyRes = await axios.get(`${BASE_URL}/global-config`);
        console.log('✅ Current config:', JSON.stringify(verifyRes.data, null, 2));
        console.log('');

        console.log('🎉 All tests passed!');
    } catch (error) {
        if (error.response) {
            console.error('❌ Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Error:', error.message);
        }
        process.exit(1);
    }
}

testGlobalConfig();
