"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  ChevronDown,
  Zap,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WalletConnect } from "./WalletConnect";
import {
  FROM_NETWORKS,
  TO_NETWORKS,
  CHAINS,
  POLKAVM_CHAINS,
  type SupportedChain,
  type SupportedPolkaVMChain,
} from "@/constants";
import { usePapiClient } from "@/hooks/usePapiClient";
import { useAccount } from "@luno-kit/react";
import { ethers } from "ethers";
import { useEffect } from "react";

export function TokenBridge() {
  const { address } = useAccount();
  const {
    balance,
    loadingBalance,
    refreshBalance,
    switchChain,
    isReady,
    mapAccount,
    depositAccount,
    isMappedAccount,
  } = usePapiClient();

  const [fromNetwork, setFromNetwork] = useState(FROM_NETWORKS[0]);
  const [toNetwork, setToNetwork] = useState(() => {
    const correspondingToNetwork = TO_NETWORKS.find((toNetwork) => {
      if (FROM_NETWORKS[0].id === "paseoPassetHub")
        return toNetwork.id === "passet";
      if (FROM_NETWORKS[0].id === "westendAssetHub")
        return toNetwork.id === "wah";
      if (FROM_NETWORKS[0].id === "kusamaAssetHub")
        return toNetwork.id === "kah";
      return false;
    });
    return correspondingToNetwork || TO_NETWORKS[0];
  });
  const [selectedToken, setSelectedToken] = useState({
    symbol: FROM_NETWORKS[0].symbol,
    name: `${FROM_NETWORKS[0].name} Token`,
    price: "$",
    chainIconUrl: CHAINS.westendAssetHub.nativeCurrency.tokenUrl,
  });
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [addressCopied, setAddressCopied] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [evmBalance, setEvmBalance] = useState<string | null>(null);
  const [isLoadingEvmBalance, setIsLoadingEvmBalance] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState({
    mapAccount: {
      status: "pending" as "pending" | "active" | "completed",
      txHash: null as string | null,
    },
    call: {
      status: "pending" as "pending" | "active" | "completed",
      txHash: null as string | null,
    },
  });
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);

  const swapNetworks = () => {
    const currentFromIndex = FROM_NETWORKS.findIndex(
      (n) => n.id === fromNetwork.id
    );
    const nextFromIndex = (currentFromIndex + 1) % FROM_NETWORKS.length;
    const nextFromNetwork = FROM_NETWORKS[nextFromIndex];

    const correspondingToNetwork = TO_NETWORKS.find((toNetwork) => {
      if (nextFromNetwork.id === "paseoPassetHub")
        return toNetwork.id === "passet";
      if (nextFromNetwork.id === "westendAssetHub")
        return toNetwork.id === "wah";
      if (nextFromNetwork.id === "kusamaAssetHub")
        return toNetwork.id === "kah";
      return false;
    });

    setFromNetwork(nextFromNetwork);
    if (correspondingToNetwork) {
      setToNetwork(correspondingToNetwork);
    }

    setSelectedToken({
      symbol: nextFromNetwork.symbol,
      name: `${nextFromNetwork.name} Token`,
      price: "$",
      chainIconUrl:
        CHAINS[nextFromNetwork.id as keyof typeof CHAINS]?.nativeCurrency
          .tokenUrl || nextFromNetwork.chainIconUrl,
    });

    if (address) {
      switchChain(nextFromNetwork.id);
    }
  };

  const handleFromNetworkSelect = (network: (typeof FROM_NETWORKS)[0]) => {
    setFromNetwork(network);

    const correspondingToNetwork = TO_NETWORKS.find((toNetwork) => {
      if (network.id === "paseoPassetHub") return toNetwork.id === "passet";
      if (network.id === "westendAssetHub") return toNetwork.id === "wah";
      if (network.id === "kusamaAssetHub") return toNetwork.id === "kah";
      return false;
    });

    if (correspondingToNetwork) {
      setToNetwork(correspondingToNetwork);
    }

    setSelectedToken({
      symbol: network.symbol,
      name: `${network.name} Token`,
      price: "$",
      chainIconUrl:
        CHAINS[network.id as keyof typeof CHAINS]?.nativeCurrency.tokenUrl ||
        network.chainIconUrl,
    });

    if (address) {
      switchChain(network.id);
    }
  };

  const handleToNetworkSelect = (network: (typeof TO_NETWORKS)[0]) => {
    setToNetwork(network);

    const correspondingFromNetwork = FROM_NETWORKS.find((fromNetwork) => {
      if (network.id === "passet") return fromNetwork.id === "paseoPassetHub";
      if (network.id === "wah") return fromNetwork.id === "westendAssetHub";
      if (network.id === "kah") return fromNetwork.id === "kusamaAssetHub";
      return false;
    });

    if (correspondingFromNetwork) {
      setFromNetwork(correspondingFromNetwork);
      setSelectedToken({
        symbol: correspondingFromNetwork.symbol,
        name: `${correspondingFromNetwork.name} Token`,
        price: "$",
        chainIconUrl:
          CHAINS[correspondingFromNetwork.id as keyof typeof CHAINS]
            ?.nativeCurrency.tokenUrl || correspondingFromNetwork.chainIconUrl,
      });
    }
  };

  const copyAddress = async () => {
    if (recipientAddress) {
      await navigator.clipboard.writeText(recipientAddress);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    }
  };

  const isValidEvmAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const fetchEvmBalance = async (address: string, toNetworkId: string) => {
    if (!isValidEvmAddress(address)) return;

    setIsLoadingEvmBalance(true);
    try {
      const polkavmChain =
        POLKAVM_CHAINS[toNetworkId as keyof typeof POLKAVM_CHAINS];
      if (!polkavmChain) return;

      const provider = new ethers.JsonRpcProvider(polkavmChain.rpcUrl);
      const balance = await provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);

      setEvmBalance(formattedBalance);
    } catch (error) {
      console.error("Failed to fetch EVM balance:", error);
      setEvmBalance(null);
    } finally {
      setIsLoadingEvmBalance(false);
    }
  };

  useEffect(() => {
    if (recipientAddress && isValidEvmAddress(recipientAddress)) {
      fetchEvmBalance(recipientAddress, toNetwork.id);
    } else {
      setEvmBalance(null);
    }
  }, [recipientAddress, toNetwork.id]);

  const bridgeTokens = async () => {
    if (
      !address ||
      !recipientAddress ||
      !amount ||
      !isValidEvmAddress(recipientAddress)
    ) {
      setBridgeError("Please fill in all required fields with valid values");
      return;
    }

    setIsBridging(true);
    setBridgeError(null);
    setShowTransactionDialog(true);
    setCurrentTxHash(null);

    try {
      // Check if account is already mapped
      const isAlreadyMapped = await isMappedAccount();
      
      if (isAlreadyMapped) {
        // Account is already mapped, skip map step and go directly to deposit
        setTransactionSteps({
          mapAccount: { status: "completed", txHash: null },
          call: { status: "pending", txHash: null },
        });

        // Step: Deposit Account (skip mapping)
        setTransactionSteps((prev) => ({
          ...prev,
          call: { status: "active", txHash: null },
        }));

        const depositResult = await depositAccount(recipientAddress, amount);

        setTransactionSteps((prev) => ({
          ...prev,
          call: {
            status: "completed",
            txHash: depositResult.transactionHash,
          },
        }));
        setCurrentTxHash(depositResult.transactionHash);
      } else {
        // Account is not mapped, need to map first then deposit
        setTransactionSteps({
          mapAccount: { status: "pending", txHash: null },
          call: { status: "pending", txHash: null },
        });

        // Step 1: Map Account
        setTransactionSteps((prev) => ({
          ...prev,
          mapAccount: { status: "active", txHash: null },
        }));

        const mapResult = await mapAccount();

        setTransactionSteps((prev) => ({
          ...prev,
          mapAccount: {
            status: "completed",
            txHash: mapResult.transactionHash,
          },
        }));
        setCurrentTxHash(mapResult.transactionHash);

        // Step 2: Deposit Account
        setTransactionSteps((prev) => ({
          ...prev,
          call: { status: "active", txHash: null },
        }));

        const depositResult = await depositAccount(recipientAddress, amount);

        setTransactionSteps((prev) => ({
          ...prev,
          call: {
            status: "completed",
            txHash: depositResult.transactionHash,
          },
        }));
        setCurrentTxHash(depositResult.transactionHash);
      }

      // Success - close dialog and refresh balance
      setTimeout(() => {
        setShowTransactionDialog(false);
        setIsBridging(false);
        refreshBalance();
        setAmount("");
      }, 2000);
    } catch (error) {
      console.error("Bridge transaction failed:", error);
      setBridgeError(
        error instanceof Error ? error.message : "Transaction failed"
      );
      setIsBridging(false);
    }
  };

  return (
    <div className="min-h-screen network-grid">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-balance">PolkaVM Bridge</h1>
          </div>

          <div className="flex items-center gap-4">
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-balance">
            Bridge Your Tokens to PolkaVM Asset Hub
          </h2>
          <p className="text-muted-foreground text-pretty">
            Convert native tokens to PolkaVM Asset Hub tokens seamlessly
          </p>
        </div>

        {/* Bridge Error Display */}
        {bridgeError && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <div className="text-sm">
              <div className="font-medium text-red-800 mb-2">
                ❌ Bridge Transaction Failed
              </div>
              <div className="text-red-700">{bridgeError}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBridgeError(null)}
                className="mt-2 text-red-600 hover:text-red-800">
                Dismiss
              </Button>
            </div>
          </Card>
        )}

        {/* Bridge Card */}
        <Card className="p-6 token-card-hover glow-effect">
          {/* From Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">From</label>
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                ~6s
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-secondary/50 border-border/50">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/70 transition-colors rounded-md p-2 -m-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                        <img
                          src={fromNetwork.chainIconUrl}
                          alt={fromNetwork.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = "none";
                            const nextElement =
                              target.nextElementSibling as HTMLElement;
                            if (nextElement) nextElement.style.display = "flex";
                          }}
                        />
                        {/* <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 hidden">
                          {fromNetwork.symbol[0]}
                        </div> */}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{fromNetwork.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {fromNetwork.symbol}
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80">
                    <ScrollArea className="h-64">
                      {FROM_NETWORKS.map((network) => (
                        <DropdownMenuItem
                          key={network.id}
                          onClick={() => handleFromNetworkSelect(network)}
                          className="flex items-center gap-3 p-3 cursor-pointer">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                            <img
                              src={network.chainIconUrl}
                              alt={network.name}
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;
                                target.style.display = "none";
                                const nextElement =
                                  target.nextElementSibling as HTMLElement;
                                if (nextElement)
                                  nextElement.style.display = "flex";
                              }}
                            />
                            {/* <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 hidden">
                              {network.symbol[0]}
                            </div> */}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{network.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {network.symbol}
                            </div>
                          </div>
                          {network.id === fromNetwork.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>

              <Card className="p-4 bg-secondary/50 border-border/50">
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                    <img
                      src={selectedToken.chainIconUrl}
                      alt={selectedToken.name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = "none";
                        const nextElement =
                          target.nextElementSibling as HTMLElement;
                        if (nextElement) nextElement.style.display = "flex";
                      }}
                    />
                    {/* <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold hidden">
                      {selectedToken.symbol[0]}
                    </div> */}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{selectedToken.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedToken.name}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            </div>

            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    value === "" ||
                    (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))
                  ) {
                    setAmount(value);
                  }
                }}
                min="0"
                step="0.0001"
                className="text-2xl h-16 bg-secondary/30 border-border/50 pr-20"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                onClick={() => setAmount(balance.formattedTotal)}
                disabled={
                  loadingBalance ||
                  !address ||
                  balance.formattedTotal === "0.0000"
                }>
                MAX
              </Button>
            </div>

            <div className="flex justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>
                  Balance:{" "}
                  {loadingBalance
                    ? "Loading..."
                    : address
                    ? `${balance.formattedTotal} ${fromNetwork.symbol}`
                    : "Connect wallet"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshBalance}
                  disabled={loadingBalance || !address}
                  className="h-6 px-2 text-xs">
                  🔄
                </Button>
              </div>
              <span>{selectedToken.price}</span>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={swapNetworks}
              className="rounded-full border-border/50 hover:bg-secondary/50 hover:border-primary/50 bg-transparent">
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>

          {/* To Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">To</label>
              <Badge variant="outline" className="text-xs">
                {toNetwork.name}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-secondary/50 border-border/50">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/70 transition-colors rounded-md p-2 -m-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                        <img
                          src={toNetwork.chainIconUrl}
                          alt={toNetwork.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = "none";
                            const nextElement =
                              target.nextElementSibling as HTMLElement;
                            if (nextElement) nextElement.style.display = "flex";
                          }}
                        />
                        {/* <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 hidden">
                          {toNetwork.symbol[0]}
                        </div> */}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{toNetwork.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {toNetwork.symbol}
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80">
                    <ScrollArea className="h-64">
                      {TO_NETWORKS.map((network) => (
                        <DropdownMenuItem
                          key={network.id}
                          onClick={() => handleToNetworkSelect(network)}
                          className="flex items-center gap-3 p-3 cursor-pointer">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                            <img
                              src={network.chainIconUrl}
                              alt={network.name}
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;
                                target.style.display = "none";
                                const nextElement =
                                  target.nextElementSibling as HTMLElement;
                                if (nextElement)
                                  nextElement.style.display = "flex";
                              }}
                            />
                            {/* <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 hidden">
                              {network.symbol[0]}
                            </div> */}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{network.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {network.symbol}
                            </div>
                          </div>
                          {network.id === toNetwork.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>

              <Card className="p-4 bg-secondary/50 border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                    <img
                      src={selectedToken.chainIconUrl}
                      alt={selectedToken.name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = "none";
                        const nextElement =
                          target.nextElementSibling as HTMLElement;
                        if (nextElement) nextElement.style.display = "flex";
                      }}
                    />
                    {/* <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold hidden">
                      {selectedToken.symbol[0]}
                    </div> */}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{selectedToken.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      PolkaVM {selectedToken.name}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-4 bg-secondary/30 border-border/50">
              <div className="text-2xl font-mono text-muted-foreground">
                {amount || "0.0"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                You will receive ≈ {amount || "0.0"} PolkaVM{" "}
                {selectedToken.symbol}
              </div>
            </Card>
          </div>

          {/* Recipient Address Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Recipient Address</label>
              <Badge variant="outline" className="text-xs">
                PolkaVM Address
              </Badge>
            </div>

            <div className="relative">
              <Input
                type="text"
                placeholder="Your EVM address here"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className={`pr-12 ${
                  recipientAddress && !isValidEvmAddress(recipientAddress)
                    ? "border-red-500 focus:border-red-500"
                    : recipientAddress && isValidEvmAddress(recipientAddress)
                    ? "border-green-500 focus:border-green-500"
                    : ""
                }`}
              />
              {recipientAddress && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={copyAddress}>
                  {addressCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              )}
            </div>

            {recipientAddress && !isValidEvmAddress(recipientAddress) && (
              <p className="text-sm text-red-500">
                Please enter a valid EVM address (0x...)
              </p>
            )}

            {/* EVM Balance Display */}
            {recipientAddress && isValidEvmAddress(recipientAddress) && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>Balance on {toNetwork.name}:</span>
                {isLoadingEvmBalance ? (
                  <span>Loading...</span>
                ) : evmBalance !== null ? (
                  <span className="font-medium text-primary">
                    {parseFloat(evmBalance).toFixed(4)} {toNetwork.symbol}
                  </span>
                ) : (
                  <span>0.0000 {toNetwork.symbol}</span>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Enter the PolkaVM address where you want to receive your tokens.
              Make sure you control this address.
            </p>
          </div>

          {/* Bridge Button */}
          <Button
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 glow-effect"
            disabled={
              !amount ||
              !recipientAddress ||
              !isValidEvmAddress(recipientAddress) ||
              isBridging
            }
            onClick={bridgeTokens}>
            {isBridging
              ? "🔄 Bridging..."
              : !recipientAddress
              ? "Enter Recipient Address"
              : !isValidEvmAddress(recipientAddress)
              ? "Invalid EVM Address"
              : !amount
              ? "Enter Amount"
              : `Bridge ${amount} ${selectedToken.symbol}`}
          </Button>
        </Card>
      </div>

      {/* Transaction Progress Dialog */}
      <Dialog
        open={showTransactionDialog}
        onOpenChange={setShowTransactionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-blue-600">
              Transaction Progress
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Bridging tokens to PolkaVM...
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Transaction Hash */}
            {currentTxHash && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Current TX:</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-blue-600 underline">
                    {currentTxHash.slice(0, 6)}...{currentTxHash.slice(-4)}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Transaction Steps */}
            <div className="space-y-3">
              {/* Map Account Step */}
              <div className="flex items-center gap-3">
                {transactionSteps.mapAccount.status === "completed" ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : transactionSteps.mapAccount.status === "active" ? (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
                <span
                  className={`text-sm ${
                    transactionSteps.mapAccount.status === "active"
                      ? "text-blue-600 font-medium"
                      : transactionSteps.mapAccount.status === "completed"
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}>
                  Map Account
                </span>
              </div>

              {/* Call Step */}
              <div className="flex items-center gap-3">
                {transactionSteps.call.status === "completed" ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : transactionSteps.call.status === "active" ? (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
                <span
                  className={`text-sm ${
                    transactionSteps.call.status === "active"
                      ? "text-blue-600 font-medium"
                      : transactionSteps.call.status === "completed"
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}>
                  Bridge Call
                </span>
              </div>
            </div>

            {/* Status Message */}
            {transactionSteps.mapAccount.status === "active" && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                <span className="text-sm text-yellow-800">
                  Waiting for confirmation...
                </span>
              </div>
            )}
            {transactionSteps.call.status === "active" && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                <span className="text-sm text-yellow-800">
                  Waiting for confirmation...
                </span>
              </div>
            )}

            {/* Processing Button */}
            <Button
              className="w-full bg-pink-500 hover:bg-pink-600 text-white"
              disabled>
              Processing...
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
