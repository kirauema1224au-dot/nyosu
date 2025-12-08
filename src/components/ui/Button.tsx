import React from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  pill?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  pill,
  className,
  ...rest
}: Props) {
  const base = 'inline-flex items-center justify-center gap-1 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed'
  const rounded = pill ? 'rounded-full' : 'rounded-md'
  const sizes: Record<Size, string> = {
    sm: 'text-sm px-2.5 py-1.5',
    md: 'text-sm px-3 py-2'
  }
  const variants: Record<Variant, string> = {
    primary: 'accent-btn',
    secondary: 'border border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50',
    danger: 'bg-rose-600 text-white border border-rose-600 hover:bg-rose-500',
    ghost: 'text-slate-200 hover:bg-slate-800/50 border border-transparent'
  }
  return (
    <button className={cn(base, rounded, sizes[size], variants[variant], className)} {...rest} />
  )
}
