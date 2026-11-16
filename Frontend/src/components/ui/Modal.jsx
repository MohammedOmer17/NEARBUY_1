import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[min(90dvh,45rem)] w-full max-w-lg overflow-y-auto rounded-t-[32px] md:rounded-[28px] border border-[#593650] bg-[#211522] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl text-white">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#593650] md:hidden" />
        {title && <h2 className="text-xl font-black text-white">{title}</h2>}
        <div className="mt-3 text-[15px] leading-relaxed text-[#C4B4C9]">{children}</div>
        {footer && <div className="mt-6 flex flex-col gap-2">{footer}</div>}
      </div>
    </div>
  )
}
