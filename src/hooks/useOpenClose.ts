import { useState } from "react"

export interface UseOpenCloseReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export function useOpenClose(initialState = false): UseOpenCloseReturn {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(prev => !prev)

  return {
    isOpen,
    open,
    close,
    toggle
  }
}
