import type { UserAccount } from '../types';

interface DashboardProps {
  account: UserAccount | null;
  isLoading: boolean;
}

/**
 * Dashboard Component
 * 
 * Main dashboard layout that organizes account info into sections:
 * - Header with total balance
 * - Savings progress
 * - Account details
 * - Yield information
 */
export function Dashboard({ account, isLoading }: DashboardProps) {
  if (isLoading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: '#f9f9f9',
        borderRadius: '12px',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #5865F2',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: '#666' }}>Loading your savings...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        color: 'white',
      }}>
        <h2 style={{ marginTop: 0, fontSize: '2rem' }}>Welcome to AI Savings Agent</h2>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Connect your wallet to start saving automatically with AI-powered decisions
        </p>
      </div>
    );
  }

  // Calculate helpful metrics
  const walletBalance = parseFloat(account.walletBalance);
  const vaultBalance = parseFloat(account.account.currentBalance);
  const totalBalance = parseFloat(account.totalBalance);
  const weeklyGoal = parseFloat(account.account.weeklyGoal);
  const yieldEarned = totalBalance - vaultBalance;
  const goalProgress = (vaultBalance / weeklyGoal) * 100;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    }}>
      
      {/* ===========================================
          HEADER CARD - Total Balance
          =========================================== */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem',
        borderRadius: '12px',
        color: 'white',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Total Balance
        </p>
        <h1 style={{ 
          margin: '0.5rem 0', 
          fontSize: '3rem', 
          fontWeight: 'bold',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          {totalBalance.toFixed(2)} USDC
        </h1>
        {yieldEarned > 0 && (
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem' }}>
            💰 +{yieldEarned.toFixed(4)} USDC earned from yield
          </p>
        )}
      </div>

      {/* ===========================================
          STATS GRID - Quick Overview
          =========================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}>
        {/* Wallet Balance */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.875rem', fontWeight: '600' }}>
            💳 Wallet
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: 'bold', color: '#333' }}>
            {walletBalance.toFixed(2)}
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#999' }}>USDC</p>
        </div>

        {/* Vault Balance */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.875rem', fontWeight: '600' }}>
            🏦 Vault
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: 'bold', color: '#333' }}>
            {vaultBalance.toFixed(2)}
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#999' }}>USDC saved</p>
        </div>

        {/* Weekly Goal */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '0.875rem', fontWeight: '600' }}>
            🎯 Weekly Goal
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: 'bold', color: '#333' }}>
            {weeklyGoal.toFixed(2)}
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#999' }}>USDC target</p>
        </div>
      </div>

      {/* ===========================================
          PROGRESS BAR - Weekly Goal
          =========================================== */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ margin: 0, fontWeight: '600', color: '#333' }}>Progress to Weekly Goal</p>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#5865F2' }}>
            {Math.min(goalProgress, 100).toFixed(0)}%
          </p>
        </div>
        
        {/* Progress bar */}
        <div style={{
          background: '#f0f0f0',
          height: '12px',
          borderRadius: '6px',
          overflow: 'hidden',
        }}>
          <div style={{
            background: goalProgress >= 100 
              ? 'linear-gradient(90deg, #4CAF50 0%, #45a049 100%)'
              : 'linear-gradient(90deg, #5865F2 0%, #4752C4 100%)',
            height: '100%',
            width: `${Math.min(goalProgress, 100)}%`,
            transition: 'width 0.3s ease',
            borderRadius: '6px',
          }} />
        </div>
        
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#666' }}>
          {vaultBalance.toFixed(2)} of {weeklyGoal.toFixed(2)} USDC
          {goalProgress >= 100 && ' 🎉 Goal reached!'}
        </p>
      </div>

      {/* ===========================================
          ACCOUNT DETAILS
          =========================================== */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>Account Settings</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Safety Buffer</p>
            <p style={{ margin: '0.25rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
              {parseFloat(account.account.safetyBuffer).toFixed(2)} USDC
            </p>
          </div>
          
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Trust Mode</p>
            <p style={{ margin: '0.25rem 0' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                background: account.account.trustMode === 'AUTO' ? '#4CAF50' : '#FF9800',
                color: 'white',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 'bold',
              }}>
                {account.account.trustMode}
              </span>
            </p>
          </div>
          
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Can Auto Save</p>
            <p style={{ margin: '0.25rem 0' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                background: account.canAutoSave ? '#4CAF50' : '#f44336',
                color: 'white',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 'bold',
              }}>
                {account.canAutoSave ? 'Yes' : 'Rate Limited'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add spinning animation in a style tag
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);