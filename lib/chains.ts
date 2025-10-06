import * as SPECS from "polkadot-api/chains";

// Check if light client mode is enabled
export const useLightClient = () => {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get("smoldot") === "true"
}

export interface ChainConfig {
  name: string;
  displayName: string;
  wsUrls: readonly string[];
  chainSpec?: () => Promise<{ chainSpec: any }>;
  descriptorName: string;
  isTestnet?: boolean;
  symbol: string;
  decimals: number;
  imageUrl: string;
}



export interface PolkaVMChainConfig {
  name: string;
  displayName: string;
  rpcUrl: string;
  symbol: string;
  chainId: number;
  decimals?: number;
  imageUrl: string;
}



// Basic chain configurations for PAPI learning
export const supportedChains = {
  // polkadot: {
  //   name: "polkadot",
  //   displayName: "Polkadot",
  //   symbol: "DOT",
  //   decimals: 10,
  //   wsUrls: [
  //     "wss://rpc.polkadot.io",
  //     "wss://polkadot.api.onfinality.io/public-ws",
  //   ],
  //   chainSpec: () => import("polkadot-api/chains/polkadot"),
  //   descriptorName: "polkadot",
  //   isTestnet: false,
  // },
  // kusama: {
  //   name: "kusama",
  //   displayName: "Kusama",
  //   symbol: "KSM",
  //   decimals: 12,
  //   wsUrls: [
  //     "wss://kusama-rpc.polkadot.io",
  //     "wss://kusama.api.onfinality.io/public-ws",
  //   ],
  //   chainSpec: () => import("polkadot-api/chains/ksmcc3"),
  //   descriptorName: "kusama",
  //   isTestnet: false,
  // },
  // westend: {
  //   name: "westend",
  //   displayName: "Westend",
  //   symbol: "WND",
  //   decimals: 12,
  //   wsUrls: [
  //     "wss://westend-rpc.polkadot.io",
  //     "wss://westend.api.onfinality.io/public-ws",
  //   ],
  //   chainSpec: () => import("polkadot-api/chains/westend2"),
  //   descriptorName: "westend",
  //   isTestnet: true,
  // },
  // paseo: {
  //   name: "paseo",
  //   displayName: "Paseo",
  //   symbol: "PAS",
  //   decimals: 10,
  //   wsUrls: ["wss://paseo-rpc.dwellir.com", "wss://paseo.dotters.network"],
  //   chainSpec: () => import("polkadot-api/chains/paseo"),
  //   descriptorName: "paseo",
  //   isTestnet: true,
  // },
  // paseoah: {
  //   name: "paseoah",
  //   displayName: "Paseo Asset Hub",
  //   symbol: "PAS",
  //   decimals: 10,
  //   wsUrls: ["wss://asset-hub-paseo-rpc.n.dwellir.com", "wss://pas-rpc.stakeworld.io/assethub"],
  //   chainSpec: () => import("polkadot-api/chains/paseo_asset_hub"),
  //   descriptorName: "paseoah",
  //   isTestnet: true,
  // },
  passet: {
    name: "passet",
    displayName: "Passet Hub",
    symbol: "PAS",
    decimals: 10,
    wsUrls: ["wss://testnet-passet-hub.polkadot.io"],
    descriptorName: "passet",
    isTestnet: true,
    imageUrl:"https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/pasero-asset-hub.svg"
  },
  wah:{
    name: "wah",
    displayName: "Westend Asset Hub",
    symbol: "WND",
    decimals: 12,
    wsUrls: ["wss://westend-asset-hub-rpc.polkadot.io"],
    chainSpec: () => import("polkadot-api/chains/westend2_asset_hub"),
    descriptorName: "wah",
    isTestnet: true,
    imageUrl:"https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/polkadot-asset-hub.svg"
  },
  kah:{
    name: "kah",
    displayName: "Kusama Asset Hub",
    symbol: "KUS",
    decimals: 12,
    wsUrls: ["wss://kusama-asset-hub-rpc.polkadot.io"],
    chainSpec: () => import("polkadot-api/chains/ksmcc3_asset_hub"),
    descriptorName: "kah",
    isTestnet: false,
    imageUrl:"https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama-asset-hub.svg"
  },

  
} as const;


export const supportedPolkaVMChains = {

  passet: {
    name: "passet",
    displayName: "Passet PolkaVM Asset Hub",
    symbol: "PAS",
    rpcUrl: "https://testnet-passet-hub-eth-rpc.polkadot.io",
    chainId: 420420422,
    decimals: 18,
    imageUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/pasero-asset-hub.svg"
  },
  wah: {
    name: "wah",
    displayName: "Westend PolkaVM Asset Hub",
    symbol: "WND",
    rpcUrl: "https://westend-asset-hub-eth-rpc.polkadot.io",
    chainId: 420420421,
    decimals: 18,
    imageUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/polkadot-asset-hub.svg"
  },
  kah: {
    name: "kah",
    displayName: "Kusama PolkaVM Asset Hub",
    symbol: "KUS",
    rpcUrl: "https://kusama-asset-hub-eth-rpc.polkadot.io",
    chainId: 420420418,
    decimals: 18,
    imageUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama-asset-hub.svg"
  }


} as const;



export type SupportedChain = keyof typeof supportedChains;

export type SupportedPolkaVMChain = keyof typeof supportedPolkaVMChains;

export function getChainConfig(chainName: SupportedChain): ChainConfig {
  return supportedChains[chainName];
}

export function getPolkaVMChainConfig(chainName: SupportedPolkaVMChain): PolkaVMChainConfig {
  return supportedPolkaVMChains[chainName];
}

// Simple utility to randomize RPC endpoints for load balancing
export function shuffleArray<T>(array: T[]): T[] {
  return array
    .map((v) => ({ v, p: Math.random() }))
    .sort((a, b) => a.p - b.p)
    .map(({ v }) => v);
}

// Format balance with proper decimals and symbol
export function formatBalance(
  amount: bigint | string,
  chainName: SupportedChain,
): string {
  const { decimals, symbol } = supportedChains[chainName];
  const balance = Number(amount) / Math.pow(10, decimals);
  return `${balance.toFixed(4)} ${symbol}`;
}
