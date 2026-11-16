export default function Skeleton({ className = '' }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-[#2B1B2D] border border-[#593650]/40 ${className}`} />
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="min-w-0 rounded-2xl bg-[#211522] border border-[#593650] p-3 shadow-card">
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="mt-3 h-4 w-4/5" />
          <Skeleton className="mt-2 h-3 w-1/3" />
          <Skeleton className="mt-3 h-10 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}
