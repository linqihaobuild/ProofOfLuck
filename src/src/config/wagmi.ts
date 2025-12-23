import { createConfig, createStorage, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { sepolia } from 'wagmi/chains';

const memory: Record<string, string> = {};
const memoryStorage = {
  getItem(key: string) {
    return memory[key] ?? null;
  },
  setItem(key: string, value: string) {
    memory[key] = value;
  },
  removeItem(key: string) {
    delete memory[key];
  },
};

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
  storage: createStorage({ storage: memoryStorage }),
  ssr: false,
});
