import { clsx, type ClassValue } from "clsx";
import { Binary } from "polkadot-api";
import { twMerge } from "tailwind-merge";
import { blake2AsU8a, decodeAddress } from "@polkadot/util-crypto";
import { ss58Address } from "@polkadot-labs/hdkd-helpers";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function ss58ToH160(ss58Address: string): Binary {
    // Decode the SS58 address to a Uint8Array public key
    const publicKey = decodeAddress(ss58Address);
  
    // Take the first 20 bytes of the hashed public key for the Ethereum address
    const ethereumAddressBytes = publicKey.slice(0, 20);
  
    return new Binary(ethereumAddressBytes);
}

export function convertPublicKeyToSs58(publickey: Uint8Array, ss58Format: number) {
  return ss58Address(publickey, ss58Format);
}




  