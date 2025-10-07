"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Wallet, ChevronDown, Zap, Clock, Copy, Check, X, ExternalLink, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  supportedChains,
  supportedPolkaVMChains,
  type SupportedChain,
  type SupportedPolkaVMChain,
  getChainConfig,
  getPolkaVMChainConfig
} from "@/lib/chains"
import { ConnectButton } from "./connect-button"
import { toast } from "sonner"
import { Binary } from "polkadot-api"
import { ss58Address } from "@polkadot-labs/hdkd-helpers";

import { ss58ToH160 } from "@/lib/utils"

import { ethers } from 'ethers'
import { useAccount, usePapiSigner, useStatus } from "@luno-kit/react";
import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/web';

const SS58_PREFIX = 42;
export function convertPublicKeyToSs58(publickey: Uint8Array) {
  return ss58Address(publickey, SS58_PREFIX);
}

async function ensureAccountMapped(api: any, signer: any, senderAddress: string, setTransactionSteps: any, setCurrentTxHash: any) {
  const mapped = await api.query.Revive.OriginalAccount.getValue(
    ss58ToH160(senderAddress),
  );

  if (mapped) {
    console.log(`Account already mapped`);
    setTransactionSteps((prev: any) => ({
      ...prev,
      mapAccount: { status: 'completed', txHash: null }
    }));
    return;
  }

  console.log('Mapping account...');
  setTransactionSteps((prev: any) => ({
    ...prev,
    mapAccount: { status: 'active', txHash: null }
  }));
  
  const result = await mapAccount(api, signer);
  const txHash = (result as any).txHash;
  
  setTransactionSteps((prev: any) => ({
    ...prev,
    mapAccount: { status: 'completed', txHash }
  }));
  setCurrentTxHash(txHash);
}

async function mapAccount(api: any, signer: any) {
  const tx = api.tx.Revive.map_account();
  
  const options = {
    mortality: { mortal: true, period: 64 },
  };
  
  const obsTxEvents = tx.signSubmitAndWatch(signer, options);
  
  return new Promise((resolve, reject) => {
    const subscription = obsTxEvents.subscribe((event: any) => {
      console.log('📡 Mapping transaction event:', event);
      
      if (event.type === 'finalized') {
        subscription.unsubscribe();
        resolve(event);
      } else if (event.type === 'error') {
        subscription.unsubscribe();
        reject(event.error);
      }
    });
  });
}


const networkColors: Record<string, string> = {
  polkadot: "bg-pink-500",
  kusama: "bg-green-500",
  westend: "bg-blue-500",
  paseo: "bg-purple-500",
  paseoah: "bg-orange-500",
  paseoAssetHub: "bg-red-500",
  passet: "bg-purple-600",
  wah: "bg-blue-600"
}

const fromNetworks = Object.entries(supportedChains).map(([key, config]) => ({
  id: key as SupportedChain,
  name: config.displayName,
  symbol: config.symbol,
  imageUrl: config.imageUrl
}))

const toNetworks = Object.entries(supportedPolkaVMChains).map(([key, config]) => ({
  id: key as SupportedPolkaVMChain,
  name: config.displayName,
  symbol: config.symbol,
  imageUrl: config.imageUrl
}))

const getTokensForNetwork = (networkId: string) => {
  switch (networkId) {
    case 'passet':
      return [{ symbol: "PAS", name: "Paseo Token", price: "$", imageUrl:"https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/dot.svg" }]
    case 'wah':
      return [{ symbol: "WND", name: "Westend Token", price: "$", imageUrl:"https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/dot.svg" }]
    case 'kah': 
      return [{ symbol: "KUS", name: "Kusama Token", price: "$", imageUrl:"https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama.svg" }]
      default:
        return [{ symbol: "WND", name: "Westend Token", price: "$", imageUrl:"https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/dot.svg" }]
  }
}

