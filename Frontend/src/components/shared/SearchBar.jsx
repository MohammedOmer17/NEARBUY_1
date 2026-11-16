import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Search for products or shops...', className = '' }) {
  return (
    <div className={`flex h-12 items-center gap-3 rounded-2xl bg-[#170F1B] border border-[#593650] px-4 shadow-card transition focus-within:border-[#EC55C8] focus-within:ring-2 focus-within:ring-[#EC55C8]/20 ${className}`}>
      <Search className="h-5 w-5 shrink-0 text-[#94849A]" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-[#94849A]/70 [&::-webkit-search-cancel-button]:hidden text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="text-[#94849A] hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
