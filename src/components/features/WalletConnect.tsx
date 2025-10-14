
'use client'

import { ConnectButton } from '@luno-kit/ui'
import { useAccount, useAccounts, useDisconnect } from '@luno-kit/react'
import { useState, useCallback } from 'react'
import { ChevronDown, Check, User } from 'lucide-react'
import { useClickOutside } from '@/hooks/useClickOutside'

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatAccountName(account: any) {
  return account.name || account.meta?.name || formatAddress(account.address)
}

export function WalletConnect() {
  const { account } = useAccount()
  const { accounts, selectAccount } = useAccounts()
  const { disconnect, isPending } = useDisconnect()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false)
  }, [])

  const dropdownRef = useClickOutside<HTMLDivElement>(closeDropdown)

  if (account) {
    const hasMultipleAccounts = accounts.length > 1

    return (
      <div className="flex items-center gap-3">
        {hasMultipleAccounts ? (
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg border border-border/50 hover:bg-secondary/70 transition-colors"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">
                {formatAccountName(account)}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-border rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <div className="text-xs text-muted-foreground px-2 py-1 mb-1">
                    Switch Account
                  </div>
                  {accounts.map((acc) => (
                    <button
                      key={acc.address}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-secondary/50 transition-colors text-left"
                      onClick={() => {
                        selectAccount(acc)
                        setIsDropdownOpen(false)
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {formatAccountName(acc)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {formatAddress(acc.address)}
                        </div>
                      </div>
                      {acc.address === account.address && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg border border-border/50">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">
              {formatAccountName(account)}
            </span>
          </div>
        )}
        
        <button
          className="h-9 rounded-md px-3 border border-border/50 hover:bg-secondary/50 text-sm"
          onClick={() => disconnect()}
          disabled={isPending}
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <ConnectButton
      className="h-9 rounded-md px-3 bg-primary text-primary-foreground hover:bg-primary/90"
    />
  )
}
