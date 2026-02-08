const axios = require('axios');

async function quickTest() {
    try {
        const res = await axios.get('http://localhost:3001/api/global-config');
        console.log('✅ API Response:');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        }
    }
}

quickTest();
