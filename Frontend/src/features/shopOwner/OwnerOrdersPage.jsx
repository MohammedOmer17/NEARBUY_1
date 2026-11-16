import { useEffect, useRef, useState } from 'react'
import {
  Phone,
  CheckCircle2,
  Clock,
  MapPin,
  ShoppingBag,
  Store,
  ChevronRight,
  X,
  CreditCard,
  Banknote,
  AlertCircle,
  Bike,
} from 'lucide-react'
import { shopOwnerApi, mapsApi } from '../../services/api'
import { createSocket } from '../../services/socket'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import DeliveryMap from '../../components/shared/DeliveryMap'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { OrderStatusBadge } from '../../components/shared/StatusBadge'

export default function OwnerOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('new') // 'new' | 'preparing' | 'ready' | 'all'
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [orderRouteData, setOrderRouteData] = useState(null)
  const [captainLiveCoords, setCaptainLiveCoords] = useState(null)

  const selectedOrderIdRef = useRef(selectedOrder?._id)
  selectedOrderIdRef.current = selectedOrder?._id

  const loadOrders = async () => {
    try {
      setLoading(true)
      const payload = await shopOwnerApi.listOrders()
      setOrders(Array.isArray(payload) ? payload : [])
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load shop orders.')
    } finally {
      setLoading(false)
    }
  }

  // Load live delivery route whenever a delivery order modal is opened
  useEffect(() => {
    if (!selectedOrder?._id || selectedOrder.fulfillmentType !== 'delivery') {
      setOrderRouteData(null)
      setCaptainLiveCoords(null)
      return
    }

    mapsApi
      .deliveryRoute(selectedOrder._id)
      .then((res) => {
        const d = res?.data || res
        setOrderRouteData(d)
        if (d?.captain?.latitude && d?.captain?.longitude) {
          setCaptainLiveCoords({
            latitude: d.captain.latitude,
            longitude: d.captain.longitude,
          })
        }
      })
      .catch(() => setOrderRouteData(null))
  }, [selectedOrder?._id, selectedOrder?.orderStatus])

  useEffect(() => {
    loadOrders()

    const socket = createSocket('owner')
    socket.on('new_order', () => {
      loadOrders()
    })
    socket.on('order_status_updated', (payload) => {
      loadOrders()
      if (selectedOrderIdRef.current && String(selectedOrderIdRef.current) === String(payload?.orderId)) {
        mapsApi
          .deliveryRoute(payload.orderId)
          .then((res) => setOrderRouteData(res?.data || res))
          .catch(() => {})
      }
    })
    socket.on('captain_location_updated', (payload) => {
      if (payload?.captain) {
        setCaptainLiveCoords(payload.captain)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const handleAction = async (orderId, action, status) => {
    setActionLoading(true)
    try {
      if (action === 'accept') {
        await shopOwnerApi.acceptOrder(orderId)
      } else if (action === 'status') {
        await shopOwnerApi.updateOrderStatus(orderId, status)
      } else if (action === 'confirm-upi') {
        await shopOwnerApi.confirmPayment(orderId)
      } else if (action === 'confirm-cod') {
        await shopOwnerApi.confirmCodPayment(orderId)
      }
      await loadOrders()
      if (selectedOrder?._id === orderId) {
        const updated = await shopOwnerApi.getOrder(orderId)
        setSelectedOrder(updated)
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Unable to update order.')
    } finally {
      setActionLoading(false)
    }
  }

  // Filter orders by tab
  const newOrders = orders.filter((o) => o.orderStatus === 'placed')
  const preparingOrders = orders.filter((o) => ['accepted', 'preparing'].includes(o.orderStatus))
  const readyOrders = orders.filter((o) => o.orderStatus === 'ready')

  const visibleOrders = orders.filter((o) => {
    if (activeTab === 'new') return o.orderStatus === 'placed'
    if (activeTab === 'preparing') return ['accepted', 'preparing'].includes(o.orderStatus)
    if (activeTab === 'ready') return o.orderStatus === 'ready'
    return true
  })

  return (
    <div className="min-h-screen bg-[#100A14] text-white pb-16">
      <PageHeader title="Order Management" back={false} />

      <div className="px-4 pt-3 space-y-3">
        {error && (
          <p role="alert" className="rounded-2xl bg-danger/15 border border-danger/30 p-3 text-xs font-semibold text-danger">
            {error}
          </p>
        )}

        {/* Status Tabs matching Storyboard Screen 5 */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            ['new', `New (${newOrders.length})`],
            ['preparing', `Preparing (${preparingOrders.length})`],
            ['ready', `Ready (${readyOrders.length})`],
            ['all', 'All'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-150 whitespace-nowrap ${
                activeTab === key
                  ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white shadow-md shadow-pink-500/20'
                  : 'bg-[#211522] text-[#94849A] border border-[#593650] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Orders List matching Storyboard Screen 5 */}
        <div className="space-y-3 pt-1">
          {loading ? (
            <p className="text-center py-8 text-xs text-[#94849A] font-medium">Loading incoming orders...</p>
          ) : visibleOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#593650] bg-[#211522] p-8 text-center text-xs text-[#94849A]">
              No orders found in this section.
            </div>
          ) : (
            visibleOrders.map((o) => (
              <div
                key={o._id}
                className="rounded-2xl border border-[#593650] bg-[#211522] p-4 shadow-card space-y-3 text-white"
              >
                <div className="flex items-start justify-between gap-2 border-b border-[#593650] pb-2.5">
                  <div>
                    <span className="font-extrabold text-xs text-white">
                      #{o._id.slice(-8).toUpperCase()}
                    </span>
                    <p className="text-[11px] text-[#94849A] flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-[#EC55C8]" />
                      {o.deliveryAddress || 'Pickup from Shop'}
                    </p>
                  </div>
                  <div className="text-right">
                    <OrderStatusBadge status={o.orderStatus} />
                    <span className="text-[10px] text-[#94849A] block mt-1">
                      {formatDateTime(o.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="text-xs text-[#C4B4C9] space-y-1">
                  {(o.items || []).map((i, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="font-medium truncate">
                        {i.name} ({i.unit}) x {i.quantity}
                      </span>
                      <span className="font-bold text-white shrink-0 ml-2">
                        {formatCurrency(i.price * i.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-[#593650] pt-2 text-xs">
                  <div>
                    <span className="text-[#94849A] font-medium">Total Amount: </span>
                    <strong className="text-white font-black text-sm">{formatCurrency(o.totalAmount)}</strong>
                  </div>
                  <span className="text-[11px] font-bold text-[#F58AD8] bg-[#EC55C8]/15 border border-[#EC55C8]/30 px-2 py-0.5 rounded-full">
                    {o.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {o.orderStatus === 'placed' && (
                    <>
                      <button
                        type="button"
                        onClick={() => alert('Order rejection is not supported by the backend model. Orders remain active for fulfillment or customer cancellation.')}
                        className="flex-1 py-2 rounded-xl border border-[#593650] bg-[#170F1B] text-xs font-bold text-[#94849A] hover:text-danger hover:border-danger/30 transition"
                      >
                        Reject
                      </button>
                      <Button
                        loading={actionLoading}
                        onClick={() => handleAction(o._id, 'accept')}
                        className="flex-1 text-xs py-2 shadow-md shadow-pink-500/20"
                      >
                        Accept Order
                      </Button>
                    </>
                  )}

                  {o.orderStatus === 'accepted' && (
                    <Button
                      full
                      loading={actionLoading}
                      onClick={() => handleAction(o._id, 'status', 'preparing')}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs py-2"
                    >
                      Mark as Preparing
                    </Button>
                  )}

                  {o.orderStatus === 'preparing' && (
                    <Button
                      full
                      loading={actionLoading}
                      onClick={() => handleAction(o._id, 'status', 'ready')}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs py-2"
                    >
                      Mark as Ready for Pickup
                    </Button>
                  )}

                  {o.orderStatus === 'ready' && o.fulfillmentType === 'pickup' && (
                    <Button
                      full
                      loading={actionLoading}
                      onClick={() => handleAction(o._id, 'status', 'picked_up')}
                      className="text-xs py-2"
                    >
                      Confirm Customer Handover
                    </Button>
                  )}

                  {o.orderStatus === 'ready' && o.fulfillmentType === 'delivery' && (
                    <div className="flex-1 text-center py-2 text-xs font-semibold text-[#F58AD8] bg-[#2B1B2D] rounded-xl border border-[#593650]">
                      Waiting for captain pickup
                    </div>
                  )}

                  {o.orderStatus === 'picked_up' && o.fulfillmentType === 'pickup' && (
                    <Button
                      full
                      loading={actionLoading}
                      onClick={() => handleAction(o._id, 'status', 'completed')}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs py-2"
                    >
                      Mark Order Completed
                    </Button>
                  )}

                  {o.orderStatus === 'out_for_delivery' && (
                    <div className="flex-1 text-center py-2 text-xs font-semibold text-[#EC55C8] bg-[#EC55C8]/10 rounded-xl border border-[#EC55C8]/30">
                      Captain out for delivery
                    </div>
                  )}

                  {o.orderStatus === 'completed' && (
                    <div className="flex-1 text-center py-2 text-xs font-bold text-[#20C878] bg-[#20C878]/15 border border-[#20C878]/30 rounded-xl flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Order Completed
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedOrder(o)}
                    className="p-2 rounded-xl bg-[#170F1B] border border-[#593650] text-[#94849A] hover:text-white transition"
                    aria-label="View Order Details"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Order Status Update Modal matching Storyboard Screen 6 */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#211522] border border-[#593650] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] text-white">
            <div className="flex items-center justify-between border-b border-[#593650] px-5 py-4">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Order #{selectedOrder._id.slice(-8).toUpperCase()}
                </h3>
                <p className="text-[10px] text-[#94849A]">{formatDateTime(selectedOrder.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#170F1B] text-[#94849A] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Customer Info Card */}
              <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-[#94849A]">Customer</p>
                  <p className="text-sm font-black text-white">
                    {selectedOrder.customer?.name || 'Customer'}
                  </p>
                  <p className="text-xs text-[#94849A] mt-0.5">
                    {selectedOrder.deliveryAddress || 'Self Pickup from Store'}
                  </p>
                </div>
                {selectedOrder.customer?.phone && (
                  <a
                    href={`tel:${selectedOrder.customer.phone}`}
                    className="grid h-10 w-10 place-items-center rounded-full bg-[#20C878]/15 text-[#20C878] border border-[#20C878]/30 active:scale-95 transition"
                    aria-label="Call customer"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* Delivery Captain Assignment Card */}
              {selectedOrder.fulfillmentType === 'delivery' && (
                <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-3.5">
                  {selectedOrder.captain ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#2B1B2D] border border-[#593650] grid place-items-center text-[#EC55C8] font-bold shrink-0">
                          <Bike className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-[#94849A]">Assigned Delivery Captain</p>
                          <p className="text-sm font-black text-white">{selectedOrder.captain.name || 'NearBuy Partner'}</p>
                          <p className="text-xs text-[#94849A] mt-0.5">
                            {selectedOrder.captain.vehicle?.model || 'Delivery Bike'}{' '}
                            {selectedOrder.captain.vehicle?.number ? `• ${selectedOrder.captain.vehicle.number}` : ''}
                          </p>
                        </div>
                      </div>
                      {selectedOrder.captain.phone && (
                        <a
                          href={`tel:${selectedOrder.captain.phone}`}
                          className="grid h-10 w-10 place-items-center rounded-full bg-[#20C878]/15 text-[#20C878] border border-[#20C878]/30 active:scale-95 transition shrink-0 ml-2"
                          aria-label="Call captain"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-1">
                      <p className="text-xs font-semibold text-white">Awaiting Delivery Captain</p>
                      <p className="text-[11px] text-[#94849A] mt-0.5">
                        Eligible captains in your locality have been dispatched.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Real Interactive Delivery Map for Shop Owner */}
              {selectedOrder.fulfillmentType === 'delivery' && (selectedOrder.captain || orderRouteData) && (
                <div className="overflow-hidden rounded-2xl border border-[#593650]">
                  <DeliveryMap
                    captain={
                      captainLiveCoords ||
                      orderRouteData?.captain?.location ||
                      (orderRouteData?.captain?.latitude
                        ? { latitude: orderRouteData.captain.latitude, longitude: orderRouteData.captain.longitude }
                        : null)
                    }
                    shop={
                      orderRouteData?.shop?.location
                        ? { ...orderRouteData.shop.location, name: orderRouteData.shop.name, address: orderRouteData.shop.address }
                        : null
                    }
                    customer={
                      orderRouteData?.deliveryLocation
                        ? { ...orderRouteData.deliveryLocation, name: selectedOrder.customer?.name, address: selectedOrder.deliveryAddress }
                        : { name: selectedOrder.customer?.name, address: selectedOrder.deliveryAddress }
                    }
                    route={orderRouteData?.route}
                    activeLeg={
                      orderRouteData?.activeLeg ||
                      (['picked_up', 'out_for_delivery', 'completed'].includes(selectedOrder.orderStatus)
                        ? 'shop_to_customer'
                        : 'captain_to_shop')
                    }
                    orderStatus={selectedOrder.orderStatus}
                    distance={orderRouteData?.distance}
                    duration={orderRouteData?.duration}
                    isOutOfRange={orderRouteData?.isOutOfRange}
                    googleMapsUrl={orderRouteData?.googleMapsUrl}
                    gpsActive={!!captainLiveCoords}
                    height="h-56"
                    title={
                      selectedOrder.orderStatus === 'out_for_delivery'
                        ? 'Captain Out for Delivery to Customer'
                        : selectedOrder.orderStatus === 'picked_up'
                        ? 'Package Picked Up from Store'
                        : selectedOrder.captain
                        ? 'Captain En Route to Your Store'
                        : 'Live Delivery Map'
                    }
                  />
                </div>
              )}

              {/* Items Breakdown */}
              <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-4 shadow-xs space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#94849A] border-b border-[#593650] pb-2">
                  Order Items
                </h4>
                <ul className="space-y-2 text-xs">
                  {(selectedOrder.items || []).map((i, idx) => (
                    <li key={idx} className="flex justify-between items-center text-white">
                      <span className="font-semibold text-white">
                        {i.name} ({i.unit}) x {i.quantity}
                      </span>
                      <span className="font-bold text-white">{formatCurrency(i.price * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-[#593650] pt-2.5 flex justify-between font-black text-sm text-white">
                  <span>Total Amount</span>
                  <span className="text-[#EC55C8] text-base">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Payment Status & Confirm Actions */}
              <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-4 shadow-xs space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#94849A] border-b border-[#593650] pb-2">
                  Payment Status
                </h4>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94849A] font-medium">Method</span>
                  <span className="font-bold text-white uppercase">{selectedOrder.payment?.method || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94849A] font-medium">Payment State</span>
                  <span className="font-bold text-[#EC55C8] capitalize">
                    {selectedOrder.payment?.status?.replace(/_/g, ' ') || 'Pending'}
                  </span>
                </div>

                {selectedOrder.payment?.status !== 'paid' && (
                  <div className="pt-2">
                    {selectedOrder.payment?.method === 'shop_upi' ? (
                      <Button
                        full
                        loading={actionLoading}
                        onClick={() => handleAction(selectedOrder._id, 'confirm-upi')}
                        className="bg-emerald-600 font-bold text-xs py-2 text-white"
                      >
                        Confirm UPI Payment Received
                      </Button>
                    ) : (
                      <Button
                        full
                        loading={actionLoading}
                        onClick={() => handleAction(selectedOrder._id, 'confirm-cod')}
                        className="bg-emerald-600 font-bold text-xs py-2 text-white"
                      >
                        Confirm COD Payment Received
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Status Update Actions */}
              <div className="space-y-2">
                {selectedOrder.orderStatus === 'placed' && (
                  <Button
                    full
                    loading={actionLoading}
                    onClick={() => handleAction(selectedOrder._id, 'accept')}
                    className="text-xs py-3"
                  >
                    Accept Order
                  </Button>
                )}

                {selectedOrder.orderStatus === 'accepted' && (
                  <Button
                    full
                    loading={actionLoading}
                    onClick={() => handleAction(selectedOrder._id, 'status', 'preparing')}
                    className="bg-purple-700 font-bold text-xs py-3 text-white"
                  >
                    Mark as Preparing
                  </Button>
                )}

                {selectedOrder.orderStatus === 'preparing' && (
                  <Button
                    full
                    loading={actionLoading}
                    onClick={() => handleAction(selectedOrder._id, 'status', 'ready')}
                    className="bg-emerald-600 font-bold text-xs py-3 text-white"
                  >
                    Mark as Ready for Pickup
                  </Button>
                )}

                {selectedOrder.orderStatus === 'ready' && selectedOrder.fulfillmentType === 'pickup' && (
                  <Button
                    full
                    loading={actionLoading}
                    onClick={() => handleAction(selectedOrder._id, 'status', 'picked_up')}
                    className="text-xs py-3"
                  >
                    Confirm Customer Handover
                  </Button>
                )}

                {selectedOrder.orderStatus === 'picked_up' && selectedOrder.fulfillmentType === 'pickup' && (
                  <Button
                    full
                    loading={actionLoading}
                    onClick={() => handleAction(selectedOrder._id, 'status', 'completed')}
                    className="bg-emerald-600 font-bold text-xs py-3 text-white"
                  >
                    Mark Order Completed
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
