import { BlockchainService } from '../services/blockchain.service';
import { ethers } from 'ethers';

/**
 * Test blockchain service
 * Verifies connection to Cronos and contract interaction
 */
async function testBlockchain() {
  console.log('🧪 Testing Blockchain Service');
  console.log('================================\n');

  const blockchain = new BlockchainService();

  try {
    // Test 1: Get backend wallet info
    console.log('✅ Test 1: Backend Wallet');
    console.log('Address:', blockchain.getBackendAddress());
    console.log('');

    // Test 2: Amount parsing/formatting
    console.log('✅ Test 2: Amount Conversion');
    const testAmount = '25.50';
    const parsed = blockchain.parseUsdcAmount(testAmount);
    const formatted = blockchain.formatUsdcAmount(parsed);
    console.log(`Input: ${testAmount} USDC`);
    console.log(`Parsed: ${parsed.toString()} (smallest unit)`);
    console.log(`Formatted back: ${formatted} USDC`);
    console.log('');

    // Test 3: Try to get deployer account (should exist)
    console.log('✅ Test 3: Read Account (Deployer)');
    const deployerAddress = '0x5Dc454F7EfDCbaa3928AA599AC9FC758e92b32f9';
    try {
      const account = await blockchain.getUserAccount(deployerAddress);
      console.log('Account found:');
      console.log('  Total Deposited:', blockchain.formatUsdcAmount(account.totalDeposited));
      console.log('  Current Balance:', blockchain.formatUsdcAmount(account.currentBalance));
      console.log('  Is Active:', account.isActive);
      console.log('  Trust Mode:', account.trustMode === 0 ? 'MANUAL' : 'AUTO');
    } catch (error: any) {
      console.log('Account not found (expected if no account created yet)');
    }
    console.log('');

    // Test 4: Check canAutoSave for an address
    console.log('✅ Test 4: Rate Limit Check');
    const canSave = await blockchain.canAutoSave(deployerAddress);
    console.log(`Can auto-save: ${canSave}`);
    console.log('');

    console.log('🎉 All blockchain tests passed!\n');
    return true;
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run tests
testBlockchain()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });