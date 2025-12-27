# Backend API

Node.js backend with x402 payment integration for AI Savings Agent.

## Features

- x402 payment protocol integration
- Cronos Facilitator for gasless transactions
- Smart contract interaction via ethers.js
- Express REST API

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your values
```

## Development

```bash
npm run dev
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/user/:address` - Get user account info
- `POST /api/save` - Trigger auto-save with x402 payment
