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
