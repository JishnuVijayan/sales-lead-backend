import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// Test PDF download with different user roles
async function testPdfDownload() {
  const users = [
    { email: 'user1@gmail.com', password: 'password@123', role: 'ACCOUNT_MANAGER' },
    { email: 'user2@gmail.com', password: 'password@123', role: 'SALES_MANAGER' },
    { email: 'user3@gmail.com', password: 'password@123', role: 'ADMIN' },
  ];

  const proposalId = 'ccc9c69b-01e6-4ed7-8bc1-2cdf5702dfb9'; // From our test data

  for (const user of users) {
    try {
      console.log(`\n=== Testing with ${user.role} (${user.email}) ===`);

      // Login
      const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
        email: user.email,
        password: user.password,
      });

      const token = loginResponse.data.access_token;
      console.log('Login successful, got token');

      // Try to download PDF
      const pdfResponse = await axios.get(`${API_BASE_URL}/proposals/${proposalId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'arraybuffer', // For binary data
      });

      console.log('✅ PDF download successful!');
      console.log(`Response status: ${pdfResponse.status}`);
      console.log(`Content-Type: ${pdfResponse.headers['content-type']}`);
      console.log(`Content-Length: ${pdfResponse.headers['content-length']} bytes`);

    } catch (error: any) {
      console.log('❌ PDF download failed!');
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Error: ${error.response.data?.message || error.response.data}`);
      } else {
        console.log(`Error: ${error.message}`);
      }
    }
  }
}

testPdfDownload().catch(console.error);