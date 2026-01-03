import { Facilitator, CronosNetwork, PaymentRequirements } from '@crypto.com/facilitator-client';
import { config } from '../config/env';
import { X402PaymentPayload, X402VerifyResponse } from '../types';

/**
 * X402Service
 * 
 * Integrates with Cronos x402 Facilitator for gasless USDC payments.
 * 
 * Flow:
 * 1. User creates EIP-3009 signature off-chain (free)
 * 2. Frontend sends signature in X-PAYMENT header
 * 3. We verify and settle with Cronos Facilitator
 * 4. Facilitator executes USDC.transferWithAuthorization()
 * 5. USDC moves to vault, facilitator pays gas
 */
export class X402Service {
  private facilitator: Facilitator;
  private network: CronosNetwork;

  constructor() {
    // Determine network from config (cronos-testnet or cronos-mainnet)
    this.network = (config.cronosChainId === 338 
      ? 'cronos-testnet' 
      : 'cronos-mainnet') as CronosNetwork;

    // Initialize Facilitator SDK
    this.facilitator = new Facilitator({ 
      network: this.network 
    });

    console.log('✅ x402 service initialized');
    console.log('Network:', this.network);
  }

  /**
   * Verify and settle x402 payment
   * 
   * This uses the Facilitator SDK to:
   * 1. Verify the EIP-3009 signature is valid
   * 2. Settle the payment on-chain via transferWithAuthorization
   * 3. Return transaction hash
   * 
   * @param paymentId - Unique ID for this payment (can be user address + timestamp)
   * @param paymentHeader - Base64-encoded payment payload from X-PAYMENT header
   * @param paymentRequirements - Requirements we sent in 402 response
   */
  async verifyAndSettle(
    paymentId: string,
    paymentHeader: string,
    paymentRequirements: PaymentRequirements
  ): Promise<X402VerifyResponse> {
    try {
      console.log('📝 Processing x402 payment:');
      console.log('  Payment ID:', paymentId);
      console.log('  Network:', this.network);

      // Use Facilitator SDK to verify and settle
      // This handles both verification and on-chain settlement
      const result = await this.facilitator.verifyAndSettle({
        paymentId,
        paymentHeader,
        paymentRequirements,
      });

      if (!result.success) {
        console.error('❌ Payment failed:', result.error);
        return {
          isValid: false,
          error: result.error || 'Payment verification/settlement failed',
        };
      }

      console.log('✅ Payment settled successfully');
      console.log('Transaction hash:', result.transactionHash);

      return {
        isValid: true,
        transactionHash: result.transactionHash,
      };
    } catch (error: any) {
      console.error('❌ Error in x402 payment flow:', error);
      return {
        isValid: false,
        error: error.message || 'Payment processing failed',
      };
    }
  }
}