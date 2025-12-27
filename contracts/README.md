# Smart Contracts

Foundry-based smart contracts for AI Savings Agent.

## Contracts

- **SavingsVault.sol** - Core vault managing user deposits and goals
- **VVSYieldStrategy.sol** - Yield generation via VVS Finance liquidity pools

## Development

### Build

```bash
forge build
```

### Test

```bash
forge test -vvv
```

### Deploy (Cronos Testnet)

```bash
forge script script/Deploy.s.sol --rpc-url cronos_testnet --broadcast
```

## Architecture

```
User → SavingsVault → VVSYieldStrategy → VVS Finance USDC/USDT Pool
```

Script ran successfully.

== Logs ==
Deploying contracts with account: 0x5Dc454F7EfDCbaa3928AA599AC9FC758e92b32f9
Account balance: 50000000000000000000

1. Deploying Mock USDC...
   Mock USDC deployed at: 0x77C03DB7c301cA660a813ea828005f2F5B5aedAD

2. Deploying SavingsVault...
   SavingsVault deployed at: 0x349bC1BD3BB0A0A82468a56EA4Df85Ca24f3869c

Deployment complete!

Contract Addresses:

---

USDC: 0x77C03DB7c301cA660a813ea828005f2F5B5aedAD
SavingsVault: 0x349bC1BD3BB0A0A82468a56EA4Df85Ca24f3869c

Save these addresses to backend/.env

Verifying deployment...
Vault owner: 0x5Dc454F7EfDCbaa3928AA599AC9FC758e92b32f9
Vault USDC: 0x77C03DB7c301cA660a813ea828005f2F5B5aedAD

## Setting up 1 EVM.

==========================

Chain 338

Estimated gas price: 386.25 gwei

Estimated total gas used for script: 2848759

Estimated amount required: 1.10033316375 ETH

==========================

##### cronos-testnet

✅ [Success] Hash: 0xff2da91650b41f2c67640eb12fbfaa39b8b483545150a3dba4ddffd6c4187265
Contract Address: 0x77C03DB7c301cA660a813ea828005f2F5B5aedAD
Block: 64789196
Gas Used: 565732

##### cronos-testnet

✅ [Success] Hash: 0xe33b05d7ae96858b87db225f079190cce66b9799b2c86654648c01608004a0ca
Contract Address: 0x349bC1BD3BB0A0A82468a56EA4Df85Ca24f3869c
Block: 64789196
Gas Used: 1625622

✅ Sequence #1 on cronos-testnet | Total Paid: 0. ETH (2191354 gas \* avg 0 gwei)

==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL
