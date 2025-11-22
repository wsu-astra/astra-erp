import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'
import { Plus, Trash2, ExternalLink, Package, Bell, AlertTriangle, CheckCircle, Minus, ShoppingBag, X, Star, MapPin, Clock } from 'lucide-react'
import { showToast } from '../components/Toast'
import { Modal, ConfirmDialog } from '../components/Modal'

export default function Inventory() {
  const [items, setItems] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [sendingAlert, setSendingAlert] = useState(false)
  const [generatingOrders, setGeneratingOrders] = useState(false)
  const [generatedOrders, setGeneratedOrders] = useState<any[]>([])
  const [showOrders, setShowOrders] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [showBulkAdjustModal, setShowBulkAdjustModal] = useState(false)
  const [bulkAdjustItem, setBulkAdjustItem] = useState<any>(null)
  const [bulkAdjustAmount, setBulkAdjustAmount] = useState('')
  const [dealsPanelOpen, setDealsPanelOpen] = useState(false)
  const [selectedDealItem, setSelectedDealItem] = useState<any>(null)
  const [deals, setDeals] = useState<any[]>([])
  const [dealsLoading, setDealsLoading] = useState(false)
  const [aiRecommendation, setAiRecommendation] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    current_quantity: 0,
    minimum_quantity: 0,
    unit: 'unit',
    instacart_search: ''
  })

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await api.get('/api/inventory/')
      console.log('Fetched items:', response.data)
      if (response.data.length > 0) {
        console.log('First item:', response.data[0])
        console.log('First item name:', response.data[0].name)
        console.log('First item instacart_search:', response.data[0].instacart_search)
      }
      setItems(response.data)
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/inventory/', formData)
      setShowForm(false)
      setFormData({ name: '', category: '', current_quantity: 0, minimum_quantity: 0, unit: 'unit', instacart_search: '' })
      fetchItems()
      showToast('Item added successfully!', 'success')
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to create item', 'error')
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmId) {
      try {
        await api.delete(`/api/inventory/${deleteConfirmId}`)
        fetchItems()
        showToast('Item deleted', 'success')
      } catch (error) {
        showToast('Failed to delete item', 'error')
      }
    }
    setDeleteConfirmId(null)
  }

  const handleUseItem = async (item: any) => {
    if (item.current_quantity <= 0) {
      showToast('Item is out of stock', 'error')
      return
    }
    try {
      const newQuantity = item.current_quantity - 1
      await api.put(`/api/inventory/${item.id}`, {
        ...item,
        current_quantity: newQuantity
      })
      showToast(`Used 1 ${item.unit} of ${item.name}`, 'success')
      fetchItems()
    } catch (error) {
      showToast('Failed to update inventory', 'error')
    }
  }

  const handleAddItem = async (item: any) => {
    try {
      const newQuantity = item.current_quantity + 1
      await api.put(`/api/inventory/${item.id}`, {
        ...item,
        current_quantity: newQuantity
      })
      showToast(`Added 1 ${item.unit} of ${item.name}`, 'success')
      fetchItems()
    } catch (error) {
      showToast('Failed to update inventory', 'error')
    }
  }

  const openBulkAdjustModal = (item: any) => {
    setBulkAdjustItem(item)
    setBulkAdjustAmount('')
    setShowBulkAdjustModal(true)
  }

  const handleBulkAdjust = async () => {
    if (!bulkAdjustItem || !bulkAdjustAmount) return
    
    const adjustment = parseInt(bulkAdjustAmount)
    if (isNaN(adjustment)) {
      showToast('Please enter a valid number', 'error')
      return
    }
    
    const newQuantity = bulkAdjustItem.current_quantity + adjustment
    if (newQuantity < 0) {
      showToast('Quantity cannot be negative', 'error')
      return
    }
    
    try {
      await api.put(`/api/inventory/${bulkAdjustItem.id}`, {
        ...bulkAdjustItem,
        current_quantity: newQuantity
      })
      const action = adjustment > 0 ? 'Added' : 'Removed'
      showToast(`${action} ${Math.abs(adjustment)} ${bulkAdjustItem.unit} of ${bulkAdjustItem.name}`, 'success')
      fetchItems()
      setShowBulkAdjustModal(false)
    } catch (error) {
      showToast('Failed to update inventory', 'error')
    }
  }

  const getUserLocation = (): Promise<{lat: number, lon: number} | null> => {
    return new Promise((resolve) => {
      console.log('📍 Checking geolocation API...')
      
      if (!navigator.geolocation) {
        console.error('❌ Geolocation API not supported by this browser')
        resolve(null)
        return
      }
      
      console.log('✅ Geolocation API available, requesting position...')
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('🎉 SUCCESS! Got position:', position)
          console.log('📍 Coordinates:', position.coords.latitude, position.coords.longitude)
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
        },
        (error) => {
          console.error('❌ Location Error:', error)
          console.error('Error code:', error.code)
          console.error('Error message:', error.message)
          console.error('PERMISSION_DENIED=1, POSITION_UNAVAILABLE=2, TIMEOUT=3')
          // Don't show error toast - we have fallback addresses
          resolve(null)
        },
        { timeout: 10000, enableHighAccuracy: false, maximumAge: 0 }
      )
    })
  }

  const handleFindDeals = async (item: any) => {
    setSelectedDealItem(item)
    setDealsPanelOpen(true)
    setDealsLoading(true)
    setDeals([])
    setAiRecommendation(null)
    
    try {
      // Try to get user location (optional - has fallback)
      showToast('Finding best deals...', 'info')
      console.log('🔍 STEP 1: Requesting location...')
      const userLocation = await getUserLocation()
      
      if (userLocation) {
        console.log('✅ STEP 2: GOT YOUR LOCATION!', userLocation)
        console.log('🌍 You are at:', userLocation.lat, userLocation.lon)
        console.log('📦 STEP 3: Sending this to backend...')
      } else {
        console.log('❌ STEP 2: NO LOCATION (denied or failed)')
        console.log('📍 Using default San Francisco locations')
      }
      
      const response = await api.post(`/api/inventory/find-deals/${item.id}`, {
        user_location: userLocation
      })
      
      // Log location status from backend
      console.log('🌐 Backend says:', response.data.location_status)
      if (response.data.user_location) {
        console.log('✅ YOUR REAL LOCATION WAS USED:', response.data.user_location)
        const lat = response.data.user_location.lat
        const lon = response.data.user_location.lon
        if (lat > 42 && lat < 43 && lon > -84 && lon < -82) {
          console.log('🏙️ Showing DETROIT area stores')
        } else {
          console.log('🌉 Showing SAN FRANCISCO area stores')
        }
      } else {
        console.log('📍 Using fallback SF addresses (location not provided)')
      }
      
      setDeals(response.data.deals || [])
      setAiRecommendation(response.data.recommendation)
      showToast('✨ Watson AI found the best deals!', 'success')
    } catch (error) {
      console.error('Failed to fetch deals:', error)
      showToast('Failed to find deals. Please try again.', 'error')
    } finally {
      setDealsLoading(false)
    }
  }

  const closeDealPanel = () => {
    setDealsPanelOpen(false)
    setSelectedDealItem(null)
    setDeals([])
    setAiRecommendation(null)
  }

  const generateOrder = async () => {
    setGeneratingOrders(true)
    try {
      const response = await api.post('/api/inventory/generate-order')
      const orders = response.data.orders
      if (orders.length === 0) {
        showToast('No items need reordering', 'info')
        setShowOrders(false)
      } else {
        setGeneratedOrders(orders)
        setShowOrders(true)
        showToast(`Order generated for ${orders.length} items!`, 'success')
      }
    } catch (error) {
      showToast('Failed to generate order', 'error')
    } finally {
      setGeneratingOrders(false)
    }
  }

  const sendLowStockAlert = async () => {
    setSendingAlert(true)
    try {
      const response = await api.post('/api/inventory/send-low-stock-alert')
      if (response.data.items_alerted === 0) {
        showToast('All stock levels are good! 🎉', 'success')
      } else {
        showToast(`Email alert sent for ${response.data.items_alerted} low stock items 📧`, 'success')
      }
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to send alert', 'error')
    } finally {
      setSendingAlert(false)
    }
  }

  const getStatusColor = (status: string) => {
    if (status === 'Out') return 'bg-red-100 text-red-800'
    if (status === 'Low') return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const lowStockCount = items.filter(item => item.status === 'Low').length
  const outOfStockCount = items.filter(item => item.status === 'Out').length
  const inStockCount = items.filter(item => item.status === 'In Stock').length

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <div className="flex gap-2">
            <button 
              onClick={sendLowStockAlert} 
              disabled={sendingAlert}
              className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Bell className="mr-2" size={18} />
              {sendingAlert ? 'Sending...' : 'Send Stock Alert'}
            </button>
            <button 
              onClick={generateOrder}
              disabled={generatingOrders}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {generatingOrders ? 'Generating...' : 'Generate Order List'}
            </button>
            <button 
              onClick={() => setShowForm(!showForm)} 
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
            >
              <Plus className="inline mr-2" size={18} />
              Add Item
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Stock</p>
                <p className="text-2xl font-bold text-green-600">{inStockCount}</p>
              </div>
              <CheckCircle className="text-green-500" size={32} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
              </div>
              <AlertTriangle className="text-yellow-500" size={32} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
              </div>
              <Package className="text-red-500" size={32} />
            </div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">New Inventory Item</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                  <input 
                    placeholder="e.g., Tomatoes" 
                    required 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input 
                    placeholder="e.g., Produce" 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})} 
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Quantity *</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    required 
                    value={formData.current_quantity} 
                    onChange={(e) => setFormData({...formData, current_quantity: parseInt(e.target.value)})} 
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Quantity *</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    required 
                    value={formData.minimum_quantity} 
                    onChange={(e) => setFormData({...formData, minimum_quantity: parseInt(e.target.value)})} 
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input 
                    placeholder="e.g., lbs, kg" 
                    value={formData.unit} 
                    onChange={(e) => setFormData({...formData, unit: e.target.value})} 
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instacart Search Term</label>
                <input 
                  placeholder="e.g., organic tomatoes" 
                  value={formData.instacart_search} 
                  onChange={(e) => setFormData({...formData, instacart_search: e.target.value})} 
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900" 
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 font-medium transition"
                >
                  Create Item
                </button>
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {showOrders && generatedOrders.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md border border-blue-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Package className="text-blue-600 mr-2" size={24} />
                <h3 className="text-lg font-bold text-gray-900">AI-Generated Order Recommendations</h3>
              </div>
              <button onClick={() => setShowOrders(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="space-y-3">
                {generatedOrders.map((order, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex items-center flex-1">
                      <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{order.item_name}</p>
                        <p className="text-sm text-gray-600">{order.category || 'Uncategorized'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-blue-600">{order.suggested_quantity} {order.unit}</p>
                      <p className="text-xs text-gray-500">Recommended</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600 italic">
              💡 These recommendations are generated by IBM WatsonX AI based on your current stock levels and requirements.
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Current</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Minimum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Package className="mx-auto text-gray-400 mb-3" size={48} />
                    <p className="text-gray-500">No inventory items yet</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Add Item" to get started</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        {item.category && <p className="text-sm text-gray-500">{item.category}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleUseItem(item)}
                          disabled={item.current_quantity <= 0}
                          className="text-blue-600 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          title="Remove 1 unit"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-medium text-gray-900 min-w-[60px] text-center">
                          {item.current_quantity} {item.unit}
                        </span>
                        <button 
                          onClick={() => handleAddItem(item)}
                          className="text-green-600 hover:text-green-700 transition"
                          title="Add 1 unit"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-600">{item.minimum_quantity}</span>
                      <span className="text-gray-500 text-sm ml-1">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status === 'Out' && <AlertTriangle size={14} className="mr-1" />}
                        {item.status === 'Low' && <AlertTriangle size={14} className="mr-1" />}
                        {item.status === 'In Stock' && <CheckCircle size={14} className="mr-1" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => openBulkAdjustModal(item)}
                          className="text-gray-600 hover:text-gray-700 transition font-bold text-lg"
                          title="Bulk adjust quantity"
                        >
                          ±
                        </button>
                        <button
                          onClick={() => handleFindDeals(item)}
                          className="text-primary-600 hover:text-primary-700 transition"
                          title={`Find Best Deals with AI for ${item.name}`}
                        >
                          <ShoppingBag size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(item.id)} 
                          className="text-red-600 hover:text-red-700 transition"
                          title="Delete item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bulk Adjust Modal */}
        <Modal
          isOpen={showBulkAdjustModal}
          onClose={() => setShowBulkAdjustModal(false)}
          title={`Adjust Quantity for ${bulkAdjustItem?.name || ''}`}
          size="sm"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Current Quantity</p>
              <p className="text-2xl font-bold text-gray-900">
                {bulkAdjustItem?.current_quantity} {bulkAdjustItem?.unit}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter adjustment amount
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Enter positive number to add, negative to remove
              </p>
              <input
                type="number"
                value={bulkAdjustAmount}
                onChange={(e) => setBulkAdjustAmount(e.target.value)}
                placeholder="e.g., 10 or -5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBulkAdjust()
                  }
                }}
              />
            </div>

            {bulkAdjustAmount && !isNaN(parseInt(bulkAdjustAmount)) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  New quantity will be: <strong>
                    {bulkAdjustItem?.current_quantity + parseInt(bulkAdjustAmount)} {bulkAdjustItem?.unit}
                  </strong>
                </p>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowBulkAdjustModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAdjust}
                disabled={!bulkAdjustAmount || isNaN(parseInt(bulkAdjustAmount))}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmId !== null}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={handleDelete}
          title="Delete Item"
          message="Are you sure you want to delete this inventory item?"
          confirmText="Delete"
          variant="danger"
        />

        {/* AI Deal Finder Side Panel */}
        {dealsPanelOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-end">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/30"
              onClick={closeDealPanel}
            />
            
            {/* Side Panel */}
            <div className="relative h-full w-[450px] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">AI Deal Finder</h2>
                      <p className="text-sm text-primary-100">Powered by Watson</p>
                    </div>
                  </div>
                  <button
                    onClick={closeDealPanel}
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Price Info Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="text-blue-800">
                    💡 <strong>Note:</strong> Prices shown are market-based estimates. Click "Order Now" to see live pricing on Instacart.
                  </p>
                </div>
                {/* Item Info */}
                {selectedDealItem && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{selectedDealItem.name}</h3>
                        <p className="text-sm text-gray-600">{selectedDealItem.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Need</p>
                        <p className="font-bold text-primary-600">
                          {Math.max(selectedDealItem.minimum_quantity - selectedDealItem.current_quantity, 1)} {selectedDealItem.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {dealsLoading && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="text-gray-600 font-medium">Finding best deals with AI...</p>
                    <p className="text-sm text-gray-500">Analyzing prices, ratings, and delivery times</p>
                  </div>
                )}

                {/* AI Recommendation */}
                {!dealsLoading && aiRecommendation && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-green-500 text-white rounded-lg">
                        <Star className="fill-current" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-bold text-green-900">Watson Recommends</h4>
                          <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
                            {Math.round((aiRecommendation.confidence || 0.9) * 100)}% confident
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-green-900 mb-1">{aiRecommendation.store}</p>
                        <p className="text-sm text-green-700">{aiRecommendation.reason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deals List */}
                {!dealsLoading && deals.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                      <span>Available Deals</span>
                      <span className="text-sm text-gray-500 font-normal">({deals.length} stores)</span>
                    </h4>
                    
                    {deals.map((deal, index) => {
                      const isRecommended = aiRecommendation && deal.store === aiRecommendation.store
                      return (
                        <div
                          key={index}
                          className={`border-2 rounded-xl p-4 transition-all hover:shadow-md ${
                            isRecommended
                              ? 'border-green-400 bg-green-50/50'
                              : 'border-gray-200 bg-white hover:border-primary-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h5 className="font-bold text-gray-900">{deal.store}</h5>
                                {isRecommended && (
                                  <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                                    BEST DEAL
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-1 text-sm text-gray-600">
                                <Star className="fill-yellow-400 text-yellow-400" size={14} />
                                <span>{typeof deal.rating === 'number' ? deal.rating.toFixed(1) : deal.rating}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary-600">${deal.price}</div>
                              <div className="text-xs text-gray-500">per {deal.unit}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                            <div className="flex items-center space-x-2 text-gray-600">
                              <MapPin size={14} />
                              <span>{deal.distance}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-600">
                              <Clock size={14} />
                              <span>{deal.delivery_time}</span>
                            </div>
                          </div>

                          {deal.total_cost && (
                            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg mb-3">
                              <span className="text-sm text-gray-600">Total Cost</span>
                              <span className="font-bold text-gray-900">${deal.total_cost.toFixed(2)}</span>
                            </div>
                          )}

                          {/* Pros/Cons */}
                          {(deal.pros || deal.cons) && (
                            <div className="space-y-2 mb-3">
                              {deal.pros && deal.pros.length > 0 && (
                                <div className="space-y-1">
                                  {deal.pros.map((pro: string, i: number) => (
                                    <div key={i} className="flex items-start space-x-2 text-xs">
                                      <span className="text-green-500 mt-0.5">✓</span>
                                      <span className="text-green-700">{pro}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {deal.cons && deal.cons.length > 0 && (
                                <div className="space-y-1">
                                  {deal.cons.map((con: string, i: number) => (
                                    <div key={i} className="flex items-start space-x-2 text-xs">
                                      <span className="text-gray-400 mt-0.5">•</span>
                                      <span className="text-gray-600">{con}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <a
                            href={deal.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              console.log('🔗 Order Now clicked!')
                              console.log('🏪 Store:', deal.store)
                              console.log('🔗 URL:', deal.url)
                              if (!deal.url) {
                                e.preventDefault()
                                console.error('❌ No URL provided for this store!')
                                alert('No order URL available for this store')
                              } else {
                                console.log('✅ Opening:', deal.url)
                              }
                            }}
                            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                              isRecommended
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-primary-600 hover:bg-primary-700 text-white'
                            }`}
                          >
                            <span>Order Now</span>
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Empty State */}
                {!dealsLoading && deals.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-3">
                      <Package size={48} className="mx-auto" />
                    </div>
                    <p className="text-gray-600">No deals found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
