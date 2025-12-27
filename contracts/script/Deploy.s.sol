// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Script, console2} from "lib/forge-std/src/Script.sol";
import {SavingsVault} from "../src/SavingsVault.sol";
import {VVSYieldStrategy} from "../src/VVSYieldStrategy.sol";

// Mock USDC for testnet (we'll deploy our own)
import {MockUSDC} from "../test/mocks/MockUSDC.t.sol";

contract DeployScript is Script {
    // Cronos Testnet addresses (we'll use mocks for testing)
    // If real VVS testnet exists, update these addresses
    address constant VVS_ROUTER = address(0); // We'll deploy mocks
    address constant USDT = address(0); // We'll deploy mocks
    address constant USDC_USDT_PAIR = address(0); // We'll deploy mocks

    function run() external {
        // Read private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying contracts with account:", deployer);
        console2.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy Mock USDC (for testnet)
        console2.log("\n1. Deploying Mock USDC...");
        MockUSDC usdc = new MockUSDC();
        console2.log("Mock USDC deployed at:", address(usdc));

        // Step 2: Deploy SavingsVault
        console2.log("\n2. Deploying SavingsVault...");
        SavingsVault vault = new SavingsVault(address(usdc));
        console2.log("SavingsVault deployed at:", address(vault));

        // For now, we'll skip VVSYieldStrategy deployment since VVS testnet might not exist
        // We'll deploy it manually later when we have real VVS addresses
        console2.log("\n Deployment complete!");
        console2.log("\nContract Addresses:");
        console2.log("-------------------");
        console2.log("USDC:", address(usdc));
        console2.log("SavingsVault:", address(vault));
        console2.log("\nSave these addresses to backend/.env");

        vm.stopBroadcast();

        // Verify vault configuration
        console2.log("\nVerifying deployment...");
        console2.log("Vault owner:", vault.owner());
        console2.log("Vault USDC:", address(vault.i_USDC()));
    }
}
