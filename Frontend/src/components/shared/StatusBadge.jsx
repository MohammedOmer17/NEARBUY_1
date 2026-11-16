import { STATUS_LABEL, PAYMENT_STATUS_LABEL } from '../../utils/orderMeta'

const TONES = {
  ok: 'bg-[#20C878]/15 text-[#20C878] border border-[#20C878]/30',
  warn: 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30',
  danger: 'bg-[#F05A79]/15 text-[#F05A79] border border-[#F05A79]/30',
  brand: 'bg-[#EC55C8]/15 text-[#F58AD8] border border-[#EC55C8]/30',
}

export function OrderStatusBadge({ status }) {
  const tone = status === 'completed' || status === 'delivered' ? 'ok' : status === 'cancelled' ? 'danger' : 'brand'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[tone]}`}>{STATUS_LABEL[status] || status}</span>
}

export function PaymentStatusBadge({ status }) {
  const tone = status === 'paid' ? 'ok' : 'warn'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[tone]}`}>{PAYMENT_STATUS_LABEL[status] || status}</span>
}
