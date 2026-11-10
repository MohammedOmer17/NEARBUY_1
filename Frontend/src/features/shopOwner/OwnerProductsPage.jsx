import { useEffect, useRef, useState } from 'react'
import {
  Plus,
  Trash2,
  Edit2,
  Package2,
  Search,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  PackageSearch,
  Upload,
} from 'lucide-react'
import { shopOwnerApi } from '../../services/api'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { formatCurrency } from '../../utils/format'

const CATEGORIES = [
  'Grocery & Kirana',
  'Dairy & Eggs',
  'Snacks & Munchies',
  'Beverages',
  'Staples & Grains',
  'Spices & Masalas',
  'Personal Care',
  'Household Essentials',
]

const UNITS = ['1 packet', '1 pc', '1 box', '1 kg', '500 g', '250 g', '100 g', '1 l', '500 ml']

const DEFAULT_FORM = {
  name: '',
  category: 'Grocery & Kirana',
  price: '',
  unit: '1 packet',
  quantity: '20',
  description: '',
  brand: '',
  image: '',
  canonicalProductId: null,
}

export default function OwnerProductsPage() {
  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'in_stock' | 'out_of_stock'
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [error, setError] = useState('')
  const [modalError, setModalError] = useState('')

  // Live Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const dropdownContainerRef = useRef(null)
  const nameInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const profile = await shopOwnerApi.me()
      const nextShop = profile?.shop ?? null
      setShop(nextShop)
      if (nextShop?._id) {
        const nextProducts = await shopOwnerApi.listProducts(nextShop._id)
        setProducts(Array.isArray(nextProducts) ? nextProducts : [])
      }
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Debounced search for live autocomplete product suggestions
  useEffect(() => {
    if (editingProduct || !modalOpen) {
      setSuggestions([])
      setShowSuggestions(false)
      setSuggestionsLoading(false)
      return
    }

    const trimmedName = form.name.trim()
    if (trimmedName.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setSuggestionsLoading(false)
      setSuggestionsError(false)
      return
    }

    setSuggestionsLoading(true)
    setSuggestionsError(false)

    const timer = setTimeout(async () => {
      try {
        const results = await shopOwnerApi.suggestions(trimmedName, form.category)
        setSuggestions(Array.isArray(results) ? results : [])
        setShowSuggestions(true)
        setActiveSuggestionIndex(-1)
      } catch (err) {
        setSuggestionsError(true)
        setSuggestions([])
      } finally {
        setSuggestionsLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [form.name, form.category, modalOpen, editingProduct])

  // Dismiss dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpenAdd = () => {
    setEditingProduct(null)
    setForm(DEFAULT_FORM)
    setSuggestions([])
    setShowSuggestions(false)
    setActiveSuggestionIndex(-1)
    setModalError('')
    setModalOpen(true)
  }

  const handleOpenEdit = (p) => {
    setEditingProduct(p)
    setModalError('')
    setSuggestions([])
    setShowSuggestions(false)
    setForm({
      name: p.name || '',
      category: p.category || 'Grocery & Kirana',
      price: String(p.price || ''),
      unit: p.unit || '1 packet',
      quantity: String(p.quantity ?? ''),
      description: p.description || '',
      brand: p.brand || '',
      image: p.image || '',
      canonicalProductId: p.canonicalProductId || p.canonicalProduct?._id || p.canonicalProduct || null,
    })
    setModalOpen(true)
  }

  const handleSelectSuggestion = (item) => {
    setForm((prev) => ({
      ...prev,
      name: item.name,
      category: item.category || prev.category,
      brand: item.brand || prev.brand,
      unit: item.unit || prev.unit,
      image: item.image || prev.image,
      description: item.description || prev.description,
      canonicalProductId: item.canonicalProductId || item._id || item.id,
    }))
    setShowSuggestions(false)
    setActiveSuggestionIndex(-1)
    setModalError('')
  }

  const handleSelectCreateNew = () => {
    setForm((prev) => ({
      ...prev,
      canonicalProductId: null,
    }))
    setShowSuggestions(false)
    setActiveSuggestionIndex(-1)
  }

  const handleNameKeyDown = (e) => {
    if (!showSuggestions || editingProduct) return

    const totalOptions = suggestions.length + 1 // +1 for "Create new product" option

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestionIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : totalOptions - 1))
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        e.preventDefault()
        handleSelectSuggestion(suggestions[activeSuggestionIndex])
      } else if (activeSuggestionIndex === suggestions.length) {
        e.preventDefault()
        handleSelectCreateNew()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowSuggestions(false)
      setActiveSuggestionIndex(-1)
    }
  }

  const updateField = (key) => (event) => {
    setModalError('')
    setForm((current) => ({ ...current, [key]: event.target.value }))
  }

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setModalError('Please choose a valid image file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm((current) => ({ ...current, image: String(reader.result) }))
      setModalError('')
    }
    reader.onerror = () => {
      setModalError('Failed to read the selected image file.')
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setModalError('')

    if (!form.name.trim()) {
      setModalError('Please enter product name.')
      return
    }
    if (form.price === '' || Number(form.price) < 0 || !Number.isFinite(Number(form.price))) {
      setModalError('Please enter a valid non-negative price.')
      return
    }
    if (!form.unit.trim()) {
      setModalError('Please select a unit.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        unit: form.unit.trim(),
        quantity: Math.max(0, Number(form.quantity || 0)),
        description: form.description.trim(),
        brand: form.brand.trim(),
        image: form.image.trim(),
        canonicalProductId: form.canonicalProductId || undefined,
      }

      if (editingProduct) {
        await shopOwnerApi.updateProduct(editingProduct._id || editingProduct.id, payload)
      } else {
        await shopOwnerApi.createProduct(payload)
      }

      setModalOpen(false)
      setEditingProduct(null)
      setModalError('')
      await loadData()
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Unable to save product.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (productId) => {
    try {
      await shopOwnerApi.deleteProduct(productId)
      setDeleteConfirmId(null)
      await loadData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to delete product.')
    }
  }

  const handleStockQuickUpdate = async (productId, nextQty) => {
    try {
      await shopOwnerApi.updateStock(productId, Math.max(0, nextQty))
      setProducts((prods) =>
        prods.map((p) =>
          p._id === productId ? { ...p, quantity: nextQty, isAvailable: nextQty > 0 } : p,
        ),
      )
    } catch (err) {
      setError('Unable to update stock quantity.')
    }
  }

  // Filter calculations
  const inStockCount = products.filter((p) => p.isAvailable && p.quantity > 0).length
  const outOfStockCount = products.filter((p) => !p.isAvailable || p.quantity <= 0).length

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !query ||
      p.name?.toLowerCase().includes(query.toLowerCase()) ||
      p.category?.toLowerCase().includes(query.toLowerCase())

    if (!matchesSearch) return false
    if (filter === 'in_stock') return p.isAvailable && p.quantity > 0
    if (filter === 'out_of_stock') return !p.isAvailable || p.quantity <= 0
    return true
  })

  return (
    <div className="pb-28">
      <PageHeader title="Product Management" back={false} />

      <div className="px-4 pt-3 space-y-3">
        {error && (
          <p role="alert" className="rounded-2xl bg-danger-50 p-3 text-xs font-semibold text-danger">
            {error}
          </p>
        )}

        {/* Search input matching Storyboard Screen 7 */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products in inventory..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-line text-xs font-medium text-ink outline-none focus:border-accent-500 shadow-xs"
          />
        </div>

        {/* Filter Chips matching Storyboard Screen 7 */}
        <div className="flex gap-2">
          {[
            ['all', `All (${products.length})`],
            ['in_stock', `In Stock (${inStockCount})`],
            ['out_of_stock', `Out of Stock (${outOfStockCount})`],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                filter === key
                  ? 'bg-accent-500 text-white shadow-xs'
                  : 'bg-white text-mute border border-line hover:bg-canvas'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Products List matching Storyboard Screen 7 */}
        <div className="space-y-2.5 pt-1">
          {loading ? (
            <p className="text-center py-8 text-xs text-mute font-medium">Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-xs text-mute">
              <PackageSearch className="mx-auto h-8 w-8 text-mute/50 mb-2" />
              No products found matching your filter.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const inStock = p.isAvailable && p.quantity > 0
              return (
                <div
                  key={p._id}
                  className="rounded-2xl border border-line bg-white p-3.5 shadow-card flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-canvas border border-line overflow-hidden grid place-items-center text-purple-700">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-contain p-1" />
                      ) : (
                        <Package2 className="h-6 w-6 text-mute" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-xs text-ink">{p.name}</h3>
                      <p className="text-[11px] text-mute">{p.unit || 'Standard'} · {p.category}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-black text-xs text-ink">{formatCurrency(p.price)}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inStock
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {inStock ? `In Stock (${p.quantity})` : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(p)}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-canvas text-mute hover:text-accent-500 transition active:scale-95"
                      aria-label="Edit product"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(p._id)}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-canvas text-mute hover:text-danger transition active:scale-95"
                      aria-label="Delete product"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Floating Add Product Button matching Storyboard Screen 7 */}
      <div className="fixed inset-x-0 bottom-16 z-30 mx-auto w-full max-w-md px-4">
        <Button
          full
          onClick={handleOpenAdd}
          className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs py-3 shadow-lg shadow-pink-500/30 flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add New Product
        </Button>
      </div>

      {/* Add / Edit Product Modal matching Storyboard Screen 8 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-base font-extrabold text-ink">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-canvas text-mute hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {modalError && (
                <div
                  role="alert"
                  className="rounded-2xl bg-danger-50 border border-danger-200 p-3 text-xs font-semibold text-danger flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
                  <span className="flex-1">{modalError}</span>
                  <button
                    type="button"
                    onClick={() => setModalError('')}
                    className="text-danger hover:opacity-75"
                    aria-label="Dismiss error"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Product Photo preview / upload URL */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Product Photo</label>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative h-16 w-16 shrink-0 rounded-2xl bg-canvas border border-line grid place-items-center overflow-hidden cursor-pointer hover:border-accent-500 transition group"
                    title="Click to upload image file"
                  >
                    {form.image ? (
                      <img src={form.image} alt="Preview" className="h-full w-full object-contain p-1" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Camera className="h-5 w-5 text-mute group-hover:text-accent-500 transition" />
                        <span className="text-[9px] text-mute font-medium mt-0.5">Upload</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <div className="flex-1 space-y-1">
                    <input
                      type="url"
                      value={form.image.startsWith('data:') ? '' : form.image}
                      onChange={updateField('image')}
                      placeholder={form.image.startsWith('data:') ? 'Image uploaded from device' : 'Paste image URL (optional)'}
                      className="w-full text-xs p-2.5 rounded-xl border border-line bg-canvas outline-none focus:border-accent-500"
                    />
                    {form.image && (
                      <button
                        type="button"
                        onClick={() => setForm((c) => ({ ...c, image: '' }))}
                        className="text-[10px] text-rose-600 hover:underline font-semibold block"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Product Name Input with Live Autocomplete Suggestions */}
              <div className="relative" ref={dropdownContainerRef}>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Product Name
                  {form.canonicalProductId && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-accent-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                      <CheckCircle2 className="h-3 w-3 text-accent-500" />
                      Catalogue Linked
                    </span>
                  )}
                </label>

                <div className="relative">
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="e.g. Maggie, Tata Salt, Eggs"
                    value={form.name}
                    onChange={(e) => {
                      updateField('name')(e)
                      if (form.canonicalProductId) {
                        setForm((prev) => ({ ...prev, canonicalProductId: null }))
                      }
                      setShowSuggestions(true)
                    }}
                    onFocus={() => {
                      if (form.name.trim().length >= 2 && !editingProduct) {
                        setShowSuggestions(true)
                      }
                    }}
                    onKeyDown={handleNameKeyDown}
                    className="w-full text-xs p-2.5 rounded-xl border border-line bg-canvas outline-none focus:border-accent-500 font-medium text-ink pr-8"
                  />
                  {suggestionsLoading && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                    </div>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && !editingProduct && form.name.trim().length >= 2 && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-2xl border border-line bg-white shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    {suggestionsLoading && suggestions.length === 0 && (
                      <div className="p-3 text-center text-xs text-mute flex items-center justify-center gap-2">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                        Searching shared catalogue...
                      </div>
                    )}

                    {suggestionsError && (
                      <div className="p-2.5 text-[11px] text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                        Unable to load suggestions. You can still save this as a new product.
                      </div>
                    )}

                    {suggestions.map((item, idx) => {
                      const isActive = activeSuggestionIndex === idx
                      return (
                        <div
                          key={item.id || item._id}
                          onClick={() => handleSelectSuggestion(item)}
                          onMouseEnter={() => setActiveSuggestionIndex(idx)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition ${
                            isActive
                              ? 'bg-pink-50 border border-pink-200'
                              : 'hover:bg-canvas border border-transparent'
                          }`}
                        >
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-canvas border border-line overflow-hidden p-0.5 flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <Package2 className="h-4 w-4 text-mute" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-ink truncate">{item.name}</p>
                              {item.brand && (
                                <span className="text-[10px] font-semibold text-accent-600 bg-pink-100/60 px-1.5 py-0.2 rounded">
                                  {item.brand}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-mute mt-0.5">
                              <span>{item.category}</span>
                              {item.unit && <span>• {item.unit}</span>}
                              {item.packSize && <span>({item.packSize})</span>}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-accent-500 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200 shrink-0">
                            Select
                          </span>
                        </div>
                      )
                    })}

                    {!suggestionsLoading && suggestions.length === 0 && !suggestionsError && (
                      <div className="p-2.5 text-center text-xs text-mute">
                        No matching items in shared catalogue.
                      </div>
                    )}

                    {/* Create New Product Option */}
                    <div
                      onClick={handleSelectCreateNew}
                      onMouseEnter={() => setActiveSuggestionIndex(suggestions.length)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition border border-dashed ${
                        activeSuggestionIndex === suggestions.length
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                          : 'bg-emerald-50/50 border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      <Plus className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">
                          Create new product: &quot;{form.name.trim()}&quot;
                        </p>
                        <p className="text-[10px] text-emerald-700">
                          Adds new shared catalogue entry for all shops
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Brand (Optional)"
                placeholder="e.g. Maggi, Nestle, Tata"
                value={form.brand}
                onChange={updateField('brand')}
              />

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={updateField('category')}
                  className="w-full text-xs font-semibold text-ink bg-white border border-line p-3 rounded-xl outline-none focus:border-accent-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Price (₹)"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="24"
                  value={form.price}
                  onChange={updateField('price')}
                />

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Unit / Pack</label>
                  <select
                    value={form.unit}
                    onChange={updateField('unit')}
                    className="w-full text-xs font-semibold text-ink bg-white border border-line p-3 rounded-xl outline-none focus:border-accent-500"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Stock Quantity"
                type="number"
                min="0"
                placeholder="50"
                value={form.quantity}
                onChange={updateField('quantity')}
              />

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={updateField('description')}
                  placeholder="Iodized salt for daily cooking."
                  className="w-full text-xs p-2.5 rounded-xl border border-line bg-canvas outline-none focus:border-accent-500"
                />
              </div>

              <Button
                type="submit"
                full
                loading={saving}
                className="mt-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 text-xs shadow-md shadow-pink-500/25"
              >
                Save Product
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Product?"
        footer={
          <div className="space-y-2 w-full">
            <Button
              full
              variant="danger"
              onClick={() => handleDelete(deleteConfirmId)}
              className="text-xs font-bold"
            >
              Confirm Delete
            </Button>
            <Button full variant="ghost" onClick={() => setDeleteConfirmId(null)} className="text-xs">
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-xs text-mute py-1">
          Are you sure you want to remove this product from your shop inventory?
        </p>
      </Modal>
    </div>
  )
}
