import { ethers } from 'ethers';
import { config } from '../config/env';

/**
 * Create a test user account on-chain
 * This will call createAccount() on the vault contract
 */
async function createTestUser() {
  console.log('🧪 Creating Test User Account');
  console.log('================================\n');

  try {
    // Connect to Cronos
    const provider = new ethers.JsonRpcProvider(config.cronosRpcUrl);
    
    // Generate a new test wallet
    const testWallet = ethers.Wallet.createRandom().connect(provider);
    console.log('✅ Generated test wallet');
    console.log('Address:', testWallet.address);
    console.log('Private Key:', testWallet.privateKey);
    console.log('⚠️  Save this private key for testing!\n');

    // We need to fund this wallet with CRO for gas
    console.log('📝 Next steps to complete setup:');
    console.log('1. Go to https://cronos.org/faucet');
    console.log('2. Request testnet CRO for:', testWallet.address);
    console.log('3. Go to https://faucet.cronos.org');
    console.log('4. Request testnet devUSDC.e for:', testWallet.address);
    console.log('5. Run the account creation script once funded\n');

    // Save to file for later use
    const fs = require('fs');
    const testUserData = {
      address: testWallet.address,
      privateKey: testWallet.privateKey,
      createdAt: new Date().toISOString(),
    };
    
    fs.writeFileSync(
      'test-user.json',
      JSON.stringify(testUserData, null, 2)
    );
    console.log('✅ Test user saved to test-user.json\n');

    return true;
  } catch (error: any) {
    console.error('❌ Failed to create test user:', error.message);
    return false;
  }
}

// Run
createTestUser()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });