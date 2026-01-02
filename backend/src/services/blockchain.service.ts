import { ethers } from 'ethers';
import { config } from '../config/env';

const SAVINGS_VAULT_ABI = [
  'function getAccount(address user) view returns (tuple(uint256 totalDeposited, uint256 totalWithdrawn, uint256 currentBalance, uint256 weeklyGoal, uint256 safetyBuffer, uint256 lastSaveTimestamp, bool isActive, uint8 trustMode))',
  'function depositFor(address user, uint256 amount)',
  'function canAutoSave(address user) view returns (bool)',
  'function getUserTotalBalance(address user) view returns (uint256)',
  'event Deposited(address indexed user, uint256 amount, uint256 newBalance)',
];

const USDC_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private backendWallet: ethers.Wallet;
  private savingsVault: ethers.Contract;
  private usdc: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.cronosRpcUrl);
    this.backendWallet = new ethers.Wallet(config.backendPrivateKey, this.provider);
    
    this.savingsVault = new ethers.Contract(
      config.savingsVaultAddress,
      SAVINGS_VAULT_ABI,
      this.backendWallet
    );

    this.usdc = new ethers.Contract(
      config.usdcAddress,
      USDC_ABI,
      this.provider
    );

    console.log('✅ Blockchain service initialized');
    console.log('Backend wallet address:', this.backendWallet.address);
  }

  async getUserAccount(userAddress: string) {
    try {
      const account = await this.savingsVault.getAccount(userAddress);
      return {
        totalDeposited: account[0],
        totalWithdrawn: account[1],
        currentBalance: account[2],
        weeklyGoal: account[3],
        safetyBuffer: account[4],
        lastSaveTimestamp: account[5],
        isActive: account[6],
        trustMode: account[7],
      };
    } catch (error) {
      console.error('Error getting user account:', error);
      throw error;
    }
  }

  async canAutoSave(userAddress: string): Promise<boolean> {
    try {
      return await this.savingsVault.canAutoSave(userAddress);
    } catch (error) {
      console.error('Error checking canAutoSave:', error);
      return false;
    }
  }

  async getUserTotalBalance(userAddress: string): Promise<bigint> {
    try {
      return await this.savingsVault.getUserTotalBalance(userAddress);
    } catch (error) {
      console.error('Error getting user total balance:', error);
      throw error;
    }
  }

  async depositFor(userAddress: string, amount: bigint) {
    try {
      console.log(`Calling depositFor: user=${userAddress}, amount=${amount.toString()}`);
      const tx = await this.savingsVault.depositFor(userAddress, amount);
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);
      return receipt;
    } catch (error) {
      console.error('Error calling depositFor:', error);
      throw error;
    }
  }

  parseUsdcAmount(amount: string): bigint {
    return ethers.parseUnits(amount, 6);
  }

  formatUsdcAmount(amount: bigint): string {
    return ethers.formatUnits(amount, 6);
  }

  getBackendAddress(): string {
    return this.backendWallet.address;
  }
}