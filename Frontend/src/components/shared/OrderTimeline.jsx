import { Check, XCircle } from 'lucide-react'
import { timelineFor } from '../../utils/orderMeta'

export default function OrderTimeline({ order }) {
  if (!order) return null
  if (order.status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-danger/15 border border-danger/30 p-4 text-danger">
        <XCircle className="h-6 w-6" /><p className="font-semibold text-sm">This order was cancelled</p>
      </div>
    )
  }
  const { steps, current } = timelineFor(order)
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const done = i < current || (current === steps.length - 1 && i === current)
        const active = i === current && !done
        return (
          <li key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`grid h-6 w-6 place-items-center rounded-full border-2 ${
                done
                  ? 'border-[#20C878] bg-[#20C878] text-white shadow-sm shadow-[#20C878]/30'
                  : active
                    ? 'border-[#EC55C8] bg-[#211522] shadow-sm shadow-pink-500/20'
                    : 'border-[#593650] bg-[#170F1B]'
              }`}>
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : active ? <span className="h-2 w-2 rounded-full bg-[#EC55C8]" /> : null}
              </span>
              {i < steps.length - 1 && (
                <span
                  className={`my-0.5 w-0.5 flex-1 ${i < current ? 'bg-[#20C878]' : 'bg-[#593650]'}`}
                  style={{ minHeight: 22 }}
                />
              )}
            </div>
            <p className={`pb-4 text-xs sm:text-sm ${active ? 'font-bold text-[#EC55C8]' : done ? 'font-semibold text-white' : 'text-[#94849A]'}`}>
              {s.label}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
