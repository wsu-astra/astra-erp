import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'
import { Plus, Trash2, ExternalLink, Package } from 'lucide-react'

export default function Inventory() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
      setItems(response.data)
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/inventory/', formData)
      setShowForm(false)
      setFormData({ name: '', category: '', current_quantity: 0, minimum_quantity: 0, unit: 'unit', instacart_search: '' })
      fetchItems()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create item')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this item?')) return
    try {
      await api.delete(`/api/inventory/${id}`)
      fetchItems()
    } catch (error) {
      alert('Failed to delete item')
    }
  }

  const generateOrder = async () => {
    try {
      const response = await api.post('/api/inventory/generate-order')
      const orders = response.data.orders
      if (orders.length === 0) {
        alert('No items need reordering')
      } else {
        alert(`Order generated for ${orders.length} items!`)
      }
    } catch (error) {
      alert('Failed to generate order')
    }
  }

  const getStatusColor = (status: string) => {
    if (status === 'Out') return 'bg-red-100 text-red-800'
    if (status === 'Low') return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <div className="space-x-2">
            <button onClick={generateOrder} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Generate Order List
            </button>
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
              <Plus className="inline mr-2" size={18} />
              Add Item
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4">New Inventory Item</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <input placeholder="Item Name" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="px-4 py-2 border rounded" />
              <input placeholder="Category" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="px-4 py-2 border rounded" />
              <input type="number" placeholder="Current Quantity" required value={formData.current_quantity} onChange={(e) => setFormData({...formData, current_quantity: parseInt(e.target.value)})} className="px-4 py-2 border rounded" />
              <input type="number" placeholder="Minimum Quantity" required value={formData.minimum_quantity} onChange={(e) => setFormData({...formData, minimum_quantity: parseInt(e.target.value)})} className="px-4 py-2 border rounded" />
              <input placeholder="Unit" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="px-4 py-2 border rounded" />
              <input placeholder="Instacart Search Term" value={formData.instacart_search} onChange={(e) => setFormData({...formData, instacart_search: e.target.value})} className="px-4 py-2 border rounded" />
              <button type="submit" className="col-span-2 bg-primary-600 text-white py-2 rounded hover:bg-primary-700">Create Item</button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Minimum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.category && <p className="text-sm text-gray-500">{item.category}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">{item.current_quantity} {item.unit}</td>
                  <td className="px-6 py-4">{item.minimum_quantity} {item.unit}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    {item.instacart_search && (
                      <a href={`https://www.instacart.com/store/search?q=${item.instacart_search}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">
                        <ExternalLink size={18} className="inline" />
                      </a>
                    )}
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
