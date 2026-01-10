import { ethers } from 'ethers';
import {
  EIP712Domain,
  TransferWithAuthorization,
  SignedAuthorization,
  getUSDCDomain,
  createTypedData,
  generateNonce,
  parseSignature,
} from './eip3009';

/**
 * PaymentSigner
 * 
 * Generates EIP-3009 signatures for gasless USDC transfers.
 * 
 * Process:
 * 1. Create authorization parameters (from, to, value, validity)
 * 2. Generate unique nonce
 * 3. Sign using EIP-712 typed data
 * 4. Return signed authorization
 * 
 * The signature can then be submitted to x402 Facilitator
 * which executes the transfer on-chain.
 */
export class PaymentSigner {
  private wallet: ethers.Wallet;
  private domain: EIP712Domain;

  /**
   * Create a new PaymentSigner
   * 
   * @param privateKey - Private key of the wallet signing the payment
   * @param chainId - Chain ID (338 for Cronos testnet)
   * @param usdcAddress - USDC contract address
   */
  constructor(privateKey: string, chainId: number, usdcAddress: string) {
    this.wallet = new ethers.Wallet(privateKey);
    this.domain = getUSDCDomain(chainId, usdcAddress);
    
    console.log('🔐 Payment signer initialized');
    console.log('Signer address:', this.wallet.address);
  }

  /**
   * Sign a payment authorization
   * 
   * @param to - Recipient address (vault)
   * @param amount - Amount in smallest unit (6 decimals)
   * @param validityWindow - How long signature is valid (seconds)
   * @returns Signed authorization with v, r, s signature components
   */
  async signPayment(
    to: string,
    amount: bigint,
    validityWindow: number = 300 // 5 minutes default
  ): Promise<SignedAuthorization> {
    const now = Math.floor(Date.now() / 1000);
    
    // Create authorization parameters
    const authorization: TransferWithAuthorization = {
      from: this.wallet.address,
      to,
      value: amount.toString(),
      validAfter: '0', // Valid immediately
      validBefore: (now + validityWindow).toString(), // Valid for 5 minutes
      nonce: generateNonce(),
    };

    console.log('\n🔐 Signing payment authorization');
    console.log('From:', authorization.from);
    console.log('To:', authorization.to);
    console.log('Amount:', this.formatAmount(BigInt(authorization.value)), 'USDC');
    console.log('Valid until:', new Date(parseInt(authorization.validBefore) * 1000).toISOString());
    console.log('Nonce:', authorization.nonce.slice(0, 10) + '...');

    // Create EIP-712 typed data
    const typedData = createTypedData(this.domain, authorization);

    // Sign using EIP-712
    const signature = await this.wallet.signTypedData(
      typedData.domain,
      { TransferWithAuthorization: typedData.types.TransferWithAuthorization },
      typedData.message
    );

    console.log('✅ Signature generated:', signature.slice(0, 20) + '...');

    // Parse signature into v, r, s
    const { v, r, s } = parseSignature(signature);

    // Return complete signed authorization
    return {
      ...authorization,
      v,
      r,
      s,
    };
  }

  /**
   * Create base64-encoded payment header for x402
   * This is what goes in the X-PAYMENT header
   * 
   * @param signedAuth - Signed authorization from signPayment()
   * @returns Base64-encoded JSON string
   */
  createPaymentHeader(signedAuth: SignedAuthorization): string {
    const payload = {
      scheme: 'exact',
      network: `eip155:${this.domain.chainId}`,
      from: signedAuth.from,
      to: signedAuth.to,
      value: signedAuth.value,
      validAfter: parseInt(signedAuth.validAfter),
      validBefore: parseInt(signedAuth.validBefore),
      nonce: signedAuth.nonce,
      v: signedAuth.v,
      r: signedAuth.r,
      s: signedAuth.s,
    };

    const json = JSON.stringify(payload);
    const base64 = Buffer.from(json).toString('base64');

    console.log('📝 Payment header created (base64)');
    console.log('Length:', base64.length, 'characters');

    return base64;
  }

  /**
   * Sign and create payment header in one step
   * Convenience method that combines signPayment() and createPaymentHeader()
   * 
   * @param to - Recipient address
   * @param amount - Amount in smallest unit
   * @param validityWindow - Validity in seconds
   * @returns Base64-encoded payment header ready for X-PAYMENT
   */
  async signAndCreateHeader(
    to: string,
    amount: bigint,
    validityWindow: number = 300
  ): Promise<string> {
    const signedAuth = await this.signPayment(to, amount, validityWindow);
    return this.createPaymentHeader(signedAuth);
  }

  /**
   * Get signer address
   */
  getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Helper: Format amount for display
   */
  private formatAmount(amount: bigint): string {
    return (Number(amount) / 1_000_000).toFixed(2);
  }
}