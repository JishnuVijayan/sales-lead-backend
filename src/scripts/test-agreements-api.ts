import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

// Test credentials - update these with valid credentials from your database
const TEST_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'admin123',
};

let authToken = '';
let testLeadId = '';
let testAgreementId = '';

async function login() {
  console.log('\n=== Testing Login ===');
  try {
    const response = await axios.post(`${API_BASE}/users/login`, TEST_CREDENTIALS);
    authToken = response.data.access_token;
    console.log('✅ Login successful');
    console.log('Token:', authToken.substring(0, 20) + '...');
    return true;
  } catch (error: any) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getLeads() {
  console.log('\n=== Testing Get Leads ===');
  try {
    const response = await axios.get(`${API_BASE}/leads`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: 5 },
    });
    console.log(`✅ Found ${response.data.length} leads`);
    if (response.data.length > 0) {
      testLeadId = response.data[0].id;
      console.log('Using lead ID for testing:', testLeadId);
    }
    return response.data;
  } catch (error: any) {
    console.error('❌ Get leads failed:', error.response?.data || error.message);
    return [];
  }
}

async function createAgreement() {
  console.log('\n=== Testing Create Agreement ===');
  if (!testLeadId) {
    console.log('⚠️ Skipping - no lead ID available');
    return null;
  }

  const agreementData = {
    leadId: testLeadId,
    title: 'Test Agreement API Script',
    description: 'Testing agreement creation from script',
    agreementType: 'Master Service Agreement',
    contractValue: 100000,
    paymentTerms: 'Milestone Based',
    isRenewable: true,
    autoRenew: false,
  };

  try {
    const response = await axios.post(`${API_BASE}/agreements`, agreementData, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    testAgreementId = response.data.id;
    console.log('✅ Agreement created successfully');
    console.log('Agreement ID:', testAgreementId);
    console.log('Agreement Number:', response.data.agreementNumber);
    console.log('Stage:', response.data.stage);
    return response.data;
  } catch (error: any) {
    console.error('❌ Create agreement failed:', error.response?.data || error.message);
    return null;
  }
}

async function getAgreements() {
  console.log('\n=== Testing Get All Agreements ===');
  try {
    const response = await axios.get(`${API_BASE}/agreements`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log(`✅ Found ${response.data.length} agreements`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Get agreements failed:', error.response?.data || error.message);
    return [];
  }
}

async function getAgreementById() {
  console.log('\n=== Testing Get Agreement By ID ===');
  if (!testAgreementId) {
    console.log('⚠️ Skipping - no agreement ID available');
    return null;
  }

  try {
    const response = await axios.get(`${API_BASE}/agreements/${testAgreementId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log('✅ Agreement retrieved successfully');
    console.log('Title:', response.data.title);
    console.log('Stage:', response.data.stage);
    console.log('Contract Value:', response.data.contractValue);
    return response.data;
  } catch (error: any) {
    console.error('❌ Get agreement by ID failed:', error.response?.data || error.message);
    return null;
  }
}

async function changeAgreementStage() {
  console.log('\n=== Testing Change Agreement Stage ===');
  if (!testAgreementId) {
    console.log('⚠️ Skipping - no agreement ID available');
    return null;
  }

  try {
    const response = await axios.put(
      `${API_BASE}/agreements/${testAgreementId}/change-stage`,
      {
        newStage: 'Legal Review',
        notes: 'Moving to legal review stage via test script',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Stage changed successfully');
    console.log('New Stage:', response.data.stage);
    return response.data;
  } catch (error: any) {
    console.error('❌ Change stage failed:', error.response?.data || error.message);
    return null;
  }
}

async function getStageHistory() {
  console.log('\n=== Testing Get Stage History ===');
  if (!testAgreementId) {
    console.log('⚠️ Skipping - no agreement ID available');
    return null;
  }

  try {
    const response = await axios.get(`${API_BASE}/agreements/${testAgreementId}/history`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log(`✅ Found ${response.data.length} stage history records`);
    response.data.forEach((record: any, index: number) => {
      console.log(`  ${index + 1}. ${record.fromStage} → ${record.toStage}`);
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Get stage history failed:', error.response?.data || error.message);
    return null;
  }
}

async function updateAgreement() {
  console.log('\n=== Testing Update Agreement ===');
  if (!testAgreementId) {
    console.log('⚠️ Skipping - no agreement ID available');
    return null;
  }

  try {
    const response = await axios.patch(
      `${API_BASE}/agreements/${testAgreementId}`,
      {
        description: 'Updated description via test script',
        scopeOfWork: 'Test scope of work',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Agreement updated successfully');
    console.log('Description:', response.data.description);
    return response.data;
  } catch (error: any) {
    console.error('❌ Update agreement failed:', error.response?.data || error.message);
    return null;
  }
}

async function testSigning() {
  console.log('\n=== Testing Signing Endpoints ===');
  if (!testAgreementId) {
    console.log('⚠️ Skipping - no agreement ID available');
    return;
  }

  // Move to Pending Signature stage first
  try {
    await axios.put(
      `${API_BASE}/agreements/${testAgreementId}/change-stage`,
      { newStage: 'Pending Signature' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Moved to Pending Signature stage');
  } catch (error: any) {
    console.log('⚠️ Could not move to signing stage:', error.response?.data?.message);
  }

  // Test client signing
  try {
    const response = await axios.put(
      `${API_BASE}/agreements/${testAgreementId}/sign-client`,
      {
        signedBy: 'John Doe (Client)',
        signedDate: new Date().toISOString().split('T')[0],
        notes: 'Signed via test script',
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Client signature recorded');
  } catch (error: any) {
    console.error('❌ Client signing failed:', error.response?.data || error.message);
  }

  // Test company signing
  try {
    const response = await axios.put(
      `${API_BASE}/agreements/${testAgreementId}/sign-company`,
      {
        signedBy: 'CEO Name',
        signedDate: new Date().toISOString().split('T')[0],
        notes: 'Company signed via test script',
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Company signature recorded');
    console.log('Agreement Stage:', response.data.stage);
  } catch (error: any) {
    console.error('❌ Company signing failed:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   AGREEMENT API ENDPOINT TEST SUITE        ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\nBase URL: ${API_BASE}`);
  console.log(`Testing at: ${new Date().toISOString()}\n`);

  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Tests aborted - login failed');
    console.log('Please ensure:');
    console.log('  1. Backend is running on port 3000');
    console.log('  2. Database is accessible');
    console.log('  3. Test credentials are correct');
    return;
  }

  await getLeads();
  await createAgreement();
  await getAgreements();
  await getAgreementById();
  await changeAgreementStage();
  await getStageHistory();
  await updateAgreement();
  await testSigning();

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║          TEST SUITE COMPLETED              ║');
  console.log('╚════════════════════════════════════════════╝\n');

  if (testAgreementId) {
    console.log('📝 Test Agreement Created:');
    console.log(`   ID: ${testAgreementId}`);
    console.log(`   View in browser: http://localhost:5173/app/agreements/${testAgreementId}`);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('\n💥 Unexpected error:', error.message);
  process.exit(1);
});
