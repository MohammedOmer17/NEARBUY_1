import { useMemo } from 'react'
import { deduplicateCategories } from '../../utils/categories'

export default function CategoryChips({ categories = [], value, onChange }) {
  const cleanCategories = useMemo(() => deduplicateCategories(categories), [categories])

  if (cleanCategories.length < 2) return null

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1" role="tablist" aria-label="Categories">
      {cleanCategories.map((c) => {
        const active = (c === 'All' && !value) || c === value
        return (
          <button
            key={`category-chip-${c}`}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(c === 'All' ? '' : c)}
            className={`h-9 shrink-0 rounded-full px-4 text-xs font-bold transition-all duration-150 ${
              active
                ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white shadow-md shadow-pink-500/25'
                : 'bg-[#211522] border border-[#593650] text-[#C4B4C9] hover:bg-[#2B1B2D] hover:text-white'
            }`}
          >
            {c}
          </button>
        )
      })}
    </div>
  )
}
