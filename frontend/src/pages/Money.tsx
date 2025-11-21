import React, { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'
import { DollarSign, TrendingUp, TrendingDown, PieChart, Sparkles, Calendar, BarChart3 } from 'lucide-react'
import { showToast } from '../components/Toast'

export default function Money() {
  const [financials, setFinancials] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [aiInsights, setAiInsights] = useState<any>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly')
  const [showForm, setShowForm] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    week_start: '',
    gross_sales: 0,
    payroll: 0,
    cogs: 0,
    rent: 0,
    utilities: 0,
    supplies: 0,
    marketing: 0,
    maintenance: 0,
    insurance: 0,
    processing_fees: 0,
    other_expenses: 0
  })

  useEffect(() => {
    fetchFinancials()
    fetchMonthlyData()
    fetchSummary()
  }, [])

  useEffect(() => {
    // Refetch summary when month filter changes
    fetchSummary()
  }, [selectedMonth])

  const fetchFinancials = async () => {
    try {
      const response = await api.get('/api/financials/')
      setFinancials(response.data)
    } catch (error) {
      console.error('Failed to fetch financials:', error)
    }
  }

  const fetchMonthlyData = async () => {
    try {
      const response = await api.get('/api/financials/by-month')
      setMonthlyData(response.data)
    } catch (error) {
      console.error('Failed to fetch monthly data:', error)
    }
  }

  const fetchSummary = async () => {
    try {
      const url = selectedMonth === 'all' 
        ? '/api/financials/summary'
        : `/api/financials/summary?month=${selectedMonth}`
      const response = await api.get(url)
      setSummary(response.data)
    } catch (error) {
      console.error('Failed to fetch summary:', error)
    }
  }

  const fetchAIInsights = async () => {
    setLoadingAI(true)
    try {
      const url = selectedMonth === 'all'
        ? '/api/financials/analyze'
        : `/api/financials/analyze?month=${selectedMonth}`
      const response = await api.post(url)
      setAiInsights(response.data)
    } catch (error) {
      console.error('Failed to fetch AI insights:', error)
    } finally {
      setLoadingAI(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isEditing && selectedWeek) {
        // Update existing record
        await api.put(`/api/financials/${selectedWeek.week_start}`, formData)
        setIsEditing(false)
        setSelectedWeek(null)
      } else {
        // Create new record
        await api.post('/api/financials/', formData)
      }
      setShowForm(false)
      setFormData({
        week_start: '',
        gross_sales: 0,
        payroll: 0,
        cogs: 0,
        rent: 0,
        utilities: 0,
        supplies: 0,
        marketing: 0,
        maintenance: 0,
        insurance: 0,
        processing_fees: 0,
        other_expenses: 0
      })
      fetchFinancials()
      fetchSummary()
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to save record', 'error')
    }
  }

  const handleViewWeek = (record: any) => {
    setSelectedWeek(record)
  }

  const handleEditWeek = (record: any) => {
    setFormData({
      week_start: record.week_start,
      gross_sales: record.gross_sales,
      payroll: record.payroll,
      cogs: record.cogs,
      rent: record.rent,
      utilities: record.utilities,
      supplies: record.supplies,
      marketing: record.marketing,
      maintenance: record.maintenance,
      insurance: record.insurance,
      processing_fees: record.processing_fees,
      other_expenses: record.other_expenses
    })
    setSelectedWeek(record)
    setIsEditing(true)
    setShowForm(true)
  }

  const handleCloseDetail = () => {
    setSelectedWeek(null)
    setIsEditing(false)
  }

  const getStatusColor = (status: string) => {
    if (status === 'green') return 'bg-green-100 text-green-800'
    if (status === 'yellow') return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  // Group financials by month
  const groupedByMonth = financials.reduce((acc: any, record: any) => {
    const month = record.week_start.substring(0, 7) // Extract YYYY-MM
    if (!acc[month]) {
      acc[month] = {
        month,
        weeks: [],
        total_revenue: 0,
        total_expenses: 0,
        total_profit: 0
      }
    }
    acc[month].weeks.push(record)
    acc[month].total_revenue += record.gross_sales
    acc[month].total_expenses += record.total_expenses
    acc[month].total_profit += record.net_profit
    return acc
  }, {})

  const monthlyGroups = Object.values(groupedByMonth).sort((a: any, b: any) => 
    b.month.localeCompare(a.month)
  )

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
            <p className="text-gray-600">Track revenue, expenses, and profitability</p>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <DollarSign size={20} />
            {showForm ? 'Cancel' : 'Add Financial Record'}
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">${summary.total_revenue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">${summary.total_expenses.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingDown className="text-red-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Net Profit</p>
                  <p className={`text-2xl font-bold ${summary.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${summary.total_profit.toLocaleString()}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${summary.total_profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <DollarSign className={summary.total_profit >= 0 ? 'text-green-600' : 'text-red-600'} size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Profit Margin</p>
                  <p className={`text-2xl font-bold ${summary.avg_profit_margin >= 20 ? 'text-green-600' : summary.avg_profit_margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {summary.avg_profit_margin}%
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <PieChart className="text-blue-600" size={24} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Month Filter and AI Insights Toggle */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <Calendar className="text-gray-600" size={20} />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 border-none"
            >
              <option value="all">All Time</option>
              {monthlyData.map(m => (
                <option key={m.month} value={m.month}>{m.month}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${viewMode === 'weekly' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              <BarChart3 size={18} />
              Weekly
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${viewMode === 'monthly' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              <Calendar size={18} />
              Monthly
            </button>
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">🤖 AI Financial Insights</h2>
            </div>
            <button
              onClick={fetchAIInsights}
              disabled={loadingAI}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingAI ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Get AI Insights
                </>
              )}
            </button>
          </div>

          {aiInsights && !aiInsights.error && (
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div className="space-y-4">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed" style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '15px',
                  lineHeight: '1.8'
                }}>
                  {aiInsights.ai_analysis}
                </div>
              </div>
              
              {/* Expense Breakdown */}
              {aiInsights.expense_breakdown && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-gray-900">📊 Expense Breakdown</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(aiInsights.expense_breakdown).map(([category, amount]: [string, any]) => (
                      <div key={category} className="flex justify-between py-2 border-b">
                        <span className="text-gray-700">{category}</span>
                        <span className="font-medium text-gray-900">${amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Dismiss Button */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setAiInsights(null)}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                >
                  Dismiss Analysis
                </button>
              </div>
            </div>
          )}

          {aiInsights && aiInsights.error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">{aiInsights.error}</p>
            </div>
          )}

          {!aiInsights && !loadingAI && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Click "Get AI Insights" to analyze your financial data with Watson AI</p>
              <p className="text-sm text-gray-500">AI will provide cost savings opportunities, insights, and recommendations</p>
            </div>
          )}
        </div>

        {/* Monthly View Table */}
        {viewMode === 'monthly' && monthlyData.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Monthly Performance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weeks</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {monthlyData.map((month) => (
                    <tr key={month.month} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{month.month}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">${month.total_revenue.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">${month.total_expenses.toLocaleString()}</td>
                      <td className={`px-6 py-4 text-sm font-bold ${month.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${month.total_profit.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold ${month.profit_margin >= 20 ? 'text-green-600' : month.profit_margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {month.profit_margin}%
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{month.weeks.length} weeks</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Record Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              {isEditing ? 'Edit Financial Record' : 'Add Financial Record'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900">Week Start Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.week_start} 
                    onChange={(e) => setFormData({...formData, week_start: e.target.value})} 
                    className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900">Gross Sales / Revenue</label>
                  <input 
                    type="number" 
                    required 
                    step="0.01" 
                    value={formData.gross_sales || ''} 
                    onChange={(e) => setFormData({...formData, gross_sales: parseFloat(e.target.value) || 0})} 
                    className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 text-gray-900">Expenses</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">💰 Cost of Goods Sold</label>
                    <input type="number" step="0.01" value={formData.cogs || ''} onChange={(e) => setFormData({...formData, cogs: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">👥 Payroll</label>
                    <input type="number" step="0.01" value={formData.payroll || ''} onChange={(e) => setFormData({...formData, payroll: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">🏢 Rent/Lease</label>
                    <input type="number" step="0.01" value={formData.rent || ''} onChange={(e) => setFormData({...formData, rent: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">⚡ Utilities</label>
                    <input type="number" step="0.01" value={formData.utilities || ''} onChange={(e) => setFormData({...formData, utilities: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">📦 Supplies</label>
                    <input type="number" step="0.01" value={formData.supplies || ''} onChange={(e) => setFormData({...formData, supplies: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">📱 Marketing</label>
                    <input type="number" step="0.01" value={formData.marketing || ''} onChange={(e) => setFormData({...formData, marketing: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">🔧 Maintenance</label>
                    <input type="number" step="0.01" value={formData.maintenance || ''} onChange={(e) => setFormData({...formData, maintenance: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">📋 Insurance</label>
                    <input type="number" step="0.01" value={formData.insurance || ''} onChange={(e) => setFormData({...formData, insurance: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">💳 Processing Fees</label>
                    <input type="number" step="0.01" value={formData.processing_fees || ''} onChange={(e) => setFormData({...formData, processing_fees: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">📊 Other Expenses</label>
                    <input type="number" step="0.01" value={formData.other_expenses || ''} onChange={(e) => setFormData({...formData, other_expenses: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setIsEditing(false)
                    setFormData({
                      week_start: '',
                      gross_sales: 0,
                      payroll: 0,
                      cogs: 0,
                      rent: 0,
                      utilities: 0,
                      supplies: 0,
                      marketing: 0,
                      maintenance: 0,
                      insurance: 0,
                      processing_fees: 0,
                      other_expenses: 0
                    })
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700">
                  {isEditing ? 'Update Record' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Financial Records Table - Weekly View */}
        {viewMode === 'weekly' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Weekly Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" colSpan={2}>Month / Week</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payroll %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
                </tr>
              </thead>
              <tbody>
                {financials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No financial records yet. Add your first one above!
                    </td>
                  </tr>
                ) : (
                  monthlyGroups.map((monthGroup: any) => (
                    <React.Fragment key={monthGroup.month}>
                      {/* Month Header Row */}
                      <tr className="bg-primary-50 border-t-2 border-primary-200">
                        <td className="px-6 py-3 text-sm font-bold text-primary-900" colSpan={2}>
                          📅 {new Date(monthGroup.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          <span className="ml-2 text-xs font-normal text-primary-700">({monthGroup.weeks.length} week{monthGroup.weeks.length !== 1 ? 's' : ''})</span>
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-primary-900">${monthGroup.total_revenue.toLocaleString()}</td>
                        <td className="px-6 py-3 text-sm font-semibold text-primary-900">${monthGroup.total_expenses.toLocaleString()}</td>
                        <td className={`px-6 py-3 text-sm font-bold ${monthGroup.total_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          ${monthGroup.total_profit.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-primary-900">
                          {((monthGroup.total_profit / monthGroup.total_revenue) * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-3"></td>
                        <td className="px-6 py-3"></td>
                      </tr>
                      
                      {/* Week Rows */}
                      {monthGroup.weeks.map((record: any) => (
                        <tr key={record.id} className="hover:bg-gray-50 cursor-pointer border-l-4 border-l-primary-200" onClick={() => handleViewWeek(record)}>
                          <td className="px-6 py-4 text-sm text-gray-900 pl-10">{record.week_start}</td>
                          <td className="px-6 py-4 text-sm text-gray-600"></td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">${record.gross_sales.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">${record.total_expenses.toLocaleString()}</td>
                          <td className={`px-6 py-4 text-sm font-bold ${record.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${record.net_profit.toLocaleString()}
                          </td>
                          <td className={`px-6 py-4 text-sm font-bold ${record.profit_margin >= 20 ? 'text-green-600' : record.profit_margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {record.profit_margin}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{record.payroll_pct}%</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(record.status)}`}>
                              {record.status === 'green' ? '✅ Healthy' : record.status === 'yellow' ? '⚠️ Warning' : '❌ Critical'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Week Detail Modal */}
        {selectedWeek && !isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Week of {selectedWeek.week_start}</h2>
                <button onClick={handleCloseDetail} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>

              {/* Summary Section */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-xl font-bold text-gray-900">${selectedWeek.gross_sales.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-xl font-bold text-gray-900">${selectedWeek.total_expenses.toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-lg ${selectedWeek.net_profit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                  <p className="text-sm text-gray-600">Net Profit</p>
                  <p className={`text-xl font-bold ${selectedWeek.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${selectedWeek.net_profit.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 text-gray-900">Expense Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">💰 Cost of Goods Sold</span>
                    <span className="font-medium text-gray-900">${selectedWeek.cogs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">👥 Payroll ({selectedWeek.payroll_pct}%)</span>
                    <span className="font-medium text-gray-900">${selectedWeek.payroll.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">🏢 Rent/Lease</span>
                    <span className="font-medium text-gray-900">${selectedWeek.rent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">⚡ Utilities</span>
                    <span className="font-medium text-gray-900">${selectedWeek.utilities.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">📦 Supplies</span>
                    <span className="font-medium text-gray-900">${selectedWeek.supplies.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">📱 Marketing</span>
                    <span className="font-medium text-gray-900">${selectedWeek.marketing.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">🔧 Maintenance</span>
                    <span className="font-medium text-gray-900">${selectedWeek.maintenance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">📋 Insurance</span>
                    <span className="font-medium text-gray-900">${selectedWeek.insurance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">💳 Processing Fees</span>
                    <span className="font-medium text-gray-900">${selectedWeek.processing_fees.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">📊 Other Expenses</span>
                    <span className="font-medium text-gray-900">${selectedWeek.other_expenses.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-3 text-gray-900">Key Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Profit Margin</p>
                    <p className={`text-lg font-bold ${selectedWeek.profit_margin >= 20 ? 'text-green-600' : selectedWeek.profit_margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {selectedWeek.profit_margin}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Health Status</p>
                    <span className={`inline-block px-3 py-1 text-sm font-medium rounded ${getStatusColor(selectedWeek.status)}`}>
                      {selectedWeek.status === 'green' ? '✅ Healthy' : selectedWeek.status === 'yellow' ? '⚠️ Warning' : '❌ Critical'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6">
                <button 
                  onClick={handleCloseDetail}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleEditWeek(selectedWeek)}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                >
                  Edit Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
