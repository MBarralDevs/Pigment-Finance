import { useState, useEffect, useCallback } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { Dashboard } from './components/Dashboard';
import { AutoSaveButton } from './components/AutoSaveButton';
import { api } from './services/api';
import type { UserAccount } from './types';
import './App.css';

/**
 * Main App Component
 * 
 * This is the "orchestrator" that:
 * 1. Manages global state (wallet address, account data)
 * 2. Coordinates communication between components
 * 3. Handles data loading and refreshing
 * 
 * Component hierarchy:
 * App
 * ├── WalletConnect (connects wallet)
 * ├── Dashboard (displays account data in modern layout)
 * └── AutoSaveButton (triggers save)
 */
function App() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  /**
   * User's wallet address
   * - null when not connected
   * - "0xABC123..." when connected
   */
  const [userAddress, setUserAddress] = useState<string | null>(null);
  
  /**
   * User's account data from backend
   * - null when not loaded
   * - { account: {...}, totalBalance: "...", ... } when loaded
   */
  const [account, setAccount] = useState<UserAccount | null>(null);
  
  /**
   * Is account data being loaded?
   * Used to show "Loading..." state
   */
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);

  // ============================================
  // DATA LOADING
  // ============================================
  
  /**
   * Load user account data from backend
   * 
   * Called when:
   * - User connects wallet (useEffect below)
   * - After successful save (AutoSaveButton callback)
   * 
   * @param address - User's wallet address
   */
  const loadAccount = useCallback(async (address: string) => {
    try {
      setIsLoadingAccount(true);
      
      console.log('📊 Loading account for:', address);
      
      // Call backend API: GET /api/user/:address
      const accountData = await api.getUserAccount(address);
      
      console.log('✅ Account loaded:', accountData);
      
      // Save to state
      setAccount(accountData);
    } catch (error) {
      console.error('❌ Failed to load account:', error);
      // Could show error message to user here
      alert('Failed to load account data');
    } finally {
      // Always stop loading, even if error
      setIsLoadingAccount(false);
    }
  }, []); // Empty dependency array - function never changes

  // ============================================
  // EFFECTS
  // ============================================
  
  /**
   * Effect: Load account when wallet connects
   * 
   * Watches userAddress - when it changes from null to "0xABC...",
   * automatically load the account data
   */
  useEffect(() => {
    if (userAddress) {
      console.log('👛 Wallet connected, loading account...');
      loadAccount(userAddress);
    }
  }, [userAddress, loadAccount]); 
  // ^ Re-run when userAddress or loadAccount changes

  // ============================================
  // EVENT HANDLERS
  // ============================================
  
  /**
   * Handle wallet connection
   * 
   * Called by WalletConnect component when user connects
   * 
   * @param address - User's wallet address
   */
  const handleWalletConnect = (address: string) => {
    console.log('🦊 Wallet connected:', address);
    setUserAddress(address);
    // Note: loadAccount will be called by useEffect above
  };

  /**
   * Handle successful save
   * 
   * Called by AutoSaveButton when save completes
   * Reloads account data to show updated balance
   */
  const handleSaveSuccess = () => {
    console.log('💰 Save successful, refreshing account...');
    
    // Reload account if we have an address
    if (userAddress) {
      loadAccount(userAddress);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div style={{ 
      maxWidth: '1200px',      // Wider for dashboard layout
      margin: '0 auto',        // Center horizontally
      padding: '2rem'          // Space around edges
    }}>
      
      {/* ============================================
          HEADER
          ============================================ */}
      <h1>AI Savings Agent</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Automated DeFi savings powered by Cronos x402 payments
      </p>

      {/* ============================================
          WALLET CONNECTION
          
          Shows:
          - "Connect MetaMask" button if not connected
          - "Connected: 0xABC...123" if connected
          
          When user connects, calls handleWalletConnect
          ============================================ */}
      <div style={{ marginBottom: '2rem' }}>
        <WalletConnect onConnect={handleWalletConnect} />
      </div>

      {/* ============================================
          MAIN CONTENT (Dashboard + Save Button)
          
          Layout: Vertical stack with spacing
          ============================================ */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem'  // Space between components
      }}>
        
        {/* 
          DASHBOARD DISPLAY
          
          Shows:
          - "Welcome" screen (if not connected)
          - "Loading your savings..." (if loading)
          - Full dashboard with metrics, progress, and details (if loaded)
          
          Replaces the old AccountInfo component with a richer,
          more visual dashboard interface
        */}
        <Dashboard 
          account={account} 
          isLoading={isLoadingAccount} 
        />
        
        {/* 
          AUTO SAVE BUTTON
          
          The main action button that:
          - Triggers x402 payment flow
          - Shows status updates
          - Calls handleSaveSuccess when done
          
          Disabled when:
          - Wallet not connected (userAddress = null)
          - Rate limited (canAutoSave = false)
        */}
        <AutoSaveButton
          userAddress={userAddress}
          canAutoSave={account?.canAutoSave ?? false}
          onSuccess={handleSaveSuccess}
        />
      </div>
    </div>
  );
}

export default App;