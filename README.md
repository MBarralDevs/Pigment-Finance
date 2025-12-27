# AI Savings Agent - Cronos x402 Hackathon

Automated savings agent that bridges Crypto.com users to DeFi via intelligent savings automation and VVS Finance yield generation.

## 🏗️ Project Structure

```
ai-savings-agent/
├── contracts/          # Foundry smart contracts
│   ├── src/           # Contract source files
│   ├── test/          # Contract tests
│   ├── lib/           # Dependencies (OpenZeppelin)
│   └── foundry.toml   # Foundry config
├── backend/           # Node.js backend API
│   ├── src/           # TypeScript source
│   └── package.json   # Dependencies
├── lib/               # Foundry libraries (git submodules)
└── package.json       # Root package.json (workspace manager)
```

## 🚀 Quick Start

### Smart Contracts

```bash
cd contracts
forge build
forge test -vvv
```

### Backend API

```bash
cd backend
npm install
npm run dev
```

## 📝 Development

### Prerequisites

- Node.js 20+
- Foundry
- Git

### Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install
```

### Run Tests

```bash
# Smart contract tests
npm run test:contracts

# Backend tests (when implemented)
npm run test:backend
```

## 🔧 Configuration

### Contracts

- Configure in `contracts/foundry.toml`
- Environment variables in `contracts/.env`

### Backend

- Copy `backend/.env.example` to `backend/.env`
- Fill in required values

## 📚 Documentation

- [Smart Contracts](/contracts/README.md)
- [Backend API](/backend/README.md)

## 🏆 Hackathon

**Track:** Cronos x402 - Main Track  
**Prize:** $24K Cronos Ignition Builder Residency  
**Timeline:** Dec 12, 2024 - Jan 23, 2025
