export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      {Icon && (
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-[#2B1B2D] text-[#EC55C8] border border-[#593650] shadow-md shadow-pink-500/10">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {text && <p className="mt-1.5 max-w-xs text-sm leading-6 text-[#C4B4C9]">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
