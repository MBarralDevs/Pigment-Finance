// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// =============================================================
//                          INTERFACES
// =============================================================

/// @notice Uniswap V2 Router interface (VVS uses same interface)
interface IVVSRouter {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/// @notice Uniswap V2 Pair interface
interface IVVSPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function totalSupply() external view returns (uint256);
}

/**
 * @title VVSYieldStrategy
 * @notice Manages yield generation by depositing USDC into VVS Finance liquidity pools
 * @dev Integrates with VVS Router (Uniswap V2 style) to provide liquidity and earn trading fees
 */
contract VVSYieldStrategy is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // =============================================================
    //                    IMMUTABLE VARIABLES
    // =============================================================

    /// @notice VVS Router contract
    IVVSRouter public immutable i_VVS_ROUTER;

    /// @notice USDC token
    IERC20 public immutable i_USDC;

    /// @notice USDT token (pair with USDC)
    IERC20 public immutable i_USDT;

    /// @notice USDC-USDT liquidity pair
    IVVSPair public immutable i_USDC_USDT_PAIR;

    // =============================================================
    //                       STATE VARIABLES
    // =============================================================

    /// @notice SavingsVault contract (only it can deposit/withdraw)
    address public s_savingsVault;

    /// @notice Track liquidity tokens per user
    mapping(address => uint256) public s_userLiquidityTokens;

    /// @notice Total liquidity tokens managed by this strategy
    uint256 public s_totalLiquidityTokens;

    /// @notice Slippage tolerance (in basis points, e.g., 50 = 0.5%)
    uint256 public s_slippageTolerance = 50; // 0.5%

    // =============================================================
    //                          EVENTS
    // =============================================================

    event Deposited(address indexed user, uint256 usdcAmount, uint256 liquidityTokens);
    event Withdrawn(address indexed user, uint256 liquidityTokens, uint256 usdcAmount);
    event YieldHarvested(address indexed user, uint256 yieldAmount);
    event SavingsVaultUpdated(address indexed oldVault, address indexed newVault);
    event SlippageToleranceUpdated(uint256 oldTolerance, uint256 newTolerance);

    // =============================================================
    //                          ERRORS
    // =============================================================

    error VVSYieldStrategy__ZeroAddress();
    error VVSYieldStrategy__ZeroAmount();
    error VVSYieldStrategy__OnlyVault();
    error VVSYieldStrategy__InsufficientLiquidity();
    error VVSYieldStrategy__SlippageTooHigh();

    // =============================================================
    //                        MODIFIERS
    // =============================================================

    modifier onlyVault() {
        _checkVault();
        _;
    }

    // Internal function for modifier (reduces bytecode size)
    function _checkVault() internal view {
        if (msg.sender != s_savingsVault) revert VVSYieldStrategy__OnlyVault();
    }

    // =============================================================
    //                        CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the yield strategy
     * @param _vvsRouter VVS Router address
     * @param _usdc USDC token address
     * @param _usdt USDT token address
     * @param _usdcUsdtPair USDC-USDT pair address
     */
    constructor(address _vvsRouter, address _usdc, address _usdt, address _usdcUsdtPair) Ownable(msg.sender) {
        if (_vvsRouter == address(0) || _usdc == address(0) || _usdt == address(0) || _usdcUsdtPair == address(0)) {
            revert VVSYieldStrategy__ZeroAddress();
        }

        i_VVS_ROUTER = IVVSRouter(_vvsRouter);
        i_USDC = IERC20(_usdc);
        i_USDT = IERC20(_usdt);
        i_USDC_USDT_PAIR = IVVSPair(_usdcUsdtPair);

        // Approve router to spend tokens (set to max for gas efficiency)
        i_USDC.approve(_vvsRouter, type(uint256).max);
        i_USDT.approve(_vvsRouter, type(uint256).max);
    }

    // =============================================================
    //                     VAULT FUNCTIONS
    // =============================================================

    /**
     * @notice Deposit USDC into VVS liquidity pool to earn yield
     * @param user Address of the user
     * @param amount Amount of USDC to deposit
     * @return liquidityTokens Amount of LP tokens received
     * @dev Only callable by SavingsVault
     */
    function deposit(address user, uint256 amount) external onlyVault nonReentrant returns (uint256 liquidityTokens) {
        if (amount == 0) revert VVSYieldStrategy__ZeroAmount();

        // Transfer USDC from vault to this contract
        i_USDC.safeTransferFrom(msg.sender, address(this), amount);

        // Split USDC 50/50 to USDC/USDT
        // We need to swap half of USDC to USDT first
        uint256 halfAmount = amount / 2;
        uint256 usdtAmount = _swapUsdcToUsdt(halfAmount);

        // Add liquidity to VVS (USDC-USDT pool)
        uint256 usdcUsed;
        uint256 usdtUsed;
        (usdcUsed, usdtUsed, liquidityTokens) = _addLiquidity(halfAmount, usdtAmount);

        // Track LP tokens for user
        s_userLiquidityTokens[user] += liquidityTokens;
        s_totalLiquidityTokens += liquidityTokens;

        emit Deposited(user, amount, liquidityTokens);

        return liquidityTokens;
    }

    /**
     * @notice Withdraw USDC from VVS liquidity pool
     * @param user Address of the user
     * @param liquidityTokens Amount of LP tokens to withdraw
     * @return usdcAmount Amount of USDC returned to vault
     * @dev Only callable by SavingsVault
     */
    function withdraw(address user, uint256 liquidityTokens)
        external
        onlyVault
        nonReentrant
        returns (uint256 usdcAmount)
    {
        if (liquidityTokens == 0) revert VVSYieldStrategy__ZeroAmount();
        if (s_userLiquidityTokens[user] < liquidityTokens) {
            revert VVSYieldStrategy__InsufficientLiquidity();
        }

        // Remove liquidity from VVS
        (uint256 usdcReceived, uint256 usdtReceived) = _removeLiquidity(liquidityTokens);

        // Convert all USDT back to USDC
        uint256 usdcFromSwap = _swapUsdtToUsdc(usdtReceived);

        // Total USDC to return
        usdcAmount = usdcReceived + usdcFromSwap;

        // Update tracking
        s_userLiquidityTokens[user] -= liquidityTokens;
        s_totalLiquidityTokens -= liquidityTokens;

        // Transfer USDC back to vault
        i_USDC.safeTransfer(msg.sender, usdcAmount);

        emit Withdrawn(user, liquidityTokens, usdcAmount);

        return usdcAmount;
    }

    // =============================================================
    //                   INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @notice Swap USDC to USDT using VVS Router
     * @param usdcAmount Amount of USDC to swap
     * @return usdtAmount Amount of USDT received
     */
    function _swapUsdcToUsdt(uint256 usdcAmount) internal returns (uint256 usdtAmount) {
        address[] memory path = new address[](2);
        path[0] = address(i_USDC);
        path[1] = address(i_USDT);

        // Calculate minimum output with slippage tolerance
        uint256 minOutput = (usdcAmount * (10000 - s_slippageTolerance)) / 10000;

        uint256[] memory amounts = i_VVS_ROUTER.swapExactTokensForTokens(
            usdcAmount, minOutput, path, address(this), block.timestamp + 15 minutes
        );

        return amounts[1]; // USDT amount received
    }

    /**
     * @notice Swap USDT to USDC using VVS Router
     * @param usdtAmount Amount of USDT to swap
     * @return usdcAmount Amount of USDC received
     */
    function _swapUsdtToUsdc(uint256 usdtAmount) internal returns (uint256 usdcAmount) {
        address[] memory path = new address[](2);
        path[0] = address(i_USDT);
        path[1] = address(i_USDC);

        uint256 minOutput = (usdtAmount * (10000 - s_slippageTolerance)) / 10000;

        uint256[] memory amounts = i_VVS_ROUTER.swapExactTokensForTokens(
            usdtAmount, minOutput, path, address(this), block.timestamp + 15 minutes
        );

        return amounts[1]; // USDC amount received
    }

    /**
     * @notice Add liquidity to VVS USDC-USDT pool
     * @param usdcAmount Amount of USDC
     * @param usdtAmount Amount of USDT
     * @return usdcUsed Actual USDC used
     * @return usdtUsed Actual USDT used
     * @return liquidity LP tokens received
     */
    function _addLiquidity(uint256 usdcAmount, uint256 usdtAmount)
        internal
        returns (uint256 usdcUsed, uint256 usdtUsed, uint256 liquidity)
    {
        // Calculate minimum amounts with slippage tolerance
        uint256 usdcMin = (usdcAmount * (10000 - s_slippageTolerance)) / 10000;
        uint256 usdtMin = (usdtAmount * (10000 - s_slippageTolerance)) / 10000;

        (usdcUsed, usdtUsed, liquidity) = i_VVS_ROUTER.addLiquidity(
            address(i_USDC),
            address(i_USDT),
            usdcAmount,
            usdtAmount,
            usdcMin,
            usdtMin,
            address(this),
            block.timestamp + 15 minutes
        );

        return (usdcUsed, usdtUsed, liquidity);
    }

    /**
     * @notice Remove liquidity from VVS USDC-USDT pool
     * @param liquidity Amount of LP tokens to burn
     * @return usdcAmount USDC received
     * @return usdtAmount USDT received
     */
    function _removeLiquidity(uint256 liquidity) internal returns (uint256 usdcAmount, uint256 usdtAmount) {
        // Approve pair tokens to router
        IERC20(address(i_USDC_USDT_PAIR)).approve(address(i_VVS_ROUTER), liquidity);

        // Calculate minimum amounts (set to 0 for simplicity, can be improved)
        (usdcAmount, usdtAmount) = i_VVS_ROUTER.removeLiquidity(
            address(i_USDC),
            address(i_USDT),
            liquidity,
            0, // Accept any amount (can be improved with price oracle)
            0,
            address(this),
            block.timestamp + 15 minutes
        );

        return (usdcAmount, usdtAmount);
    }

    // =============================================================
    //                     VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get user's current USDC value in the pool (including yield)
     * @param user Address of user
     * @return usdcValue Estimated USDC value
     * @dev This is an approximation based on LP token share
     */
    function getUserValue(address user) external view returns (uint256 usdcValue) {
        uint256 userLiquidity = s_userLiquidityTokens[user];
        if (userLiquidity == 0) return 0;

        // Get total reserves in the pool
        (uint112 reserve0, uint112 reserve1,) = i_USDC_USDT_PAIR.getReserves();
        uint256 totalSupply = i_USDC_USDT_PAIR.totalSupply();

        // Determine which reserve is USDC
        address token0 = i_USDC_USDT_PAIR.token0();
        uint256 usdcReserve = (token0 == address(i_USDC)) ? reserve0 : reserve1;
        uint256 usdtReserve = (token0 == address(i_USDC)) ? reserve1 : reserve0;

        // Calculate user's share of reserves
        uint256 userUsdc = (usdcReserve * userLiquidity) / totalSupply;
        uint256 userUsdt = (usdtReserve * userLiquidity) / totalSupply;

        // Return total value in USDC (assume 1:1 USDC:USDT for simplicity)
        return userUsdc + userUsdt;
    }

    /**
     * @notice Calculate yield earned by user
     * @param user Address of user
     * @param initialDeposit Original USDC deposited
     * @return yieldEarned USDC yield earned
     */
    function calculateYield(address user, uint256 initialDeposit) external view returns (uint256 yieldEarned) {
        uint256 currentValue = this.getUserValue(user);
        if (currentValue > initialDeposit) {
            return currentValue - initialDeposit;
        }
        return 0;
    }

    /**
     * @notice Get user's liquidity tokens
     * @param user Address of user
     * @return LP tokens owned by user
     */
    function userLiquidityTokens(address user) external view returns (uint256) {
        return s_userLiquidityTokens[user];
    }

    /**
     * @notice Get total liquidity tokens
     * @return Total LP tokens managed
     */
    function totalLiquidityTokens() external view returns (uint256) {
        return s_totalLiquidityTokens;
    }

    /**
     * @notice Get savings vault address
     * @return Savings vault contract address
     */
    function savingsVault() external view returns (address) {
        return s_savingsVault;
    }

    /**
     * @notice Get slippage tolerance
     * @return Slippage in basis points
     */
    function slippageTolerance() external view returns (uint256) {
        return s_slippageTolerance;
    }

    // =============================================================
    //                     ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set the SavingsVault address
     * @param _savingsVault Address of SavingsVault contract
     * @dev Only owner can call. Used after deploying vault.
     */
    function setSavingsVault(address _savingsVault) external onlyOwner {
        if (_savingsVault == address(0)) revert VVSYieldStrategy__ZeroAddress();
        address oldVault = s_savingsVault;
        s_savingsVault = _savingsVault;
        emit SavingsVaultUpdated(oldVault, _savingsVault);
    }

    /**
     * @notice Update slippage tolerance
     * @param _slippageTolerance New slippage in basis points
     * @dev 50 = 0.5%, 100 = 1%
     */
    function setSlippageTolerance(uint256 _slippageTolerance) external onlyOwner {
        if (_slippageTolerance > 500) revert VVSYieldStrategy__SlippageTooHigh(); // Max 5%
        uint256 oldTolerance = s_slippageTolerance;
        s_slippageTolerance = _slippageTolerance;
        emit SlippageToleranceUpdated(oldTolerance, _slippageTolerance);
    }
}
