import { useState, useCallback } from 'react';
import { Facilitator } from '@crypto.com/facilitator-client';
import { BrowserProvider } from 'ethers';
import { api } from '../services/api';
import type { PaymentChallenge } from '../types';

/**
 * Return value from useAutoSave hook
 */
export interface UseAutoSaveResult {
  status: string;              // Human-readable status for UI
  isLoading: boolean;          // Is operation in progress?
  error: string | null;        // Error message if failed
  lastTxHash: string | null;   // Last successful transaction hash
  executeSave: (userAddress: string, amount: string) => Promise<void>;
}

/**
 * Hook for executing auto-save with x402 payment flow
 * 
 * This implements the EXACT same flow as the Cronos example:
 * 1. Request resource (POST /api/save)
 * 2. Get 402 challenge
 * 3. Generate payment header with SDK
 * 4. Submit payment
 * 5. Success!
 */
export function useAutoSave(): UseAutoSaveResult {
  // UI state
  const [status, setStatus] = useState<string>('Ready');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  /**
   * Main function that executes the save with x402 payment
   * 
   * This is the "magic" function that ties everything together!
   */
  const executeSave = useCallback(async (userAddress: string, amount: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setStatus('Requesting save...');

      // ============================================
      // STEP 1: Request save (expect 402 challenge)
      // ============================================
      console.log('📝 Step 1: Requesting save from backend');
      const response = await api.triggerSave(userAddress, amount);

      // Check if backend returned a payment challenge
      if ('error' in response && response.error === 'payment_required') {
        console.log('💳 Step 2: Payment required - got 402 challenge');
        const challenge = response as PaymentChallenge;
        
        setStatus('Payment required - preparing signature...');

        // ============================================
        // STEP 2: Connect to MetaMask
        // ============================================
        console.log('🦊 Step 3: Connecting to MetaMask');
        
        if (!window.ethereum) {
          throw new Error('MetaMask not installed');
        }

        // Create ethers provider from MetaMask
        const provider = new BrowserProvider(window.ethereum);
        
        // Request account access (triggers MetaMask popup if needed)
        await provider.send('eth_requestAccounts', []);
        
        // Get signer (needed to sign the payment)
        const signer = await provider.getSigner();

        setStatus('Requesting signature from MetaMask...');

        // ============================================
        // STEP 3: Generate payment header with SDK
        // ============================================
        console.log('🔐 Step 4: Generating payment header with Facilitator SDK');
        
        // Create Facilitator instance (same as Cronos example)
        const facilitator = new Facilitator({
          network: challenge.paymentRequirements.network,
        });

        // Generate payment header - THIS IS THE KEY PART!
        // The SDK handles all the EIP-3009 signing for us
        const paymentHeader = await facilitator.generatePaymentHeader({
          to: challenge.paymentRequirements.payTo,           // Vault address
          value: challenge.paymentRequirements.maxAmountRequired, // "25000000"
          asset: challenge.paymentRequirements.asset,        // USDC contract
          signer,                                            // MetaMask signer
          validBefore: Math.floor(Date.now() / 1000) + challenge.paymentRequirements.maxTimeoutSeconds,
          validAfter: 0,
        });

        console.log('✅ Payment header generated (base64):', paymentHeader.substring(0, 50) + '...');

        setStatus('Submitting payment...');

        // ============================================
        // STEP 4: Submit payment to backend
        // ============================================
        console.log('📤 Step 5: Submitting payment with X-PAYMENT header');
        
        const paymentResponse = await api.triggerSave(
          userAddress,
          amount,
          paymentHeader,              // The signed payment!
          challenge.paymentId         // Payment ID from 402 challenge
        );

        // Check if payment succeeded
        if ('success' in paymentResponse && paymentResponse.success) {
          console.log('🎉 Payment successful!');
          console.log('Payment TX:', paymentResponse.data.paymentTxHash);
          console.log('Deposit TX:', paymentResponse.data.depositTxHash);
          
          setStatus('Save successful!');
          setLastTxHash(paymentResponse.data.depositTxHash);
          setError(null);
        } else {
          // Payment failed
          throw new Error(
            'error' in paymentResponse
              ? paymentResponse.error
              : 'Unknown error'
          );
        }
      } else if ('success' in response && response.success) {
        // Unexpected - got success without needing payment
        // (This shouldn't happen in normal flow)
        console.log('✅ Save successful without payment');
        setStatus('Save successful (no payment required)!');
        setLastTxHash(response.data.depositTxHash);
      } else {
        // Some other error
        throw new Error(
          'error' in response ? response.error : 'Unknown error'
        );
      }
    } catch (err: any) {
      // Handle any errors
      console.error('❌ Save error:', err);
      setError(err.message || 'Failed to execute save');
      setStatus('Error');
    } finally {
      // Always stop loading spinner
      setIsLoading(false);
    }
  }, []);

  return {
    status,
    isLoading,
    error,
    lastTxHash,
    executeSave,
  };
}