import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'
import { Plus, Trash2, ExternalLink, Package, Bell, AlertTriangle, CheckCircle, Minus } from 'lucide-react'
import { showToast } from '../components/Toast'
import { ConfirmDialog } from '../components/Modal'

export default function Inventory() {
  const [items, setItems] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [sendingAlert, setSendingAlert] = useState(false)
  const [generatingOrders, setGeneratingOrders] = useState(false)
  const [generatedOrders, setGeneratedOrders] = useState<any[]>([])
  const [showOrders, setShowOrders] = useState(false)
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
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
      showNotification('error', 'Item is out of stock')
      return
    }
    try {
      const newQuantity = item.current_quantity - 1
      await api.put(`/api/inventory/${item.id}`, {
        ...item,
        current_quantity: newQuantity
      })
      showNotification('success', `Used 1 ${item.unit} of ${item.name}`)
      fetchItems()
    } catch (error) {
      showNotification('error', 'Failed to update inventory')
    }
  }

  const handleAddItem = async (item: any) => {
    try {
      const newQuantity = item.current_quantity + 1
      await api.put(`/api/inventory/${item.id}`, {
        ...item,
        current_quantity: newQuantity
      })
      showNotification('success', `Added 1 ${item.unit} of ${item.name}`)
      fetchItems()
    } catch (error) {
      showNotification('error', 'Failed to update inventory')
    }
  }

  const handleBulkAdjust = async (item: any) => {
    const amount = prompt(`Adjust quantity for ${item.name}\nEnter positive number to add, negative to remove:`)
    if (!amount) return
    
    const adjustment = parseInt(amount)
    if (isNaN(adjustment)) {
      showNotification('error', 'Please enter a valid number')
      return
    }
    
    const newQuantity = item.current_quantity + adjustment
    if (newQuantity < 0) {
      showNotification('error', 'Quantity cannot be negative')
      return
    }
    
    try {
      await api.put(`/api/inventory/${item.id}`, {
        ...item,
        current_quantity: newQuantity
      })
      const action = adjustment > 0 ? 'Added' : 'Removed'
      showNotification('success', `${action} ${Math.abs(adjustment)} ${item.unit} of ${item.name}`)
      fetchItems()
    } catch (error) {
      showNotification('error', 'Failed to update inventory')
    }
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
        showNotification('success', 'All stock levels are good! 🎉')
      } else {
        showNotification('success', `Email alert sent for ${response.data.items_alerted} low stock items 📧`)
      }
    } catch (error: any) {
      showNotification('error', error.response?.data?.detail || 'Failed to send alert')
    } finally {
      setSendingAlert(false)
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
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
        {/* Notification Banner */}
        {notification && (
          <div className={`p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircle className="text-green-600 mr-2" size={20} />
              ) : (
                <AlertTriangle className="text-red-600 mr-2" size={20} />
              )}
              <span className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {notification.message}
              </span>
            </div>
          </div>
        )}

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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input 
                    placeholder="e.g., Produce" 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input 
                    placeholder="e.g., lbs, kg" 
                    value={formData.unit} 
                    onChange={(e) => setFormData({...formData, unit: e.target.value})} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instacart Search Term</label>
                <input 
                  placeholder="e.g., organic tomatoes" 
                  value={formData.instacart_search} 
                  onChange={(e) => setFormData({...formData, instacart_search: e.target.value})} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
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
                          onClick={() => handleBulkAdjust(item)}
                          className="text-gray-600 hover:text-gray-700 transition font-bold text-lg"
                          title="Bulk adjust quantity"
                        >
                          ±
                        </button>
                        <a 
                          href={`https://www.instacart.com/store/s?k=${(() => {
                            const searchTerm = item.instacart_search?.trim() || item.name || 'groceries';
                            return encodeURIComponent(searchTerm);
                          })()}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary-600 hover:text-primary-700 transition"
                          title={`Order ${item.name} on Instacart`}
                        >
                          <ExternalLink size={18} />
                        </a>
                        <button 
                          onClick={() => handleDelete(item.id)} 
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
      </div>
    </Layout>
  )
}
