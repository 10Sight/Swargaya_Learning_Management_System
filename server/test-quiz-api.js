import fetch from 'node-fetch';

const testQuizId = '68d84a33a5e3338ef43d1889';
const baseUrl = 'http://localhost:8000';

async function testQuizAPI() {
    try {
        console.log(`Testing quiz API with ID: ${testQuizId}`);
        
        // Test the start quiz endpoint
        const response = await fetch(`${baseUrl}/api/attempts/start/${testQuizId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Note: In a real test, you'd need proper auth headers
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers.raw());

        if (!response.ok) {
            const errorText = await response.text();
            console.log('Error response:', errorText);
            return;
        }

        const data = await response.json();
        console.log('Success response:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Network error:', error);
    }
}

// Also test if the server is responding at all
async function testHealth() {
    try {
        console.log('Testing server health...');
        const response = await fetch(`${baseUrl}/api/health`);
        console.log('Health check status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Health check response:', data);
        } else {
            const errorText = await response.text();
            console.log('Health check error:', errorText);
        }
    } catch (error) {
        console.error('Health check failed:', error);
    }
}

console.log('=== Server Health Test ===');
await testHealth();

console.log('\n=== Quiz API Test ===');
await testQuizAPI();
