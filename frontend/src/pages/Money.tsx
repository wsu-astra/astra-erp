import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'

export default function Money() {
  const [financials, setFinancials] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    week_start: '',
    gross_sales: 0,
    payroll: 0
  })

  useEffect(() => {
    fetchFinancials()
  }, [])

  const fetchFinancials = async () => {
    try {
      const response = await api.get('/api/financials/')
      setFinancials(response.data)
    } catch (error) {
      console.error('Failed to fetch financials:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/financials/', formData)
      setShowForm(false)
      setFormData({ week_start: '', gross_sales: 0, payroll: 0 })
      fetchFinancials()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create record')
    }
  }

  const getStatusColor = (status: string) => {
    if (status === 'green') return 'bg-green-100 text-green-800'
    if (status === 'yellow') return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Sales vs Payroll</h1>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gray-900 text-white rounded-lg">
            Add Financial Record
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="date" required value={formData.week_start} onChange={(e) => setFormData({...formData, week_start: e.target.value})} className="w-full px-4 py-2 border rounded" />
              <input type="number" placeholder="Gross Sales" required step="0.01" value={formData.gross_sales} onChange={(e) => setFormData({...formData, gross_sales: parseFloat(e.target.value)})} className="w-full px-4 py-2 border rounded" />
              <input type="number" placeholder="Payroll" required step="0.01" value={formData.payroll} onChange={(e) => setFormData({...formData, payroll: parseFloat(e.target.value)})} className="w-full px-4 py-2 border rounded" />
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded">Add Record</button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Sales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payroll</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payroll %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {financials.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4">{record.week_start}</td>
                  <td className="px-6 py-4">${record.gross_sales.toFixed(2)}</td>
                  <td className="px-6 py-4">${record.payroll.toFixed(2)}</td>
                  <td className="px-6 py-4 font-bold">{record.payroll_pct}%</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(record.status)}`}>
                      {record.status.toUpperCase()}
                    </span>
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
