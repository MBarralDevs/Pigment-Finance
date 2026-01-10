import { 
  Facilitator, 
  CronosNetwork, 
  PaymentRequirements,
  VerifyRequest,
  X402VerifyResponse,
  X402SettleResponse,
  Scheme,
  Contract
} from '@crypto.com/facilitator-client';
import { config } from '../config/env';

export class X402Service {
  private facilitator: Facilitator;
  private network: CronosNetwork;
  private assetContract: Contract;

  constructor() {
    this.network = (config.cronosChainId === 338 
      ? CronosNetwork.CronosTestnet 
      : CronosNetwork.CronosMainnet) as CronosNetwork;

    this.assetContract = this.network === CronosNetwork.CronosTestnet
      ? Contract.DevUSDCe
      : Contract.USDCe;

    this.facilitator = new Facilitator({ 
      network: this.network 
    });

    console.log('✅ x402 service initialized');
    console.log('Network:', this.network);
    console.log('Asset:', this.assetContract);
  }

  /**
   * Verify and settle x402 payment
   * 
   * FIXED: Decode header and pass parsed payload to SDK
   */
  async verifyAndSettle(
    paymentId: string,
    paymentHeader: string,
    paymentRequirements: PaymentRequirements
  ): Promise<{ ok: boolean; txHash?: string; error?: string; details?: any }> {
    try {
      console.log('📝 Processing x402 payment:');
      console.log('  Payment ID:', paymentId);
      console.log('  Network:', this.network);

      // Decode and parse the payment header
      let parsedPayload: any;
      try {
        const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
        parsedPayload = JSON.parse(decoded);
        
        console.log('✅ Payment header decoded');
        console.log('  From:', parsedPayload.from);
        console.log('  To:', parsedPayload.to);
        console.log('  Value:', (parseInt(parsedPayload.value) / 1_000_000).toFixed(2), 'USDC');
      } catch (error) {
        console.error('❌ Failed to parse payment header:', error);
        return {
          ok: false,
          error: 'invalid_payment_header',
          details: { message: 'Could not decode payment header' },
        };
      }

      // Build request body with PARSED payload (not base64)
      const body: VerifyRequest = {
        x402Version: 1,
        paymentHeader: parsedPayload, // ✅ Send parsed object, not base64
        paymentRequirements,
      };

      // Step 1: Verify signature
      console.log('🔍 Verifying payment signature...');
      const verify = (await this.facilitator.verifyPayment(body)) as X402VerifyResponse;
      
      if (!verify.isValid) {
        console.error('❌ Payment verification failed');
        console.error('Reason:', verify.invalidReason);
        return {
          ok: false,
          error: 'verify_failed',
          details: verify,
        };
      }

      console.log('✅ Payment signature verified');

      // Step 2: Settle on-chain
      console.log('⛓️  Settling payment on-chain...');
      const settle = (await this.facilitator.settlePayment(body)) as X402SettleResponse;
      
      if (settle.event !== 'payment.settled') {
        console.error('❌ Payment settlement failed');
        console.error('Event:', settle.event);
        return {
          ok: false,
          error: 'settle_failed',
          details: settle,
        };
      }

      console.log('✅ Payment settled successfully');
      console.log('Transaction hash:', settle.txHash);

      return {
        ok: true,
        txHash: settle.txHash,
      };
    } catch (error: any) {
      console.error('❌ Error in x402 payment flow:', error);
      return {
        ok: false,
        error: error.message || 'Payment processing failed',
        details: { 
          message: error.message,
          stack: error.stack 
        },
      };
    }
  }

  /**
   * Parse X-PAYMENT header
   */
  parsePaymentHeader(headerValue: string): any | null {
    try {
      const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);

      const required = [
        'scheme',
        'network',
        'from',
        'to',
        'value',
        'nonce',
        'v',
        'r',
        's',
      ];

      const missing = required.filter(field => !payload[field]);
      
      if (missing.length > 0) {
        console.error(`❌ Missing required fields: ${missing.join(', ')}`);
        return null;
      }

      return payload;
    } catch (error) {
      console.error('❌ Error parsing payment header:', error);
      return null;
    }
  }

  createPaymentRequirements(
    amount: string,
    paymentId: string
  ): PaymentRequirements {
    return {
      scheme: Scheme.Exact,
      network: this.network,
      payTo: config.savingsVaultAddress,
      asset: this.assetContract,
      maxAmountRequired: amount,
      maxTimeoutSeconds: 300,
      description: 'AI Savings Agent - Auto-save deposit',
      resource: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/api/save`,
      mimeType: 'application/json',
      extra: { paymentId },
    };
  }

  getNetwork(): CronosNetwork {
    return this.network;
  }

  getAssetContract(): Contract {
    return this.assetContract;
  }
}