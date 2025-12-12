// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SavingsVault
 * @notice Core vault contract that holds user deposits and manages savings goals
 * @dev Users deposit USDC, set goals, and funds are later routed to yield strategies
 */
contract SavingsVault is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          STRUCTS
    // =============================================================

    /// @notice User's savings configuration and balance
    struct UserAccount {
        uint256 totalDeposited; // Total USDC deposited by user
        uint256 totalWithdrawn; // Total USDC withdrawn by user
        uint256 currentBalance; // Current balance in vault + yield strategy
        uint256 weeklyGoal; // Target savings per week (in USDC, 6 decimals)
        uint256 safetyBuffer; // Minimum balance to maintain in wallet
        uint256 lastSaveTimestamp; // Last time AI triggered a save
        bool isActive; // Whether user account is active
        TrustMode trustMode; // Manual approval or auto-pilot
    }

    /// @notice Trust mode for AI automation
    enum TrustMode {
        MANUAL, // AI suggests, user approves each save
        AUTO // AI executes automatically
    }

    // =============================================================
    //                       STATE VARIABLES
    // =============================================================

    /// @notice USDC token (we'll use Cronos testnet USDC)
    IERC20 public immutable usdc;

    /// @notice Yield strategy contract (will be set after deployment)
    address public yieldStrategy;

    /// @notice x402 executor contract (authorized to trigger auto-saves)
    address public x402Executor;

    /// @notice Mapping of user address to their account
    mapping(address => UserAccount) public accounts;

    /// @notice Total value locked in the vault (excludes funds in yield strategy)
    uint256 public totalValueLocked;

    /// @notice Minimum deposit amount (prevents dust attacks)
    uint256 public constant MIN_DEPOSIT = 1e6; // 1 USDC

    /// @notice Maximum single save amount (security limit)
    uint256 public constant MAX_SAVE_AMOUNT = 10000e6; // 10,000 USDC

    /// @notice Minimum time between auto-saves per user (rate limiting)
    uint256 public constant MIN_SAVE_INTERVAL = 1 days;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event AccountCreated(address indexed user, uint256 weeklyGoal, uint256 safetyBuffer, TrustMode trustMode);

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);

    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);

    event AutoSaveExecuted(address indexed user, uint256 amount, address triggeredBy);

    event GoalUpdated(address indexed user, uint256 newWeeklyGoal);

    event TrustModeUpdated(address indexed user, TrustMode newMode);

    event YieldStrategyUpdated(address indexed oldStrategy, address indexed newStrategy);

    event X402ExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);

    // =============================================================
    //                          ERRORS
    // =============================================================

    error SavingsVault__InvalidAmount();
    error SavingsVault__InsufficientBalance();
    error SavingsVault__AccountNotActive();
    error SavingsVault__UnauthorizedCaller();
    error SavingsVault__SaveIntervalNotMet();
    error SavingsVault__AmountExceedsLimit();
    error SavingsVault__ZeroAddress();
    error SavingsVault__GoalNotPositive();
    error SavingsVault__AccountAlreadyExists();
    error SavingsVault__EnforcedPause();

    // =============================================================
    //                        CONSTRUCTOR
    // =============================================================

    /// @notice Initialize the vault with USDC address
    /// @param _usdc Address of USDC token on Cronos
    constructor(address _usdc) Ownable(msg.sender) {
        if (_usdc == address(0)) revert SavingsVault__ZeroAddress();
        usdc = IERC20(_usdc);
    }

    // =============================================================
    //                     USER FUNCTIONS
    // =============================================================

    /**
     * @notice Create a new user account with savings goals
     * @param weeklyGoal Target amount to save per week (6 decimals)
     * @param safetyBuffer Minimum balance to keep in wallet (6 decimals)
     * @param trustMode Whether AI needs manual approval or can auto-execute
     */

    function createAccount(uint256 weeklyGoal, uint256 safetyBuffer, TrustMode trustMode) external {
        if (accounts[msg.sender].isActive) revert SavingsVault__AccountAlreadyExists();
        if (weeklyGoal <= 0) revert SavingsVault__GoalNotPositive();

        accounts[msg.sender] = UserAccount({
            totalDeposited: 0,
            totalWithdrawn: 0,
            currentBalance: 0,
            weeklyGoal: weeklyGoal,
            safetyBuffer: safetyBuffer,
            lastSaveTimestamp: 0,
            isActive: true,
            trustMode: trustMode
        });

        emit AccountCreated(msg.sender, weeklyGoal, safetyBuffer, trustMode);
    }

    /**
     * @notice Deposit USDC into the vault
     * @param amount Amount of USDC to deposit (6 decimals)
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount < MIN_DEPOSIT) revert SavingsVault__InvalidAmount();
        if (!accounts[msg.sender].isActive) revert SavingsVault__AccountNotActive();

        // Transfer USDC from user to vault
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update user account
        accounts[msg.sender].totalDeposited += amount;
        accounts[msg.sender].currentBalance += amount;
        totalValueLocked += amount;

        emit Deposited(msg.sender, amount, accounts[msg.sender].currentBalance);
    }

    /**
     * @notice Withdraw USDC from the vault
     * @param amount Amount of USDC to withdraw (6 decimals)
     * @dev For hackathon v1, we withdraw only from vault (not yield strategy yet)
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert SavingsVault__InvalidAmount();
        if (!accounts[msg.sender].isActive) revert SavingsVault__AccountNotActive();
        if (accounts[msg.sender].currentBalance < amount) revert SavingsVault__InsufficientBalance();

        // Update user account
        accounts[msg.sender].totalWithdrawn += amount;
        accounts[msg.sender].currentBalance -= amount;
        totalValueLocked -= amount;

        // Transfer USDC to user
        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, accounts[msg.sender].currentBalance);
    }

    /**
     * @notice Update weekly savings goal
     * @param newWeeklyGoal New target amount per week
     */
    function updateGoal(uint256 newWeeklyGoal) external {
        if (!accounts[msg.sender].isActive) revert SavingsVault__AccountNotActive();
        if (newWeeklyGoal <= 0) revert SavingsVault__GoalNotPositive();

        accounts[msg.sender].weeklyGoal = newWeeklyGoal;
        emit GoalUpdated(msg.sender, newWeeklyGoal);
    }

    /**
     * @notice Update trust mode (manual vs auto)
     * @param newMode New trust mode
     */
    function updateTrustMode(TrustMode newMode) external {
        if (!accounts[msg.sender].isActive) revert SavingsVault__AccountNotActive();

        accounts[msg.sender].trustMode = newMode;
        emit TrustModeUpdated(msg.sender, newMode);
    }

    // =============================================================
    //                   AUTOMATED FUNCTIONS
    // =============================================================

    /**
     * @notice Execute an auto-save (called by x402 executor or user in manual mode)
     * @param user Address of user to save for
     * @param amount Amount to save
     * @dev Can be called by: (1) x402Executor if AUTO mode, (2) user themselves in MANUAL mode
     */
    function autoSave(address user, uint256 amount) external nonReentrant whenNotPaused {
        UserAccount storage account = accounts[user];

        if (!account.isActive) revert SavingsVault__AccountNotActive();
        if (amount == 0 || amount > MAX_SAVE_AMOUNT) revert SavingsVault__AmountExceedsLimit();

        // Authorization check
        if (account.trustMode == TrustMode.AUTO) {
            // Only x402 executor can trigger auto-saves in AUTO mode
            if (msg.sender != x402Executor) revert SavingsVault__UnauthorizedCaller();
        } else {
            // In MANUAL mode, only the user can trigger (after approving in frontend)
            if (msg.sender != user) revert SavingsVault__UnauthorizedCaller();
        }

        // Rate limiting: prevent saves more frequent than MIN_SAVE_INTERVAL
        if (block.timestamp < account.lastSaveTimestamp + MIN_SAVE_INTERVAL) {
            revert SavingsVault__SaveIntervalNotMet();
        }

        // Transfer USDC from user's wallet to vault
        usdc.safeTransferFrom(user, address(this), amount);

        // Update account
        account.totalDeposited += amount;
        account.currentBalance += amount;
        account.lastSaveTimestamp = block.timestamp;
        totalValueLocked += amount;

        emit AutoSaveExecuted(user, amount, msg.sender);
    }

    // =============================================================
    //                     VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get user account details
     * @param user Address of user
     * @return User's account struct
     */
    function getAccount(address user) external view returns (UserAccount memory) {
        return accounts[user];
    }

    /**
     * @notice Check if user can be auto-saved (passed rate limit)
     * @param user Address of user
     * @return bool Whether save is allowed
     */
    function canAutoSave(address user) external view returns (bool) {
        UserAccount memory account = accounts[user];
        if (!account.isActive) return false;
        return block.timestamp >= account.lastSaveTimestamp + MIN_SAVE_INTERVAL;
    }

    // =============================================================
    //                     ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set the yield strategy contract address
     * @param _yieldStrategy Address of VVSYieldStrategy contract
     * @dev Only owner (deployer) can call. Used after deploying yield strategy.
     */
    function setYieldStrategy(address _yieldStrategy) external onlyOwner {
        if (_yieldStrategy == address(0)) revert SavingsVault__ZeroAddress();
        address oldStrategy = yieldStrategy;
        yieldStrategy = _yieldStrategy;
        emit YieldStrategyUpdated(oldStrategy, _yieldStrategy);
    }

    /**
     * @notice Set the x402 executor contract address
     * @param _x402Executor Address of x402Executor contract
     * @dev Only owner can call. Used after deploying x402 executor.
     */
    function setX402Executor(address _x402Executor) external onlyOwner {
        if (_x402Executor == address(0)) revert SavingsVault__ZeroAddress();
        address oldExecutor = x402Executor;
        x402Executor = _x402Executor;
        emit X402ExecutorUpdated(oldExecutor, _x402Executor);
    }

    /**
     * @notice Pause the contract (emergency stop)
     * @dev Only owner can call
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     * @dev Only owner can call
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
