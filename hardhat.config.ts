import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

import "./tasks/accounts";
import "./tasks/FHECounter";
import "./tasks/ProofOfLuck";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv() {
  const envPath = resolve(__dirname, ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = value;
  }
}

loadDotEnv();

const INFURA_API_KEY: string = process.env.INFURA_API_KEY ?? "";
const PRIVATE_KEY: string = process.env.PRIVATE_KEY ?? "";

function to0xPrivateKey(pk: string): string {
  if (!pk) return "";
  return pk.startsWith("0x") ? pk : `0x${pk}`;
}

const REQUESTED_NETWORK = process.env.HARDHAT_NETWORK ?? "";
if (REQUESTED_NETWORK === "sepolia") {
  if (!PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in .env (use a raw hex key, not a mnemonic).");
  }
  if (!INFURA_API_KEY) {
    throw new Error("Missing INFURA_API_KEY in .env.");
  }
}

const LOCAL_TEST_ACCOUNTS = [
  { privateKey: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", balance: "10000000000000000000000" },
  { privateKey: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", balance: "10000000000000000000000" },
  { privateKey: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc", balance: "10000000000000000000000" },
  { privateKey: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", balance: "10000000000000000000000" },
  { privateKey: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", balance: "10000000000000000000000" },
  { privateKey: "0x5555555555555555555555555555555555555555555555555555555555555555", balance: "10000000000000000000000" },
  { privateKey: "0x1111111111111111111111111111111111111111111111111111111111111111", balance: "10000000000000000000000" },
  { privateKey: "0x2222222222222222222222222222222222222222222222222222222222222222", balance: "10000000000000000000000" },
  { privateKey: "0x3333333333333333333333333333333333333333333333333333333333333333", balance: "10000000000000000000000" },
  { privateKey: "0x4444444444444444444444444444444444444444444444444444444444444444", balance: "10000000000000000000000" },
];

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY ?? "",
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      accounts: LOCAL_TEST_ACCOUNTS,
      saveDeployments: true,
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: LOCAL_TEST_ACCOUNTS.map((a) => a.privateKey),
      chainId: 31337,
    },
    sepolia: {
      accounts: PRIVATE_KEY ? [to0xPrivateKey(PRIVATE_KEY)] : [],
      chainId: 11155111,
      url: INFURA_API_KEY ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}` : "",
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    deployments: "./deployments",
    deploy: "./deploy",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
