import { DecisionEngine } from '../agent/decision-engine';
import { UserFinancialState, DecisionStrategy } from '../agent/types';

/**
 * Test decision engine with various scenarios
 */
function testDecisionEngine() {
  console.log('🧪 Testing Decision Engine');
  console.log('================================\n');

  const engine = new DecisionEngine();

  // Test Case 1: Comfortable balance
  console.log('Test Case 1: Comfortable Balance');
  const state1: UserFinancialState = {
    walletBalance: BigInt(1000_000_000), // 1000 USDC
    currentSavings: BigInt(100_000_000),  // 100 USDC saved
    weeklyGoal: BigInt(25_000_000),       // 25 USDC goal
    safetyBuffer: BigInt(100_000_000),    // 100 USDC buffer
    lastSaveTimestamp: BigInt(0),
    trustMode: 'AUTO',
    isActive: true,
    canAutoSave: true,
    timeSinceLastSave: 48, // 2 days
  };
  const decision1 = engine.decide(state1);

  // Test Case 2: Low balance
  console.log('Test Case 2: Low Balance');
  const state2: UserFinancialState = {
    ...state1,
    walletBalance: BigInt(110_000_000), // 110 USDC
  };
  const decision2 = engine.decide(state2);

  // Test Case 3: Manual mode
  console.log('Test Case 3: Manual Mode');
  const state3: UserFinancialState = {
    ...state1,
    trustMode: 'MANUAL',
  };
  const decision3 = engine.decide(state3);

  // Test Case 4: Rate limited
  console.log('Test Case 4: Rate Limited');
  const state4: UserFinancialState = {
    ...state1,
    canAutoSave: false,
  };
  const decision4 = engine.decide(state4);

  // Test Case 5: Conservative strategy
  console.log('Test Case 5: Conservative Strategy');
  engine.setContext({ strategy: DecisionStrategy.CONSERVATIVE });
  const decision5 = engine.decide(state1);

  // Test Case 6: Aggressive strategy
  console.log('Test Case 6: Aggressive Strategy');
  engine.setContext({ strategy: DecisionStrategy.AGGRESSIVE });
  const decision6 = engine.decide(state1);

  console.log('🎉 All decision engine tests completed!\n');
}

// Run tests
testDecisionEngine();