export function TokenBridge() {
  const { address } = useAccount();
  const { data: papiSigner } = usePapiSigner();
  const status = useStatus();
  const isConnected = status === "connected";
  const [selectedAccount, setSelectedAccount] = useState<{ address: string, signer: any } | null>(null);
  const [papiClient, setPapiClient] = useState<any>(null);
  const [isPapiClientReady, setIsPapiClientReady] = useState(false);
  const [fromNetwork, setFromNetwork] = useState(fromNetworks[0])
  const [toNetwork, setToNetwork] = useState(toNetworks[0])
  const [selectedToken, setSelectedToken] = useState(getTokensForNetwork(fromNetworks[0].id)[0])
  const [amount, setAmount] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [addressCopied, setAddressCopied] = useState(false)
  const [accountBalance, setAccountBalance] = useState<string>("0.0000")
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [isBridging, setIsBridging] = useState(false)
  const [bridgeError, setBridgeError] = useState<string | null>(null)
  const [evmBalance, setEvmBalance] = useState<string | null>(null)
  const [isLoadingEvmBalance, setIsLoadingEvmBalance] = useState(false)
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [transactionSteps, setTransactionSteps] = useState({
    mapAccount: { status: 'pending' as 'pending' | 'active' | 'completed', txHash: null as string | null },
    call: { status: 'pending' as 'pending' | 'active' | 'completed', txHash: null as string | null }
  })
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected && address && papiSigner) {
      setSelectedAccount({ address, signer: papiSigner });
    } else {
      setSelectedAccount(null);
    }
  }, [isConnected, address, papiSigner]);

  const initializePapiClient = async (chainConfig: any) => {
    try {
      if (papiClient) {
        papiClient.destroy();
      }

      setIsPapiClientReady(false);

      const client = createClient(
        getWsProvider(chainConfig.wsUrls[0], (_status) => {
          switch (_status.type) {
            case 0:
              console.info('⚫️ Connecting to ==> ', chainConfig.displayName);
              break;
            case 1:
              console.info('🟢 Provider connected ==> ', chainConfig.displayName);
              setIsPapiClientReady(true);
              break;
            case 2:
              console.info('🔴 Provider error ==> ', chainConfig.displayName);
              setIsPapiClientReady(false);
              break;
            case 3:
              console.info('🟠 Provider closed ==> ', chainConfig.displayName);
              setIsPapiClientReady(false);
              break;
          }
        })
      );

      setPapiClient(client);
      return client;
    } catch (error) {
      console.error('Failed to initialize PAPI client:', error);
      setIsPapiClientReady(false);
      throw error;
    }
  };

  const formatBalance = (balance: bigint, decimals: number = 10): string => {
    const divisor = BigInt(10 ** decimals)
    const whole = balance / divisor
    const remainder = balance % divisor
    const fractional = Number(remainder) / Number(divisor)
    return `${whole}.${fractional.toFixed(4).slice(2)}`
  }

  const fetchAccountBalance = async () => {
    if (!selectedAccount?.address) {
      console.log('❌ No selected account address')
      setAccountBalance("0.0000")
      return
    }

    if (!papiClient || !isPapiClientReady) {
      console.log('❌ PAPI client not ready yet')
      setAccountBalance("0.0000")
      return
    }

    setIsLoadingBalance(true)
    try {
      console.log(`🔍 Fetching balance for ${selectedAccount.address} on chain ${fromNetwork.id}...`)

      if (!selectedAccount.address.startsWith('5') || selectedAccount.address.length !== 48) {
        console.error('❌ Invalid address format:', selectedAccount.address)
        setAccountBalance("0.0000")
        return
      }

      const networkConfig = getChainConfig(fromNetwork.id)
      
      let typedApi
      try {
        if (networkConfig.chainSpec) {
          const chainSpec = await networkConfig.chainSpec()
          typedApi = papiClient.getTypedApi(chainSpec?.chainSpec)
        } else {
          typedApi = papiClient.getTypedApi()
        }
      } catch (apiError) {
        console.error('❌ Failed to get typed API:', apiError)
        setAccountBalance("0.0000")
        return
      }

      const account = await typedApi.query.System.Account.getValue(selectedAccount.address)
      console.log('📊 Raw account data:', account)

      const balance = account.data.free
      console.log('💰 Raw balance (planck):', balance.toString())
      const decimals = networkConfig.decimals
      const formattedBalance = formatBalance(balance, decimals)

      setAccountBalance(formattedBalance)
      console.log(`✅ Balance for ${selectedAccount.address}: ${formattedBalance} ${networkConfig.symbol}`)
    } catch (error) {
      console.error('❌ Failed to fetch balance:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      })
      setAccountBalance("0.0000")
    } finally {
      setIsLoadingBalance(false)
    }
  }

  useEffect(() => {
    const initializeClient = async () => {
      console.log(`🔄 Switching to chain: ${fromNetwork.id} (${fromNetwork.name})`)
      const networkConfig = getChainConfig(fromNetwork.id)
      try {
        await initializePapiClient(networkConfig)
      } catch (error) {
        console.error('Failed to initialize PAPI client:', error)
      }
    }
    
    initializeClient()
  }, [fromNetwork.id])

  useEffect(() => {
    console.log('🔄 useEffect triggered for balance fetch:', {
      selectedAccountAddress: selectedAccount?.address,
      hasPapiClient: !!papiClient,
      isPapiClientReady: isPapiClientReady,
      fromNetworkId: fromNetwork.id,
    })
    fetchAccountBalance()
  }, [selectedAccount?.address, papiClient, isPapiClientReady, fromNetwork.id])

  useEffect(() => {
    const availableTokens = getTokensForNetwork(fromNetwork.id)
    setSelectedToken(availableTokens[0])
  }, [fromNetwork.id])

  useEffect(() => {
    const mappedTo = toNetworks.find(n => n.id === fromNetwork.id)
    if (mappedTo && mappedTo.id !== toNetwork.id) {
      setToNetwork(mappedTo)
    }
  }, [fromNetwork.id])

  const swapNetworks = () => {
    const currentFromIndex = fromNetworks.findIndex(n => n.id === fromNetwork.id)
    const nextFromIndex = (currentFromIndex + 1) % fromNetworks.length
    const nextFrom = fromNetworks[nextFromIndex]
    const mappedTo = toNetworks.find(n => n.id === nextFrom.id) || toNetworks[0]

    setFromNetwork(nextFrom)
    setToNetwork(mappedTo)
  }

  const handleFromNetworkSelect = (network: typeof fromNetworks[0]) => {
    setFromNetwork(network)
    const mappedTo = toNetworks.find(n => n.id === network.id)
    if (mappedTo) {
      setToNetwork(mappedTo)
    }
  }

  const handleToNetworkSelect = (network: typeof toNetworks[0]) => {
    setToNetwork(network)
  }

  const copyAddress = async () => {
    if (recipientAddress) {
      await navigator.clipboard.writeText(recipientAddress)
      setAddressCopied(true)
      setTimeout(() => setAddressCopied(false), 2000)
    }
  }

  const isValidEvmAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  const fetchEvmBalance = async (address: string) => {
    if (!toNetwork) return
    setIsLoadingEvmBalance(true)
    setEvmBalance(null)
    try {
      const networkConfig = getPolkaVMChainConfig(toNetwork.id)
      if (!networkConfig || !networkConfig.rpcUrl) {
        throw new Error(`No RPC URL configured for ${toNetwork.name}`)
      }
      
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl)
      
      const balance = await provider.getBalance(address)
      
      const decimals = networkConfig.decimals || 18
      const formattedBalance = formatBalance(balance, decimals)
      setEvmBalance(formattedBalance)
    } catch (error) {
      console.error('Failed to fetch EVM balance:', error)
      setEvmBalance(null)
    } finally {
      setIsLoadingEvmBalance(false)
    }
  }

  useEffect(() => {
    if (isValidEvmAddress(recipientAddress)) {
      fetchEvmBalance(recipientAddress)
    } else {
      setEvmBalance(null)
    }
  }, [recipientAddress, toNetwork.id])

  const amountToPlanck = (amount: string, decimals: number = 10): bigint => {
    if (!amount || isNaN(Number(amount))) return BigInt(0)
    const multiplier = BigInt(10 ** decimals)
    const wholePart = BigInt(Math.floor(Number(amount)))
    const fractionalPart = Number(amount) - Number(wholePart)
    const fractionalPlanck = BigInt(Math.floor(fractionalPart * Number(multiplier)))
    return wholePart * multiplier + fractionalPlanck
  }

  const bridgeTokens = async () => {
    if (!selectedAccount?.address || !amount || !recipientAddress) {
      console.error('❌ Missing required data for bridge transaction')
      return
    }

    setIsBridging(true)
    setBridgeError(null)
    setShowTransactionDialog(true)
    setTransactionSteps({
      mapAccount: { status: 'pending', txHash: null },
      call: { status: 'pending', txHash: null }
    })
    setCurrentTxHash(null)

    try {
      console.log('🌉 Starting bridge transaction...')
      console.log('📋 Transaction details:', {
        from: selectedAccount.address,
        to: recipientAddress,
        amount: amount,
        chainId: fromNetwork.id
      })

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error('Invalid amount. Please enter a valid positive number.')
      }

      const networkConfig = getChainConfig(fromNetwork.id)
      const decimals = networkConfig.decimals
      const valueInPlanck = amountToPlanck(amount, decimals)

      console.log(
        `💰 Amount in: ${formatBalance(
          valueInPlanck,
          decimals,
        )} ${networkConfig.symbol}`,
      )

      console.log('🔌 Initializing PAPI client...')
      const client = await initializePapiClient(networkConfig)
      
      await new Promise(resolve => setTimeout(resolve, 1000))

      const chainSpec = networkConfig.chainSpec ? await networkConfig.chainSpec() : undefined
      const typedApi = client.getTypedApi(chainSpec?.chainSpec)
      
      console.log('🔍 Checking if account is mapped...')
      await ensureAccountMapped(typedApi, papiSigner, selectedAccount.address, setTransactionSteps, setCurrentTxHash)

      console.log('✍️ Signing call transaction...')
      
      setTransactionSteps((prev: any) => ({
        ...prev,
        call: { status: 'active', txHash: null }
      }))
      
      const call = (typedApi.tx.Revive as any).call({
        dest: Binary.fromHex(recipientAddress),
        value: valueInPlanck,
        gas_limit: {
          ref_time: BigInt(1e12),
          proof_size: BigInt(1e6), 
        },
        storage_deposit_limit: BigInt(1000000000000000),
        data: Binary.fromHex("0x")
      })

      console.log('📝 Transaction prepared:', call)

      const result = await new Promise((resolve, reject) => {
        const subscription = call.signSubmitAndWatch(papiSigner).subscribe({
          next: (event: any) => {
            console.log('📡 Transaction event:', event.type)
            
            if (event.type === 'txBestBlocksState') {
              subscription.unsubscribe()
              resolve({
                status: 'success',
                txHash: event.txHash,
                errorMessage: null,
              })
            }
          },
          error: (error: any) => {
            subscription.unsubscribe()
            reject(error)
          },
        })
      })
        
      console.log('✅ Transaction successful:', result)
      
      const txHash = (result as any).txHash;
      setTransactionSteps((prev: any) => ({
        ...prev,
        call: { status: 'completed', txHash }
      }));
      setCurrentTxHash(txHash);

      console.log('📤 Transaction completed:', result)

      await fetchAccountBalance()

      console.log('🎉 Bridge transaction completed successfully!')

      setTimeout(() => {
        setShowTransactionDialog(false)
      }, 2000)

      toast.success(
        <div className="space-y-1">
          <div className="font-medium">Bridge successful! 🎉</div>
          <div className="text-sm text-muted-foreground">
            {amount} {fromNetwork.symbol} bridged to PolkaVM
          </div>
          {txHash && (
            <div className="text-sm text-muted-foreground font-mono">
              TX: {txHash}
            </div>
          )}
        </div>,
        { id: 'bridge-tx', duration: 10000 },
      )

      setAmount("")
      setRecipientAddress("")

    } catch (error) {
      console.error('❌ Bridge transaction failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Bridge transaction failed'
      setBridgeError(errorMessage)
      setShowTransactionDialog(false)

      toast.error(
        <div className="space-y-1">
          <div className="font-medium">Bridge failed ❌</div>
          <div className="text-sm text-muted-foreground">{errorMessage}</div>
        </div>,
        { id: 'bridge-tx', duration: 5000 }
      )
    } finally {
      setIsBridging(false)
    }
  }

  return (
    <div className="min-h-screen network-grid">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-balance">PolkaVM Bridge</h1>
          </div>

          <div className="flex items-center gap-4">
            <ConnectButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-balance">Bridge Your Tokens to PolkaVM Asset Hub</h2>
          <p className="text-muted-foreground text-pretty">
            Convert native tokens to PolkaVM Asset Hub tokens seamlessly
          </p>
        </div>


        {bridgeError && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <div className="text-sm">
              <div className="font-medium text-red-800 mb-2">❌ Bridge Transaction Failed</div>
              <div className="text-red-700">{bridgeError}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBridgeError(null)}
                className="mt-2 text-red-600 hover:text-red-800"
              >
                Dismiss
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6 token-card-hover glow-effect">
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
                          src={fromNetwork.imageUrl} 
                          alt={fromNetwork.name}
                          className="w-8 h-8 object-contain"
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            const img = e.currentTarget
                            img.style.display = 'none'
                            const fallback = img.nextElementSibling as HTMLElement | null
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 hidden">
                          {fromNetwork.symbol[0]}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{fromNetwork.name}</div>
                        <div className="text-xs text-muted-foreground">{fromNetwork.symbol}</div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80">
                    <ScrollArea className="h-64">
                      {fromNetworks.map((network) => (
                        <DropdownMenuItem
                          key={network.id}
                          onClick={() => handleFromNetworkSelect(network)}
                          className="flex items-center gap-3 p-3 cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                            <img 
                              src={network.imageUrl} 
                              alt={network.name}
                              className="w-8 h-8 object-contain"
                              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                const img = e.currentTarget
                                img.style.display = 'none'
                                const fallback = img.nextElementSibling as HTMLElement | null
                                if (fallback) fallback.style.display = 'flex'
                              }}
                            />
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 hidden">
                              {network.symbol[0]}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{network.name}</div>
                            <div className="text-xs text-muted-foreground">{network.symbol}</div>
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
                      src={selectedToken.imageUrl} 
                      alt={selectedToken.name}
                      className="w-8 h-8 object-contain"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        // Fallback to first letter if image fails to load
                        const img = e.currentTarget
                        img.style.display = 'none'
                        const fallback = img.nextElementSibling as HTMLElement | null
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold hidden">
                      {selectedToken.symbol[0]}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{selectedToken.symbol}</div>
                    <div className="text-xs text-muted-foreground">{selectedToken.name}</div>
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
                  const value = e.target.value
                  if (value === '' || (Number(value) >= 0 && !isNaN(Number(value)))) {
                    setAmount(value)
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
                onClick={() => setAmount(accountBalance)}
                disabled={isLoadingBalance || accountBalance === "0.0000"}
              >
                MAX
              </Button>
            </div>

            <div className="flex justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
              <span>
                  Balance: {isLoadingBalance ? "Loading..." : `${accountBalance} ${fromNetwork.symbol}`}
              </span>
                {selectedAccount?.address && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchAccountBalance}
                      disabled={isLoadingBalance}
                      className="h-6 px-2 text-xs"
                    >
                      🔄
                    </Button>
                  </div>
                )}
              </div>
              <span>{selectedToken.price}</span>
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={swapNetworks}
              className="rounded-full border-border/50 hover:bg-secondary/50 hover:border-primary/50 bg-transparent"
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>

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
                          src={toNetwork.imageUrl} 
                          alt={toNetwork.name}
                          className="w-8 h-8 object-contain"
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            const img = e.currentTarget
                            img.style.display = 'none'
                            const fallback = img.nextElementSibling as HTMLElement | null
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 hidden">
                          {toNetwork.symbol[0]}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{toNetwork.name}</div>
                        <div className="text-xs text-muted-foreground">{toNetwork.symbol}</div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80">
                    <ScrollArea className="h-64">
                      {toNetworks.map((network) => (
                        <DropdownMenuItem
                          key={network.id}
                          onClick={() => handleToNetworkSelect(network)}
                          className="flex items-center gap-3 p-3 cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                            <img 
                              src={network.imageUrl} 
                              alt={network.name}
                              className="w-8 h-8 object-contain"
                              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                const img = e.currentTarget
                                img.style.display = 'none'
                                const fallback = img.nextElementSibling as HTMLElement | null
                                if (fallback) fallback.style.display = 'flex'
                              }}
                            />
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 hidden">
                              {network.symbol[0]}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{network.name}</div>
                            <div className="text-xs text-muted-foreground">{network.symbol}</div>
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
                      src={selectedToken.imageUrl} 
                      alt={selectedToken.name}
                      className="w-8 h-8 object-contain"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        // Fallback to first letter if image fails to load
                        const img = e.currentTarget
                        img.style.display = 'none'
                        const fallback = img.nextElementSibling as HTMLElement | null
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold hidden">
                      {selectedToken.symbol[0]}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{selectedToken.symbol}</div>
                    <div className="text-xs text-muted-foreground">PolkaVM {selectedToken.name}</div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-4 bg-secondary/30 border-border/50">
              <div className="text-2xl font-mono text-muted-foreground">{amount || "0.0"}</div>
              <div className="text-sm text-muted-foreground mt-1">
                You will receive ≈ {amount || "0.0"} PolkaVM {selectedToken.symbol}
              </div>
            </Card>
          </div>

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
                className={`pr-12 ${recipientAddress && !isValidEvmAddress(recipientAddress)
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
                  onClick={copyAddress}
                >
                  {addressCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              )}
            </div>

            {recipientAddress && !isValidEvmAddress(recipientAddress) && (
              <p className="text-sm text-red-500">Please enter a valid EVM address (0x...)</p>
            )}

            {(isLoadingEvmBalance || evmBalance !== null) && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>Balance on {toNetwork.name}:</span>
                {isLoadingEvmBalance ? (
                  <span>Loading...</span>
                ) : (
                  <span className="font-medium text-primary">{evmBalance} {toNetwork.symbol}</span>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Enter the PolkaVM address where you want to receive your tokens. Make sure you control this address.
            </p>
          </div>

          <Button
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 glow-effect"
            disabled={!isConnected || !amount || !recipientAddress || !isValidEvmAddress(recipientAddress) || isBridging}
            onClick={bridgeTokens}
          >
            {isBridging
              ? "🔄 Bridging..."
              : !isConnected
              ? "Connect Wallet to Bridge"
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

      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-blue-600">Transaction Progress</DialogTitle>
            <p className="text-sm text-muted-foreground">Bridging tokens to PolkaVM...</p>
          </DialogHeader>
          
          <div className="space-y-4">
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

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {transactionSteps.mapAccount.status === 'completed' ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : transactionSteps.mapAccount.status === 'active' ? (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
                <span className={`text-sm ${transactionSteps.mapAccount.status === 'active' ? 'text-blue-600 font-medium' : transactionSteps.mapAccount.status === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                  Map Account
                </span>
              </div>

              <div className="flex items-center gap-3">
                {transactionSteps.call.status === 'completed' ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : transactionSteps.call.status === 'active' ? (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
                <span className={`text-sm ${transactionSteps.call.status === 'active' ? 'text-blue-600 font-medium' : transactionSteps.call.status === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                  Bridge Call
                </span>
              </div>
            </div>

            {transactionSteps.mapAccount.status === 'active' && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                <span className="text-sm text-yellow-800">Waiting for confirmation...</span>
              </div>
            )}
            {transactionSteps.call.status === 'active' && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                <span className="text-sm text-yellow-800">Waiting for confirmation...</span>
              </div>
            )}

            <Button 
              className="w-full bg-pink-500 hover:bg-pink-600 text-white"
              disabled
            >
              Processing...
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
