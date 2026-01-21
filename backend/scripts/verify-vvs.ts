import { ethers } from 'ethers';
import { config } from '../src/config/env';

async function verifyVVS() {
  console.log('🔍 Verifying Mock VVS Deployment\n');

  const provider = new ethers.JsonRpcProvider(config.cronosRpcUrl);

  // Check all contracts exist
  const contracts = {
    'USDT': config.usdtAddress,
    'VVS Router': config.vvsRouterAddress,
    'USDC/USDT Pair': config.usdcUsdtPairAddress,
    'VVSYieldStrategy': config.vvsYieldStrategyAddress,
  };

  console.log('Checking deployed contracts:\n');

  let allGood = true;

  for (const [name, address] of Object.entries(contracts)) {
    if (!address) {
      console.log(`❌ ${name}: Not configured in .env`);
      allGood = false;
      continue;
    }

    const code = await provider.getCode(address);
    
    if (code === '0x') {
      console.log(`❌ ${name}: No contract at ${address}`);
      allGood = false;
    } else {
      console.log(`✅ ${name}: ${address}`);
    }
  }

  if (!allGood) {
    console.log('\n⚠️  Some contracts are missing or not configured');
    console.log('   Make sure you added addresses to backend/.env\n');
    return;
  }

  // Check vault connection
  console.log('\n📊 Checking Vault Configuration:\n');

  const vaultAbi = ['function yieldStrategy() view returns (address)'];
  const vault = new ethers.Contract(config.savingsVaultAddress, vaultAbi, provider);
  
  const strategyInVault = await vault.yieldStrategy();
  console.log(`Vault's strategy: ${strategyInVault}`);
  console.log(`Expected strategy: ${config.vvsYieldStrategyAddress}`);
  
  if (strategyInVault.toLowerCase() === config.vvsYieldStrategyAddress.toLowerCase()) {
    console.log('✅ Vault correctly configured!');
  } else {
    console.log('❌ Vault strategy mismatch!');
    return;
  }

  // Check strategy configuration
  console.log('\n📊 Checking Strategy Configuration:\n');

  const strategyAbi = [
    'function savingsVault() view returns (address)',
    'function slippageTolerance() view returns (uint256)',
  ];
  
  const strategy = new ethers.Contract(
    config.vvsYieldStrategyAddress,
    strategyAbi,
    provider
  );

  const vaultInStrategy = await strategy.savingsVault();
  const slippage = await strategy.slippageTolerance();

  console.log(`Strategy's vault: ${vaultInStrategy}`);
  console.log(`Slippage tolerance: ${slippage} (${Number(slippage) / 100}%)`);
  
  if (vaultInStrategy.toLowerCase() === config.savingsVaultAddress.toLowerCase()) {
    console.log('✅ Strategy correctly configured!');
  } else {
    console.log('❌ Strategy vault mismatch!');
    return;
  }

  console.log('\n✅ All verifications passed!\n');
  console.log('🎉 VVS integration is ready to use!\n');
}

verifyVVS().catch(console.error);