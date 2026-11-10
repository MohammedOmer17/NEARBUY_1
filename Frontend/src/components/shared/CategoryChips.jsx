import { useMemo } from 'react'
import { deduplicateCategories } from '../../utils/categories'

export default function CategoryChips({ categories = [], value, onChange }) {
  const cleanCategories = useMemo(() => deduplicateCategories(categories), [categories])

  if (cleanCategories.length < 2) return null

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Categories">
      {cleanCategories.map((c) => {
        const active = (c === 'All' && !value) || c === value
        return (
          <button
            key={`category-chip-${c}`}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(c === 'All' ? '' : c)}
            className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition ${active ? 'bg-brand-600 text-white' : 'bg-white text-ink shadow-card'}`}
          >
            {c}
          </button>
        )
      })}
    </div>
  )
}

