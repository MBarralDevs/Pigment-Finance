// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockVVSPair is ERC20 {
    address public token0;
    address public token1;

    constructor(address _token0, address _token1) ERC20("VVS LP", "VVS-LP") {
        token0 = _token0;
        token1 = _token1;
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        // Mock reserves (1M each token)
        return (1000000e6, 1000000e6, uint32(block.timestamp));
    }

    // Mint LP tokens (for testing)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // Override decimals to match USDC (6 decimals)
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
