const { google } = require('googleapis');
const path = require('path');

async function checkGmailThread() {
    try {
        console.log('🔍 Checking Gmail thread for responses...\n');

        // Thread ID from the sent email
        const threadId = '19c0f03eb790513e';
        const userEmail = 'diossant@personalwork.es';

        console.log(`Thread ID: ${threadId}`);
        console.log(`User Email: ${userEmail}\n`);

        // Setup Gmail API auth
        const keyFilePath = path.join(process.cwd(), 'google-creds.json');

        const auth = new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send',
            ],
            clientOptions: {
                subject: userEmail,
            },
        });

        const gmail = google.gmail({ version: 'v1', auth: auth });

        // Get thread
        console.log('📥 Fetching thread from Gmail...\n');
        const thread = await gmail.users.threads.get({
            userId: 'me',
            id: threadId,
            format: 'full',
        });

        if (!thread.data.messages) {
            console.log('❌ No messages found in thread');
            return;
        }

        console.log(`✅ Thread found with ${thread.data.messages.length} message(s):\n`);

        thread.data.messages.forEach((msg, idx) => {
            const headers = msg.payload?.headers || [];
            const getHeader = (name) => {
                const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
                return h?.value || '';
            };

            const from = getHeader('From');
            const to = getHeader('To');
            const subject = getHeader('Subject');
            const date = getHeader('Date');

            console.log(`Message ${idx + 1}:`);
            console.log(`  ID: ${msg.id}`);
            console.log(`  From: ${from}`);
            console.log(`  To: ${to}`);
            console.log(`  Subject: ${subject}`);
            console.log(`  Date: ${date}`);

            // Check if it's a reply (not from the user)
            const fromLower = from.toLowerCase();
            const userLower = userEmail.toLowerCase();
            const isReply = !fromLower.includes(userLower);

            console.log(`  Is Reply: ${isReply ? '✅ YES' : '❌ NO (sent by user)'}\n`);
        });

        if (thread.data.messages.length === 1) {
            console.log('⚠️  Only 1 message in thread = NO REPLIES YET');
            console.log('   The recipient needs to respond to the email first.\n');
        } else {
            const replies = thread.data.messages.filter(msg => {
                const headers = msg.payload?.headers || [];
                const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
                return !from.toLowerCase().includes(userEmail.toLowerCase());
            });

            console.log(`📊 Summary: ${replies.length} reply/replies from recipient`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 404) {
            console.error('   Thread not found - may have been deleted');
        } else if (error.code === 403) {
            console.error('   Permission denied - check Google Workspace delegation');
        } else {
            console.error('   Full error:', error);
        }
    }
}

checkGmailThread();
