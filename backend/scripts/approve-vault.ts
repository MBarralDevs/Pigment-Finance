import { ethers } from 'ethers';
import { config } from '../src/config/env';

/**
 * Approve Vault to Spend USDC
 * 
 * This script approves the SavingsVault contract to spend USDC on behalf of the user.
 * This is required before the vault can call depositFor().
 * 
 * Run with: npm run approve-vault
 */

async function approveVault() {
  console.log('🔐 Approving Vault to Spend USDC');
  console.log('=================================\n');

  try {
    // Connect to Cronos
    const provider = new ethers.JsonRpcProvider(config.cronosRpcUrl);
    
    // Get wallet from private key
    const wallet = new ethers.Wallet(config.backendPrivateKey, provider);
    console.log('👛 Your address:', wallet.address);

    // USDC contract ABI (just approve function)
    const USDC_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)',
    ];

    // Connect to USDC contract
    const usdc = new ethers.Contract(config.usdcAddress, USDC_ABI, wallet);

    // Check current allowance
    const currentAllowance = await usdc.allowance(wallet.address, config.savingsVaultAddress);
    console.log('Current allowance:', ethers.formatUnits(currentAllowance, 6), 'USDC\n');

    // Approve unlimited amount (or set a specific amount)
    const MAX_UINT256 = ethers.MaxUint256; // Unlimited approval
    // Or use a specific amount:
    // const amount = ethers.parseUnits('1000', 6); // 1000 USDC

    console.log('📝 Approving vault to spend USDC...');
    console.log('Vault address:', config.savingsVaultAddress);
    console.log('Amount: Unlimited (MAX_UINT256)\n');

    const tx = await usdc.approve(config.savingsVaultAddress, MAX_UINT256);
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...\n');

    const receipt = await tx.wait();
    console.log('✅ Approval successful!');
    console.log('Block:', receipt?.blockNumber);
    console.log('Gas used:', receipt?.gasUsed.toString());

    // Verify new allowance
    const newAllowance = await usdc.allowance(wallet.address, config.savingsVaultAddress);
    console.log('\n✅ New allowance:', ethers.formatUnits(newAllowance, 6), 'USDC');
    
    if (newAllowance === MAX_UINT256) {
      console.log('   (Unlimited)');
    }

    console.log('\n🎉 Vault can now spend your USDC!');
    console.log('You can now use the Save button in the frontend.\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
approveVault()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });