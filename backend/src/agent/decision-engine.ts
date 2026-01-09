import { UserFinancialState, SaveDecision, DecisionStrategy, DecisionContext } from './types';

/**
 * DecisionEngine
 * 
 * AI-powered decision maker for automated savings.
 * 
 * Decision Factors:
 * 1. Available funds (wallet balance - safety buffer)
 * 2. Progress toward weekly goal
 * 3. Time since last save
 * 4. Trust mode (AUTO only)
 * 5. Rate limits
 * 
 * Strategies:
 * - CONSERVATIVE: Only save when 2x safety buffer available
 * - BALANCED: Save when comfortable margin exists
 * - AGGRESSIVE: Save maximum possible while respecting buffer
 */
export class DecisionEngine {
  private context: DecisionContext;

  constructor(context?: Partial<DecisionContext>) {
    // Default decision context
    this.context = {
      strategy: context?.strategy || DecisionStrategy.BALANCED,
      minSaveAmount: context?.minSaveAmount || BigInt(1_000_000), // 1 USDC
      maxSavePercentage: context?.maxSavePercentage || 0.5, // 50% of available
    };
  }

  /**
   * Main decision function
   * Analyzes user's financial state and returns save decision
   */
  decide(state: UserFinancialState): SaveDecision {
    console.log('\n🧠 Decision Engine Analysis');
    console.log('================================');

    // Pre-checks: Basic requirements
    const preCheckResult = this.preChecks(state);
    if (!preCheckResult.shouldSave) {
      return preCheckResult;
    }

    // Calculate available funds
    const availableFunds = this.calculateAvailableFunds(state);
    console.log(`💰 Available funds: ${this.formatUsdc(availableFunds)} USDC`);

    // Not enough to save
    if (availableFunds < this.context.minSaveAmount) {
      return {
        shouldSave: false,
        amount: 0n,
        reason: `Available funds (${this.formatUsdc(availableFunds)} USDC) below minimum (${this.formatUsdc(this.context.minSaveAmount)} USDC)`,
        confidence: 1.0,
        urgency: 'low',
      };
    }

    // Calculate optimal save amount based on strategy
    const optimalAmount = this.calculateOptimalAmount(state, availableFunds);
    console.log(`📊 Optimal amount: ${this.formatUsdc(optimalAmount)} USDC`);

    // Calculate urgency
    const urgency = this.calculateUrgency(state, optimalAmount);

    // Calculate confidence
    const confidence = this.calculateConfidence(state, availableFunds, optimalAmount);

    // Final decision
    const shouldSave = optimalAmount >= this.context.minSaveAmount;
    const reason = shouldSave
      ? this.buildSaveReason(state, optimalAmount, availableFunds)
      : 'Amount too small to save';

    console.log(`✅ Decision: ${shouldSave ? 'SAVE' : 'SKIP'}`);
    console.log(`📝 Reason: ${reason}`);
    console.log(`🎯 Confidence: ${(confidence * 100).toFixed(0)}%`);
    console.log(`⚡ Urgency: ${urgency}`);
    console.log('');

    return {
      shouldSave,
      amount: shouldSave ? optimalAmount : 0n,
      reason,
      confidence,
      urgency,
    };
  }

  /**
   * Pre-flight checks
   * Validates basic requirements before analysis
   */
  private preChecks(state: UserFinancialState): SaveDecision {
    // Check 1: Account must be active
    if (!state.isActive) {
      return {
        shouldSave: false,
        amount: 0n,
        reason: 'Account is not active',
        confidence: 1.0,
        urgency: 'low',
      };
    }

    // Check 2: Must be in AUTO mode
    if (state.trustMode !== 'AUTO') {
      return {
        shouldSave: false,
        amount: 0n,
        reason: 'Account is in MANUAL mode - requires user approval',
        confidence: 1.0,
        urgency: 'low',
      };
    }

    // Check 3: Must pass rate limit
    if (!state.canAutoSave) {
      return {
        shouldSave: false,
        amount: 0n,
        reason: 'Rate limit not met - must wait 24 hours between saves',
        confidence: 1.0,
        urgency: 'low',
      };
    }

    // All checks passed
    return {
      shouldSave: true,
      amount: 0n,
      reason: 'Pre-checks passed',
      confidence: 1.0,
      urgency: 'low',
    };
  }

  /**
   * Calculate available funds
   * Funds available = wallet balance - safety buffer
   */
  private calculateAvailableFunds(state: UserFinancialState): bigint {
    const available = state.walletBalance - state.safetyBuffer;
    return available > 0n ? available : 0n;
  }

  /**
   * Calculate optimal save amount based on strategy
   */
  private calculateOptimalAmount(state: UserFinancialState, availableFunds: bigint): bigint {
    switch (this.context.strategy) {
      case DecisionStrategy.CONSERVATIVE:
        return this.conservativeStrategy(state, availableFunds);
      
      case DecisionStrategy.BALANCED:
        return this.balancedStrategy(state, availableFunds);
      
      case DecisionStrategy.AGGRESSIVE:
        return this.aggressiveStrategy(state, availableFunds);
      
      default:
        return this.balancedStrategy(state, availableFunds);
    }
  }

  /**
   * Conservative Strategy
   * Only save when we have 2x safety buffer
   * Save up to 25% of available funds or weekly goal, whichever is smaller
   */
  private conservativeStrategy(state: UserFinancialState, availableFunds: bigint): bigint {
    // Need at least 2x safety buffer to feel comfortable
    const comfortableThreshold = state.safetyBuffer * 2n;
    if (state.walletBalance < comfortableThreshold) {
      return 0n;
    }

    // Save up to 25% of available or weekly goal
    const maxAmount = (availableFunds * 25n) / 100n;
    return this.min(maxAmount, state.weeklyGoal);
  }

  /**
   * Balanced Strategy (Default)
   * Save when above safety buffer
   * Save up to 50% of available funds or weekly goal
   */
  private balancedStrategy(state: UserFinancialState, availableFunds: bigint): bigint {
    // Calculate max we're willing to save (50% of available)
    const maxFromPercentage = (availableFunds * BigInt(this.context.maxSavePercentage * 100)) / 100n;
    
    // Don't exceed weekly goal
    const maxAmount = this.min(maxFromPercentage, state.weeklyGoal);
    
    // Don't save more than available
    return this.min(maxAmount, availableFunds);
  }

  /**
   * Aggressive Strategy
   * Save maximum possible while respecting safety buffer
   * Can save up to 80% of available funds
   */
  private aggressiveStrategy(state: UserFinancialState, availableFunds: bigint): bigint {
    // Save up to 80% of available
    const maxAmount = (availableFunds * 80n) / 100n;
    
    // But cap at weekly goal
    return this.min(maxAmount, state.weeklyGoal);
  }

  /**
   * Calculate urgency of save
   * Based on time since last save and progress toward goal
   */
  private calculateUrgency(state: UserFinancialState, amount: bigint): 'low' | 'medium' | 'high' {
    // High urgency: Haven't saved in a week and amount is close to goal
    if (state.timeSinceLastSave >= 168 && amount >= state.weeklyGoal / 2n) {
      return 'high';
    }

    // Medium urgency: Haven't saved in 3 days
    if (state.timeSinceLastSave >= 72) {
      return 'medium';
    }

    // Low urgency: Regular save
    return 'low';
  }

  /**
   * Calculate confidence score
   * Higher when more funds available and amount is reasonable
   */
  private calculateConfidence(
    state: UserFinancialState,
    availableFunds: bigint,
    amount: bigint
  ): number {
    // Base confidence
    let confidence = 0.5;

    // Increase confidence if well above safety buffer
    const bufferRatio = Number(state.walletBalance) / Number(state.safetyBuffer);
    if (bufferRatio > 2) confidence += 0.2;
    if (bufferRatio > 3) confidence += 0.1;

    // Increase confidence if amount is reasonable (not too small, not too large)
    const amountRatio = Number(amount) / Number(availableFunds);
    if (amountRatio > 0.1 && amountRatio < 0.7) confidence += 0.1;

    // Increase confidence if saving toward goal
    if (amount <= state.weeklyGoal) confidence += 0.1;

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Build human-readable reason for save decision
   */
  private buildSaveReason(
    state: UserFinancialState,
    amount: bigint,
    availableFunds: bigint
  ): string {
    const parts: string[] = [];

    // Wallet status
    parts.push(`Wallet has ${this.formatUsdc(state.walletBalance)} USDC`);

    // Available after buffer
    parts.push(`${this.formatUsdc(availableFunds)} USDC available after ${this.formatUsdc(state.safetyBuffer)} USDC safety buffer`);

    // Goal progress
    const goalProgress = (Number(amount) / Number(state.weeklyGoal)) * 100;
    parts.push(`Saving ${this.formatUsdc(amount)} USDC (${goalProgress.toFixed(0)}% of weekly goal)`);

    // Strategy
    parts.push(`Using ${this.context.strategy} strategy`);

    return parts.join('. ');
  }

  /**
   * Helper: Get minimum of two bigints
   */
  private min(a: bigint, b: bigint): bigint {
    return a < b ? a : b;
  }

  /**
   * Helper: Format USDC amount
   */
  private formatUsdc(amount: bigint): string {
    return (Number(amount) / 1_000_000).toFixed(2);
  }

  /**
   * Update decision context (strategy, limits)
   */
  setContext(context: Partial<DecisionContext>) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get current context
   */
  getContext(): DecisionContext {
    return { ...this.context };
  }
}