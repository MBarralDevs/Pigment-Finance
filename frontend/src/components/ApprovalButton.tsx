import { useEffect } from 'react';
import { useApproval } from '../hooks/useApproval';

interface ApprovalButtonProps {
  userAddress: string | null;
  onApprovalChange?: (isApproved: boolean) => void;
}

/**
 * ApprovalButton Component
 * 
 * Displays approval status and button to approve vault spending USDC.
 * This is required before users can save to the vault.
 * 
 * Features:
 * - Auto-checks approval status when wallet connects
 * - Shows clear status (Approved / Not Approved)
 * - One-click approval with MetaMask
 * - Beautiful UI matching the rest of the app
 */
export function ApprovalButton({ userAddress, onApprovalChange }: ApprovalButtonProps) {
  const { 
    isApproved, 
    isChecking, 
    isApproving, 
    error, 
    checkApproval, 
    approveVault 
  } = useApproval();

  // Check approval when wallet connects
  useEffect(() => {
    if (userAddress) {
      checkApproval(userAddress);
    }
  }, [userAddress]);

  // Notify parent when approval changes
  useEffect(() => {
    if (onApprovalChange) {
      onApprovalChange(isApproved);
    }
  }, [isApproved, onApprovalChange]);

  // Don't show if no wallet connected
  if (!userAddress) {
    return null;
  }

  // Loading state
  if (isChecking) {
    return (
      <div style={{
        padding: '1.5rem',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e8e8e8',
        textAlign: 'center',
      }}>
        <div className="loading-spinner" style={{
          width: '32px',
          height: '32px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          margin: '0 auto',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ marginTop: '1rem', color: '#666' }}>
          Checking approval status...
        </p>
      </div>
    );
  }

  // Already approved - show success message
  if (isApproved) {
    return (
      <div style={{
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(69, 160, 73, 0.1) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(76, 175, 80, 0.3)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
          }}>
            ✅
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '0.25rem',
              color: '#4CAF50',
              fontSize: '1.1rem',
              fontWeight: '700',
            }}>
              Vault Approved!
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              You can now save USDC to your vault
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not approved - show approval button
  return (
    <div style={{
      padding: '2rem',
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e8e8e8',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'start',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(245, 124, 0, 0.1) 100%)',
          border: '2px solid rgba(255, 152, 0, 0.3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          flexShrink: 0,
        }}>
          ⚠️
        </div>
        <div>
          <h3 style={{ 
            margin: 0, 
            marginBottom: '0.5rem',
            color: '#1a1a1a',
            fontSize: '1.3rem',
            fontWeight: '700',
          }}>
            Approval Required
          </h3>
          <p style={{ 
            margin: 0, 
            color: '#666',
            fontSize: '0.95rem',
            lineHeight: '1.6',
          }}>
            Before you can save, you need to approve the vault contract to spend your USDC. 
            This is a one-time approval and is standard for DeFi applications.
          </p>
        </div>
      </div>

      <button
        onClick={approveVault}
        disabled={isApproving}
        style={{
          width: '100%',
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          fontWeight: '700',
          background: isApproving 
            ? '#cccccc'
            : 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: isApproving ? 'wait' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)',
        }}
        onMouseEnter={(e) => {
          if (!isApproving) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 152, 0, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isApproving) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.3)';
          }
        }}
      >
        {isApproving ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span className="loading-spinner" style={{
              width: '20px',
              height: '20px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTop: '3px solid white',
              borderRadius: '50%',
            }} />
            Approving...
          </span>
        ) : (
          '🔐 Approve Vault to Spend USDC'
        )}
      </button>

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(211, 47, 47, 0.1) 100%)',
          border: '1px solid rgba(244, 67, 54, 0.3)',
          borderRadius: '8px',
          color: '#d32f2f',
          fontSize: '0.9rem',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: '#f9f9f9',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: '#666',
        lineHeight: '1.6',
      }}>
        <strong style={{ color: '#667eea' }}>ℹ️ What is approval?</strong><br />
        Approval is an ERC-20 token standard that allows smart contracts to spend your tokens on your behalf. 
        This is required for the vault to deposit your USDC when you click save. You only need to approve once.
      </div>
    </div>
  );
}