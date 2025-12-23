// Auto-generated from deployments/sepolia/ProofOfLuck.json
// Do not edit manually. Re-run: npx hardhat deploy --network sepolia

export const CONTRACT_ADDRESS = "0xD6020b96AAc577120f74543A4b27d97a493d40bB" as const;
export const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "expected",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "actual",
        "type": "uint256"
      }
    ],
    "name": "IncorrectTicketPrice",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoActiveTicket",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "DrawCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "TicketPurchased",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "TICKET_PRICE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint8",
        "name": "d0",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint8",
        "name": "d1",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint8",
        "name": "d2",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint8",
        "name": "d3",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint8",
        "name": "d4",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint8",
        "name": "d5",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "buyTicket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "draw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getLastResult",
    "outputs": [
      {
        "internalType": "euint8",
        "name": "w0",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "w1",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "w2",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "w3",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "w4",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "w5",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "matchesCount",
        "type": "bytes32"
      },
      {
        "internalType": "euint64",
        "name": "rewardPoints",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getPoints",
    "outputs": [
      {
        "internalType": "euint64",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getTicket",
    "outputs": [
      {
        "internalType": "euint8",
        "name": "d0",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "d1",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "d2",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "d3",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "d4",
        "type": "bytes32"
      },
      {
        "internalType": "euint8",
        "name": "d5",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "hasActiveTicket",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
