import axios from 'axios';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhOWViMmYzNy0zNGUzLTQzYmItODhiMS1iNjQ4NmRhYjcyMjYiLCJlbWFpbCI6InVzZXIxQGdtYWlsLmNvbSIsInJvbGUiOiJTQUxFU19FWECTVVRJVkUiLCJpYXQiOjE3MzA2NTI3MzEsImV4cCI6MTczMDY1NjMzMX0.example';

async function testEndpoint() {
  try {
    const response = await axios.get('http://localhost:3000/api/proposals', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Success:', response.status);
  } catch (error: any) {
    console.log('Error:', error.response?.status, error.message);
  }
}

testEndpoint();