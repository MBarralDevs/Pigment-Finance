import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';

/**
 * Hook for managing USDC approval for the vault
 * 
 * This allows users to approve the vault to spend their USDC
 * before they can use the save functionality
 */

const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

const VAULT_ADDRESS = import.meta.env.VITE_VAULT_ADDRESS || '0x349bC1BD3BB0A0A82468a56EA4Df85Ca24f3869c';
const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS || '0x77C03DB7c301cA660a813ea828005f2F5B5aedAD';

export interface UseApprovalResult {
  isApproved: boolean;
  isChecking: boolean;
  isApproving: boolean;
  error: string | null;
  checkApproval: (userAddress: string) => Promise<void>;
  approveVault: () => Promise<void>;
}

export function useApproval(): UseApprovalResult {
  const [isApproved, setIsApproved] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if user has approved the vault
   */
  const checkApproval = async (userAddress: string) => {
    try {
      setIsChecking(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new BrowserProvider(window.ethereum);
      const usdc = new Contract(USDC_ADDRESS, USDC_ABI, provider);

      // Check allowance
      const allowance = await usdc.allowance(userAddress, VAULT_ADDRESS);
      
      // Consider approved if allowance > 1000 USDC (more than enough for testing)
      const minAllowance = BigInt(1000_000_000); // 1000 USDC (6 decimals)
      setIsApproved(allowance >= minAllowance);

    } catch (err: any) {
      console.error('Error checking approval:', err);
      setError(err.message);
      setIsApproved(false);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Approve vault to spend unlimited USDC
   */
  const approveVault = async () => {
    try {
      setIsApproving(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const usdc = new Contract(USDC_ADDRESS, USDC_ABI, signer);

      // Approve unlimited (common practice for better UX)
      // Alternative: Use specific amount like parseUnits('10000', 6)
      const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      
      console.log('📝 Requesting approval...');
      const tx = await usdc.approve(VAULT_ADDRESS, MAX_UINT256);
      
      console.log('⏳ Waiting for confirmation...');
      await tx.wait();
      
      console.log('✅ Approval successful!');
      setIsApproved(true);

    } catch (err: any) {
      console.error('Error approving vault:', err);
      
      // User rejected transaction
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        setError('Approval rejected. Please approve to continue.');
      } else {
        setError(err.message || 'Failed to approve');
      }
      
      setIsApproved(false);
    } finally {
      setIsApproving(false);
    }
  };

  return {
    isApproved,
    isChecking,
    isApproving,
    error,
    checkApproval,
    approveVault,
  };
}