import type { HexString } from '@luno-kit/react/types';
import { passet_hub, kah, wah, paseo } from '@polkadot-api/descriptors';

export interface Chain {
    name: string;
    id: string;
    genesisHash: HexString;
    rpcUrls: {
        webSocket: string[];
    };
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
        tokenUrl: string;
    };
    ss58Format: number;
    chainIconUrl: string;
    testnet: boolean;
    descriptors: any;
    blockExplorers: {
        default: {
            name: string;
            url: string;
        };
    };
}

export const CHAINS: Record<string, Chain> = {
    paseoPassetHub: {
        genesisHash: '0xfd974cf9eaf028f5e44b9fdd1949ab039c6cf9cc54449b0b60d71b042e79aeb6',
        name: 'PAassetHub',
        id: 'paseoPassetHub',
        nativeCurrency: { name: 'PassetHub', symbol: 'PAS', decimals: 10, tokenUrl:'https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/dot.svg' },
        rpcUrls: {
            webSocket: ['wss://testnet-passet-hub.polkadot.io', 'wss://passet-hub-paseo.ibp.network'],
        },
        ss58Format: 0,
        chainIconUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/pasero-asset-hub.svg",
        testnet: true,
        descriptors: passet_hub,
        blockExplorers: { default: { name: 'Subscan', url: 'https://assethub-paseo.subscan.io' } },
    },
    westendAssetHub: {
        genesisHash: '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
        name: 'AssetHub Westend',
        id: 'westendAssetHub',
        nativeCurrency: { name: 'AssetHub Westend', symbol: 'WND', decimals: 12, tokenUrl: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/dot.svg' },
        rpcUrls: {
            webSocket: [
                'wss://westend-asset-hub-rpc.polkadot.io',
                'wss://asset-hub-westend-rpc.n.dwellir.com',
            ],
        },
        ss58Format: 42,
        blockExplorers: { default: { name: 'Subscan', url: 'https://assethub-westend.subscan.io' } },
        chainIconUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/polkadot-asset-hub.svg",
        testnet: true,
        descriptors: wah,
    },
    kusamaAssetHub: {
        genesisHash: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
        name: 'AssetHub Kusama',
        id: 'kusamaAssetHub',
        nativeCurrency: { name: 'AssetHub Kusama', symbol: 'KSM', decimals: 12, tokenUrl: 'https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama.svg' },
        rpcUrls: {
            webSocket: [
                'wss://kusama-asset-hub-rpc.polkadot.io',
                'wss://asset-hub-kusama-rpc.n.dwellir.com',
            ],
        },
        ss58Format: 2,
        blockExplorers: { default: { name: 'Subscan', url: 'https://assethub-kusama.subscan.io' } },
        chainIconUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama-asset-hub.svg",
        testnet: false,
        descriptors: kah,
    }
};


export interface PolkaVMChainConfig {
    name: string;
    displayName: string;
    rpcUrl: string;
    symbol: string;
    chainId: number;
    decimals: number;
    chainIconUrl: string;
}

export const POLKAVM_CHAINS: Record<string, PolkaVMChainConfig> = {

    passet: {
      name: "passet",
      displayName: "Passet PolkaVM Asset Hub",
      symbol: "PAS",
      rpcUrl: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      chainId: 420420422,
      decimals: 18,
      chainIconUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/pasero-asset-hub.svg"
    },
    wah: {
      name: "wah",
      displayName: "Westend PolkaVM Asset Hub",
      symbol: "WND",
      rpcUrl: "https://westend-asset-hub-eth-rpc.polkadot.io",
      chainId: 420420421,
      decimals: 18,
      chainIconUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/polkadot-asset-hub.svg"
    },
    kah: {
      name: "kah",
      displayName: "Kusama PolkaVM Asset Hub",
      symbol: "KUS",
      rpcUrl: "https://kusama-asset-hub-eth-rpc.polkadot.io",
      chainId: 420420418,
      decimals: 18,
      chainIconUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama-asset-hub.svg"
    }
  
  
  } as const;  

export type SupportedChain = keyof typeof CHAINS;


export type SupportedPolkaVMChain = keyof typeof POLKAVM_CHAINS;

// Chain interface for TokenBridge
export interface ChainInfo {
  id: string
  name: string
  symbol: string
  chainIconUrl: string
}


export const FROM_NETWORKS: ChainInfo[] = [
  {
    id: CHAINS.paseoPassetHub.id,
    name: CHAINS.paseoPassetHub.name,
    symbol: CHAINS.paseoPassetHub.nativeCurrency.symbol,
    chainIconUrl: CHAINS.paseoPassetHub.chainIconUrl
  },
  {
    id: CHAINS.westendAssetHub.id,
    name: CHAINS.westendAssetHub.name,
    symbol: CHAINS.westendAssetHub.nativeCurrency.symbol,
    chainIconUrl: CHAINS.westendAssetHub.chainIconUrl
  },
  {
    id: CHAINS.kusamaAssetHub.id,
    name: CHAINS.kusamaAssetHub.name,
    symbol: CHAINS.kusamaAssetHub.nativeCurrency.symbol,
    chainIconUrl: CHAINS.kusamaAssetHub.chainIconUrl
  }
]

// TO_NETWORKS derived from POLKAVM_CHAINS
export const TO_NETWORKS: ChainInfo[] = [
  {
    id: POLKAVM_CHAINS.passet.name,
    name: POLKAVM_CHAINS.passet.displayName,
    symbol: POLKAVM_CHAINS.passet.symbol,
    chainIconUrl: POLKAVM_CHAINS.passet.chainIconUrl
  },
  {
    id: POLKAVM_CHAINS.wah.name,
    name: POLKAVM_CHAINS.wah.displayName,
    symbol: POLKAVM_CHAINS.wah.symbol,
    chainIconUrl: POLKAVM_CHAINS.wah.chainIconUrl
  },
  {
    id: POLKAVM_CHAINS.kah.name,
    name: POLKAVM_CHAINS.kah.displayName,
    symbol: POLKAVM_CHAINS.kah.symbol,
    chainIconUrl: POLKAVM_CHAINS.kah.chainIconUrl
  }
]