"use client";

import { createConfig, LunoProvider } from "@luno-kit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { polkadotjsConnector, subwalletConnector, talismanConnector } from "@luno-kit/react/connectors";
import { LunoKitProvider } from "@luno-kit/ui";
import "@luno-kit/ui/styles.css";
import { PropsWithChildren } from "react";
import { westendAssetHub, paseoPassetHub, kusamaAssetHub } from "@luno-kit/react/chains";

const chains = [westendAssetHub, paseoPassetHub, kusamaAssetHub];

const config = createConfig({
  appName: "Token Bridge",
  chains: chains,
  connectors: [polkadotjsConnector(), subwalletConnector(), talismanConnector()],
});

const queryClient = new QueryClient();

export function Providers({ children }: PropsWithChildren) {
  return (
    <LunoProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <LunoKitProvider config={config}>
          {children}
        </LunoKitProvider>
      </QueryClientProvider>
    </LunoProvider>
  );
}
