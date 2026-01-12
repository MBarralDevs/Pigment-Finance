import type { UserAccount } from '../types';

/**
 * Props for AccountInfo component
 */
interface AccountInfoProps {
  account: UserAccount | null;  // User's account data (null if not loaded)
  isLoading: boolean;           // Is data being fetched?
}

/**
 * AccountInfo Component
 * 
 * Displays user's savings account information:
 * - Wallet balance (USDC in user's wallet)
 * - Vault balance (USDC saved in vault)
 * - Weekly goal
 * - Safety buffer
 * - Trust mode (AUTO or MANUAL)
 * - Can auto save? (rate limit check)
 * - Total deposited/withdrawn
 */
export function AccountInfo({ account, isLoading }: AccountInfoProps) {
  /**
   * Loading State
   * 
   * Show while fetching account data from backend
   */
  if (isLoading) {
    return (
      <div style={{ 
        padding: '1.5rem', 
        background: '#f9f9f9', 
        borderRadius: '8px',
        textAlign: 'center',
      }}>
        Loading account...
      </div>
    );
  }

  /**
   * No Account State
   * 
   * Show when wallet not connected yet
   */
  if (!account) {
    return (
      <div style={{ 
        padding: '1.5rem', 
        background: '#f9f9f9', 
        borderRadius: '8px',
        textAlign: 'center',
        color: '#666',
      }}>
        Connect wallet to view account
      </div>
    );
  }

  /**
   * Main Display: Show all account info
   * 
   * Layout: 2-column grid with key metrics
   */
  return (
    <div style={{ 
      padding: '1.5rem', 
      background: '#f9f9f9', 
      borderRadius: '8px' 
    }}>
      <h2 style={{ marginTop: 0 }}>Account Info</h2>
      
      {/* 
        Grid Layout: 2 columns on desktop, 1 on mobile
        Each box shows one metric
      */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '1rem' 
      }}>
        
        {/* ============================================
            WALLET BALANCE (USDC in user's wallet)
            ============================================ */}
        <div>
          <strong>Wallet Balance:</strong>
          <p style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>
            {account.totalBalance} USDC
          </p>
        </div>

        {/* ============================================
            VAULT BALANCE (USDC saved in vault)
            ============================================ */}
        <div>
          <strong>Vault Balance:</strong>
          <p style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>
            {account.account.currentBalance} USDC
          </p>
        </div>

        {/* ============================================
            WEEKLY GOAL (How much to save per week)
            ============================================ */}
        <div>
          <strong>Weekly Goal:</strong>
          <p style={{ fontSize: '1.25rem', margin: '0.5rem 0' }}>
            {account.account.weeklyGoal} USDC
          </p>
        </div>

        {/* ============================================
            SAFETY BUFFER (Minimum wallet balance to keep)
            ============================================ */}
        <div>
          <strong>Safety Buffer:</strong>
          <p style={{ fontSize: '1.25rem', margin: '0.5rem 0' }}>
            {account.account.safetyBuffer} USDC
          </p>
        </div>

        {/* ============================================
            TRUST MODE (AUTO or MANUAL)
            - AUTO: Agent can save automatically
            - MANUAL: User must approve each save
            ============================================ */}
        <div>
          <strong>Trust Mode:</strong>
          <p style={{ margin: '0.5rem 0' }}>
            <span style={{
              padding: '0.25rem 0.75rem',
              // Green for AUTO, Orange for MANUAL
              background: account.account.trustMode === 'AUTO' ? '#4CAF50' : '#FF9800',
              color: 'white',
              borderRadius: '4px',
              fontWeight: 'bold',
            }}>
              {account.account.trustMode}
            </span>
          </p>
        </div>

        {/* ============================================
            CAN AUTO SAVE? (Rate limit check)
            - Green (Yes): Can save now
            - Red (No): Must wait 24 hours
            ============================================ */}
        <div>
          <strong>Can Auto Save:</strong>
          <p style={{ margin: '0.5rem 0' }}>
            <span style={{
              padding: '0.25rem 0.75rem',
              // Green if can save, Red if rate limited
              background: account.canAutoSave ? '#4CAF50' : '#f44336',
              color: 'white',
              borderRadius: '4px',
              fontWeight: 'bold',
            }}>
              {account.canAutoSave ? 'Yes' : 'No (Rate Limited)'}
            </span>
          </p>
        </div>
      </div>

      {/* ============================================
          ADDITIONAL INFO (smaller text at bottom)
          - Total deposited (lifetime)
          - Total withdrawn (lifetime)
          ============================================ */}
      <div style={{ 
        marginTop: '1rem', 
        fontSize: '0.875rem', 
        color: '#666',
        borderTop: '1px solid #ddd',
        paddingTop: '1rem',
      }}>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Total Deposited:</strong> {account.account.totalDeposited} USDC
        </p>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Total Withdrawn:</strong> {account.account.totalWithdrawn} USDC
        </p>
      </div>
    </div>
  );
}