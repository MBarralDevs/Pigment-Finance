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
        // Return reserves equal to total LP supply
        // This creates a 1:1 ratio: 1 LP token = 1 USDC value
        uint256 supply = totalSupply();
        uint112 reserve = uint112(supply > 0 ? supply / 2 : 1000e6);

        return (reserve, reserve, uint32(block.timestamp));
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
