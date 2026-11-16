import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] hover:from-[#F58AD8] hover:to-[#C671EC] text-white active:scale-[0.98] shadow-[0_4px_16px_rgba(236,85,200,0.35)]',
  brand: 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] hover:from-[#F58AD8] hover:to-[#C671EC] text-white active:scale-[0.98] shadow-[0_4px_16px_rgba(236,85,200,0.35)]',
  soft: 'bg-[#2B1B2D] text-[#F58AD8] border border-[#593650] hover:bg-[#38233b] active:scale-[0.98]',
  outline: 'border border-[#593650] bg-[#211522] text-white hover:bg-[#2B1B2D] hover:border-[#EC55C8]/50 active:scale-[0.98]',
  danger: 'border border-danger/40 bg-[#211522] text-danger hover:bg-danger/15 active:scale-[0.98]',
  ghost: 'text-[#C4B4C9] hover:text-white hover:bg-white/5 active:scale-[0.98]',
}
const sizes = { md: 'min-h-12 px-6 py-2 text-[15px]', sm: 'min-h-10 px-4 py-1.5 text-sm', icon: 'h-10 w-10' }

export default function Button({ variant = 'primary', size = 'md', loading = false, full = false, className = '', children, disabled, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex min-w-0 shrink-0 items-center justify-center gap-2 rounded-full text-center font-bold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}
