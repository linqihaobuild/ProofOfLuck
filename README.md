# ProofOfLuck

ProofOfLuck is a confidential lottery dApp built on Zama FHEVM. Players buy a 6-digit ticket with encrypted digits,
trigger a confidential draw, and receive encrypted points based on how many digits match.

## Project Overview

ProofOfLuck demonstrates how Fully Homomorphic Encryption (FHE) can keep lottery data private while still allowing
on-chain validation and reward logic. Ticket numbers, draw numbers, match counts, and points are all encrypted on-chain.
Only the player can decrypt their data through the Zama Relayer SDK.

## How It Works

1. The player encrypts six digits locally and calls `buyTicket` with exactly 0.001 ETH.
2. The contract stores encrypted digits and grants decryption permission to the player.
3. The player calls `draw`; the contract generates encrypted random digits, compares them to the ticket, and computes
   encrypted rewards.
4. The frontend displays encrypted values and uses the relayer to decrypt them for the player.

## Reward Schedule

Matches are counted position-by-position (6 digits total):

| Matches | Points |
| ------- | ------ |
| 2       | 100    |
| 3       | 200    |
| 4       | 2000   |
| 5       | 10000  |
| 6       | 100000 |

## Advantages

- Full privacy: ticket digits, draw digits, match count, and points never appear in plaintext on-chain.
- Fair and verifiable: reward calculation runs on-chain with FHE, so no operator can tamper with results.
- Anti-front-running: encrypted tickets and results prevent copy or reveal attacks.
- Simple UX: users only need a wallet; no KYC or identity data is collected.
- Clear economics: fixed ticket price and deterministic rewards.

## Problems Solved

- Typical lotteries expose ticket numbers and outcomes publicly.
- Off-chain draws require trust in operators or oracles.
- Users cannot verify rewards without revealing their ticket numbers.

ProofOfLuck solves these by encrypting user inputs and outputs while keeping logic on-chain.

## Tech Stack

- Solidity 0.8.24 with Zama FHEVM (`@fhevm/solidity`)
- Hardhat, hardhat-deploy, TypeChain, ethers
- React + Vite (no Tailwind)
- RainbowKit + Wagmi
- viem for reads, ethers for writes
- Zama Relayer SDK for client-side decryption

## Repository Layout

```
contracts/        Smart contracts (ProofOfLuck)
deploy/           Deployment scripts
deployments/      Deployed contract artifacts and ABIs
tasks/            Hardhat tasks
test/             Contract tests
src/              Frontend (React + Vite)
docs/             Zama-related documentation references
```

## Setup

### Prerequisites

- Node.js 20+
- npm 7+

### Install Dependencies

```bash
npm install
```

### Compile and Test

```bash
npm run compile
npm run test
```

### Local Development (Contracts Only)

```bash
npm run chain
npm run deploy:localhost
```

Local deployments are intended for contract development. The frontend is configured for Sepolia and does not use
localhost networks.

### Sepolia Deployment

1. Create `.env` with:
   - `PRIVATE_KEY` (raw hex key, no mnemonic)
   - `INFURA_API_KEY`
   - `ETHERSCAN_API_KEY`
2. Deploy and verify:

```bash
npm run deploy:sepolia
npm run verify:sepolia <CONTRACT_ADDRESS>
```

Optional network test:

```bash
npm run test:sepolia
```

### Frontend Development

```bash
cd src
npm install
npm run dev
```

- Contract config lives in `src/src/config/contracts.ts`.
- The ABI must match the deployed contract ABI from `deployments/sepolia/ProofOfLuck.json`.
- The frontend does not use environment variables or local storage.

## Usage Flow (End User)

1. Connect wallet.
2. Enter six digits; the UI encrypts and sends them to `buyTicket`.
3. Click draw to generate the encrypted winning number and compute rewards.
4. View encrypted points and decrypt them via the relayer.

## Security Notes

- This project has not been audited.
- Randomness uses `FHE.randEuint8()`; for production consider external entropy sources and economic safeguards.
- Points are demo rewards without redemption logic.
- Never expose deployment private keys; keep `.env` local.

## Roadmap

- Multi-ticket support and full draw history.
- Prize pools and seasonal campaigns.
- Enhanced randomness with verifiable entropy sources.
- Gas optimizations and batch operations.
- NFT achievements for winners.
- Accessibility and UI polish.

## License

BSD-3-Clause-Clear. See `LICENSE`.

## Acknowledgements

Built with the Zama FHEVM protocol and relayer SDK.
