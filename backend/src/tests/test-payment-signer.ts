import { PaymentSigner } from '../agent/payment-signer';
import { config } from '../config/env';
import * as fs from 'fs';

/**
 * Test payment signer
 * Generates EIP-3009 signatures for testing
 */
async function testPaymentSigner() {
  console.log('🧪 Testing Payment Signer');
  console.log('================================\n');

  try {
    // Load test user
    if (!fs.existsSync('test-user.json')) {
      console.error('❌ test-user.json not found. Run test-create-user.ts first.');
      return false;
    }

    const testUser = JSON.parse(fs.readFileSync('test-user.json', 'utf-8'));
    console.log('✅ Loaded test user:', testUser.address);

    // Initialize payment signer with test user's private key
    const signer = new PaymentSigner(
      testUser.privateKey,
      config.cronosChainId,
      config.usdcAddress
    );

    console.log('');

    // Test 1: Sign a payment
    console.log('Test 1: Sign Payment Authorization');
    console.log('-----------------------------------');
    
    const amount = BigInt(25_000_000); // 25 USDC
    const signedAuth = await signer.signPayment(
      config.savingsVaultAddress,
      amount,
      300 // 5 minutes validity
    );

    console.log('\n✅ Signed authorization components:');
    console.log('v:', signedAuth.v);
    console.log('r:', signedAuth.r);
    console.log('s:', signedAuth.s);
    console.log('');

    // Test 2: Create payment header
    console.log('Test 2: Create X-PAYMENT Header');
    console.log('-----------------------------------');
    
    const paymentHeader = signer.createPaymentHeader(signedAuth);
    console.log('Payment header (first 100 chars):');
    console.log(paymentHeader.slice(0, 100) + '...');
    console.log('');

    // Test 3: Sign and create header in one step
    console.log('Test 3: Sign and Create Header (One Step)');
    console.log('-----------------------------------');
    
    const header = await signer.signAndCreateHeader(
      config.savingsVaultAddress,
      BigInt(10_000_000), // 10 USDC
      600 // 10 minutes validity
    );

    console.log('Generated header (first 100 chars):');
    console.log(header.slice(0, 100) + '...');
    console.log('');

    // Test 4: Decode and verify header
    console.log('Test 4: Decode Header');
    console.log('-----------------------------------');
    
    const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
    console.log('Decoded payload:');
    console.log('  Scheme:', decoded.scheme);
    console.log('  Network:', decoded.network);
    console.log('  From:', decoded.from);
    console.log('  To:', decoded.to);
    console.log('  Value:', (parseInt(decoded.value) / 1_000_000).toFixed(2), 'USDC');
    console.log('  Valid until:', new Date(decoded.validBefore * 1000).toISOString());
    console.log('');

    // Test 5: Save payment header to file for manual testing
    console.log('Test 5: Save Payment Header for Testing');
    console.log('-----------------------------------');
    
    const testPayment = {
      user: testUser.address,
      amount: '25.00',
      paymentHeader: await signer.signAndCreateHeader(
        config.savingsVaultAddress,
        BigInt(25_000_000),
        600
      ),
      generatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      'test-payment.json',
      JSON.stringify(testPayment, null, 2)
    );

    console.log('✅ Test payment saved to test-payment.json');
    console.log('You can use this to test the /api/save endpoint manually!');
    console.log('');

    console.log('🎉 All payment signer tests passed!\n');
    return true;
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run tests
testPaymentSigner()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });