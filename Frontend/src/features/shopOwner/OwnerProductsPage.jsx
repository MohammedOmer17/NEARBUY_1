import { useEffect, useRef, useState } from 'react'
import {
  Plus,
  Trash2,
  Edit2,
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
import ProductImage from '../../components/shared/ProductImage'

const CATEGORIES = [
  'Rice, Grains & Cereals',
  'Atta, Flours & Staples',
  'Dals & Pulses',
  'Edible Oils & Ghee',
  'Spices & Masalas',
  'Dairy & Eggs',
  'Sugar, Salt & Sweeteners',
  'Snacks & Biscuits',
  'Beverages & Tea/Coffee',
  'Breakfast & Packaged Food',
  'Personal Care',
  'Household & Cleaning',
  'Grocery & Kirana',
  'Snacks & Munchies',
  'Beverages',
  'Staples & Grains',
  'Household Essentials',
]

const UNITS = ['kg', 'g', 'ltr', 'ml', 'packet', 'piece']

const DEFAULT_FORM = {
  name: '',
  category: 'Grocery & Kirana',
  price: '',
  unit: 'packet',
  packSize: '',
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
  const [isTypingName, setIsTypingName] = useState(false)
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
    if (editingProduct || !modalOpen || !isTypingName) {
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
    setSuggestions([])
    let active = true

    const timer = setTimeout(async () => {
      try {
        const results = await shopOwnerApi.suggestions(trimmedName)
        if (active) {
          setSuggestions(Array.isArray(results) ? results : [])
          setActiveSuggestionIndex(-1)
        }
      } catch (err) {
        if (active) {
          setSuggestionsError(true)
          setSuggestions([])
        }
      } finally {
        if (active) setSuggestionsLoading(false)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [form.name, modalOpen, editingProduct, isTypingName])

  // Dismiss dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target)
      ) {
        setShowSuggestions(false)
        setIsTypingName(false)
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
    setIsTypingName(false)
    setModalError('')
    setModalOpen(true)
  }

  const handleOpenEdit = (p) => {
    setEditingProduct(p)
    setModalError('')
    setSuggestions([])
    setShowSuggestions(false)
    setForm({
      name: p.canonicalProduct?.name || p.name || '',
      category: p.canonicalProduct?.category || p.category || 'Grocery & Kirana',
      price: String(p.price || ''),
      unit: p.canonicalProduct?.unit || p.unit || 'packet',
      packSize: p.canonicalProduct?.packSize || p.packSize || '',
      quantity: String(p.quantity ?? ''),
      description: p.description || '',
      brand: p.canonicalProduct?.brand || p.brand || '',
      image: p.canonicalProduct?.image || p.image || '',
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
      packSize: item.packSize || '',
      description: item.description || prev.description,
      canonicalProductId: item.canonicalProductId || item._id || item.id,
    }))
    setShowSuggestions(false)
    setIsTypingName(false)
    setActiveSuggestionIndex(-1)
    setModalError('')
  }

  const handleSelectCreateNew = () => {
    setForm((prev) => ({
      ...prev,
      canonicalProductId: null,
    }))
    setShowSuggestions(false)
    setIsTypingName(false)
    setActiveSuggestionIndex(-1)
  }

  const handleNameKeyDown = (e) => {
    if (!showSuggestions || editingProduct) return

    const showCreateOption = !suggestionsLoading && suggestions.length === 0
    const totalOptions = suggestions.length + (showCreateOption ? 1 : 0)

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
      } else if (showCreateOption && activeSuggestionIndex === suggestions.length) {
        e.preventDefault()
        handleSelectCreateNew()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowSuggestions(false)
      setActiveSuggestionIndex(-1)
    }
  }

  const updateField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setForm((f) => ({ ...f, image: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setModalError('')

    if (!form.name.trim()) {
      setModalError('Product name is required.')
      return
    }
    const numPrice = Number(form.price)
    if (isNaN(numPrice) || numPrice < 0) {
      setModalError('Enter a valid price.')
      return
    }
    const numQty = Number(form.quantity)
    if (isNaN(numQty) || numQty < 0) {
      setModalError('Enter a valid stock quantity.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        price: numPrice,
        unit: form.unit,
        quantity: numQty,
        description: form.description.trim(),
        brand: form.brand.trim(),
        image: form.image.trim(),
        packSize: form.packSize.trim(),
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

  // Filter calculations
  const inStockCount = products.filter((p) => p.isAvailable && p.quantity > 0).length
  const outOfStockCount = products.filter((p) => !p.isAvailable || p.quantity <= 0).length

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !query ||
      (p.canonicalProduct?.name || p.name)?.toLowerCase().includes(query.toLowerCase()) ||
      (p.canonicalProduct?.category || p.category)?.toLowerCase().includes(query.toLowerCase())

    if (!matchesSearch) return false
    if (filter === 'in_stock') return p.isAvailable && p.quantity > 0
    if (filter === 'out_of_stock') return !p.isAvailable || p.quantity <= 0
    return true
  })

  return (
    <div className="min-h-screen bg-[#100A14] text-white pb-28">
      <PageHeader title="Product Management" back={false} />

      <div className="px-4 pt-3 space-y-3">
        {error && (
          <p role="alert" className="rounded-2xl bg-danger/15 border border-danger/30 p-3 text-xs font-semibold text-danger">
            {error}
          </p>
        )}

        {/* Search input matching Storyboard Screen 7 */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94849A]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products in inventory..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#170F1B] border border-[#593650] text-xs font-medium text-white outline-none focus:border-[#EC55C8] shadow-xs"
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
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-150 whitespace-nowrap ${
                filter === key
                  ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white shadow-md shadow-pink-500/20'
                  : 'bg-[#211522] text-[#94849A] border border-[#593650] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Products List matching Storyboard Screen 7 */}
        <div className="space-y-2.5 pt-1">
          {loading ? (
            <p className="text-center py-8 text-xs text-[#94849A] font-medium">Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#593650] bg-[#211522] p-8 text-center text-xs text-[#94849A]">
              <PackageSearch className="mx-auto h-8 w-8 text-[#94849A] mb-2" />
              No products found matching your filter.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const inStock = p.isAvailable && p.quantity > 0
              return (
                <div
                  key={p._id}
                  className="rounded-2xl border border-[#593650] bg-[#211522] p-3.5 shadow-card flex items-center justify-between gap-3 text-white"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-[#170F1B] border border-[#593650] overflow-hidden grid place-items-center text-[#EC55C8]">
                      <ProductImage src={p.canonicalProduct?.image || p.image} alt={p.name}
                        category={p.canonicalProduct?.category || p.category} className="h-full w-full object-contain p-1" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-xs text-white">{p.canonicalProduct?.name || p.name}</h3>
                      <p className="text-[11px] text-[#94849A]">
                        {p.canonicalProduct?.unit || p.unit || 'Standard'} · {p.canonicalProduct?.category || p.category}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-black text-xs text-white">{formatCurrency(p.price)}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inStock
                              ? 'bg-[#20C878]/15 text-[#20C878] border border-[#20C878]/30'
                              : 'bg-[#F05A79]/15 text-[#F05A79] border border-[#F05A79]/30'
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
                      className="grid h-8 w-8 place-items-center rounded-lg bg-[#170F1B] text-[#94849A] hover:text-[#EC55C8] transition active:scale-95"
                      aria-label="Edit product"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(p._id)}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-[#170F1B] text-[#94849A] hover:text-danger transition active:scale-95"
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
      <div className="fixed inset-x-0 bottom-16 z-30 mx-auto w-full max-w-md lg:max-w-xl px-4">
        <Button
          full
          onClick={handleOpenAdd}
          className="text-xs py-3 shadow-lg shadow-pink-500/30 flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add New Product
        </Button>
      </div>

      {/* Add / Edit Product Modal matching Storyboard Screen 8 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#211522] border border-[#593650] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] text-white">
            <div className="flex items-center justify-between border-b border-[#593650] px-5 py-4">
              <h3 className="text-base font-extrabold text-white">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#170F1B] text-[#94849A] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {modalError && (
                <div
                  role="alert"
                  className="rounded-2xl bg-danger/15 border border-danger/30 p-3 text-xs font-semibold text-danger flex items-center gap-2"
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
                <label className="block text-xs font-semibold text-[#C4B4C9] mb-1">Product Photo</label>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => !form.canonicalProductId && fileInputRef.current?.click()}
                    className="relative h-16 w-16 shrink-0 rounded-2xl bg-[#170F1B] border border-[#593650] grid place-items-center overflow-hidden cursor-pointer hover:border-[#EC55C8] transition group"
                    title="Click to upload image file"
                  >
                    {form.image ? (
                      <ProductImage src={form.image} alt="Preview" category={form.category}
                        className="h-full w-full object-contain p-1" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Camera className="h-5 w-5 text-[#94849A] group-hover:text-[#EC55C8] transition" />
                        <span className="text-[9px] text-[#94849A] font-medium mt-0.5">Upload</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    disabled={Boolean(form.canonicalProductId)}
                    className="hidden"
                  />
                  <div className="flex-1 space-y-1">
                    <input
                      type="url"
                      value={form.image.startsWith('data:') ? '' : form.image}
                      onChange={updateField('image')}
                      placeholder={form.image.startsWith('data:') ? 'Image uploaded from device' : 'Paste image URL (optional)'}
                      disabled={Boolean(form.canonicalProductId)}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#593650] bg-[#170F1B] text-white outline-none focus:border-[#EC55C8]"
                    />
                    {form.image && (
                      <button
                        type="button"
                        disabled={Boolean(form.canonicalProductId)}
                        onClick={() => setForm((c) => ({ ...c, image: '' }))}
                        className="text-[10px] text-danger hover:underline font-semibold block"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Product Name Input with Live Autocomplete Suggestions */}
              <div className="relative" ref={dropdownContainerRef}>
                <label className="block text-xs font-semibold text-[#C4B4C9] mb-1">
                  Product Name
                  {form.canonicalProductId && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#F58AD8] bg-[#EC55C8]/15 px-2 py-0.5 rounded-full border border-[#EC55C8]/30">
                      <CheckCircle2 className="h-3 w-3 text-[#EC55C8]" />
                      Catalogue Linked
                    </span>
                  )}
                </label>

                <div className="relative">
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="e.g. Maggi, Tata Salt, Eggs"
                    value={form.name}
                    disabled={Boolean(editingProduct && form.canonicalProductId)}
                    onChange={(e) => {
                      updateField('name')(e)
                      if (form.canonicalProductId) {
                        setForm((prev) => ({ ...prev, canonicalProductId: null }))
                      }
                      setShowSuggestions(true)
                      setIsTypingName(true)
                    }}
                    onKeyDown={handleNameKeyDown}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#593650] bg-[#170F1B] outline-none focus:border-[#EC55C8] font-medium text-white pr-8"
                  />
                  {suggestionsLoading && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#EC55C8] border-t-transparent" />
                    </div>
                  )}
                </div>
                {editingProduct && form.canonicalProductId && (
                  <p className="mt-1 text-[10px] text-[#94849A]">
                    This name is standardized by the shared catalogue. To list a different product, add it as a new item.
                  </p>
                )}

                {/* Suggestions Dropdown */}
                {showSuggestions && isTypingName && !editingProduct && form.name.trim().length >= 2 && (
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-2xl border border-[#593650] bg-[#211522] shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150 text-white"
                  >
                    {suggestionsLoading && suggestions.length === 0 && (
                      <div className="p-3 text-center text-xs text-[#94849A] flex items-center justify-center gap-2">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#EC55C8] border-t-transparent" />
                        Searching shared catalogue...
                      </div>
                    )}

                    {suggestionsError && (
                      <div className="p-2.5 text-[11px] text-[#F5A623] bg-[#F5A623]/15 rounded-xl border border-[#F5A623]/30">
                        Unable to load suggestions. You can still save this as a new product.
                      </div>
                    )}

                    {!suggestionsLoading && suggestions.length === 0 && !suggestionsError && (
                      <div className="p-2.5 text-center text-xs text-[#94849A]">
                        No matching items in shared catalogue.
                      </div>
                    )}

                    {suggestions.map((item, idx) => {
                      const isActive = activeSuggestionIndex === idx
                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          key={item.id || item._id}
                          onClick={() => handleSelectSuggestion(item)}
                          onMouseEnter={() => setActiveSuggestionIndex(idx)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition w-full text-left ${
                            isActive
                              ? 'bg-[#2B1B2D] border border-[#EC55C8]'
                              : 'hover:bg-[#170F1B] border border-transparent'
                          }`}
                        >
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-[#170F1B] border border-[#593650] overflow-hidden p-0.5 flex items-center justify-center">
                            <ProductImage src={item.image} alt={item.name} category={item.category}
                              className="h-full w-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-white truncate">{item.name}</p>
                              {item.brand && (
                                <span className="text-[10px] font-semibold text-[#F58AD8] bg-[#EC55C8]/15 px-1.5 py-0.2 rounded border border-[#EC55C8]/30">
                                  {item.brand}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#94849A] mt-0.5">
                              <span>{item.category}</span>
                              {item.unit && <span>• {item.unit}</span>}
                              {item.packSize && <span>({item.packSize})</span>}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-[#EC55C8] bg-[#2B1B2D] px-2 py-0.5 rounded-full border border-[#593650] shrink-0">
                            Select
                          </span>
                        </button>
                      )
                    })}

                    {/* Create New Product Option */}
                    {!suggestionsLoading && suggestions.length === 0 && (
                      <button
                        type="button"
                        role="option"
                        aria-selected={activeSuggestionIndex === suggestions.length}
                        onClick={handleSelectCreateNew}
                        onMouseEnter={() => setActiveSuggestionIndex(suggestions.length)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition border border-dashed w-full text-left ${
                          activeSuggestionIndex === suggestions.length
                            ? 'bg-[#20C878]/20 border-[#20C878] text-white'
                            : 'bg-[#20C878]/10 border-[#20C878]/40 text-[#20C878] hover:bg-[#20C878]/20'
                        }`}
                      >
                        <Plus className="h-4 w-4 text-[#20C878] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate text-white">Create New Product</p>
                          <p className="text-[10px] text-[#20C878]">
                            Add &quot;{form.name.trim()}&quot; to the shared catalogue
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <Input
                label="Brand (Optional)"
                placeholder="e.g. Maggi, Nestle, Tata"
                value={form.brand}
                onChange={updateField('brand')}
                disabled={Boolean(form.canonicalProductId)}
              />

              <div>
                <label className="block text-xs font-semibold text-[#C4B4C9] mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={updateField('category')}
                  disabled={Boolean(form.canonicalProductId)}
                  className="w-full text-xs font-semibold text-white bg-[#170F1B] border border-[#593650] p-3 rounded-xl outline-none focus:border-[#EC55C8]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#170F1B] text-white">
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
                  <label className="block text-xs font-semibold text-[#C4B4C9] mb-1">Measurement Unit</label>
                  <select
                    value={form.unit}
                    onChange={updateField('unit')}
                    disabled={Boolean(form.canonicalProductId)}
                    className="w-full text-xs font-semibold text-white bg-[#170F1B] border border-[#593650] p-3 rounded-xl outline-none focus:border-[#EC55C8]"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u} className="bg-[#170F1B] text-white">
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Package Size (Optional)"
                placeholder="e.g. 1 kg, 500 ml, 6 pieces"
                value={form.packSize}
                onChange={updateField('packSize')}
                disabled={Boolean(form.canonicalProductId)}
              />

              <Input
                label="Stock Quantity"
                type="number"
                min="0"
                placeholder="50"
                value={form.quantity}
                onChange={updateField('quantity')}
              />

              <div>
                <label className="block text-xs font-semibold text-[#C4B4C9] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={updateField('description')}
                  placeholder="Iodized salt for daily cooking."
                  className="w-full text-xs p-2.5 rounded-xl border border-[#593650] bg-[#170F1B] text-white outline-none focus:border-[#EC55C8]"
                />
              </div>

              <Button
                type="submit"
                full
                loading={saving}
                className="mt-3 text-xs py-3 shadow-md shadow-pink-500/25"
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
        <p className="text-xs text-[#94849A] py-1">
          Are you sure you want to remove this product from your shop inventory?
        </p>
      </Modal>
    </div>
  )
}
