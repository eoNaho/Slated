import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export utilities
export { clsx } from 'clsx'
export { cva, type VariantProps } from 'class-variance-authority'

// Components will be added here as we build them
// export * from './components/button'
// export * from './components/card'
// etc.
