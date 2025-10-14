'use client';

import { createConfig } from '@luno-kit/react';
import { kusamaAssetHub, westendAssetHub, paseoPassetHub } from '@luno-kit/react/chains';
import {
  polkadotjsConnector,
  polkagateConnector,
  subwalletConnector,
  talismanConnector,
} from '@luno-kit/react/connectors';
import { LunoKitProvider } from '@luno-kit/ui';

const connectors = [
  polkadotjsConnector(),
  subwalletConnector(),
  talismanConnector(),
  polkagateConnector(),
];

const lunoConfig = createConfig({
  appName: 'PolkaVM Bridge',
  chains: [kusamaAssetHub, westendAssetHub, paseoPassetHub],
  connectors,
  autoConnect: true,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return <LunoKitProvider config={lunoConfig}>{children}</LunoKitProvider>;
}
