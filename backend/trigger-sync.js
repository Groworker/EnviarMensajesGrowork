const http = require('http');

console.log('🔄 Triggering manual sync...\n');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/email-responses/sync-all',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('✅ Response received:');
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));
        } catch {
            console.log(data);
        }
        console.log('\n📋 Check backend logs for sync details');
    });
});

req.on('error', (error) => {
    console.error('❌ Error:', error.message);
});

req.end();
