import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const Input = forwardRef(function Input({ label, icon: Icon, leftIcon, rightIcon, error, type = 'text', ...rest }, ref) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div>
      <label className="block">
        {label && <span className="mb-1.5 block text-xs font-semibold text-[#C4B4C9] uppercase tracking-wider">{label}</span>}
        <span className={`flex h-12 items-center gap-3 rounded-2xl border bg-[#170F1B] px-3.5 transition focus-within:border-[#EC55C8] focus-within:ring-2 focus-within:ring-[#EC55C8]/20 ${error ? 'border-danger' : 'border-[#593650]'}`}>
          {leftIcon ? leftIcon : Icon && <Icon className="h-5 w-5 shrink-0 text-[#94849A]" aria-hidden />}
          <input
            ref={ref}
            type={isPassword && show ? 'text' : type}
            aria-invalid={!!error}
            className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-[#94849A]/70"
            {...rest}
          />
          {rightIcon && rightIcon}
          {isPassword && (
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="text-[#94849A] hover:text-white transition">
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}
        </span>
      </label>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
})

export default Input
