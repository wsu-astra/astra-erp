/**
 * Business Context
 * Manages business information for white-labeling
 */
import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import api from '../lib/api'

interface BusinessContextType {
  businessName: string | null
  logoUrl: string | null
  loading: boolean
  refreshBusiness: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, businessId } = useAuth()
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBusinessInfo = async () => {
    if (!businessId) {
      setLoading(false)
      return
    }

    try {
      const response = await api.get(`/api/business/${businessId}`)
      const { name, logo_url } = response.data

      setBusinessName(name)
      setLogoUrl(logo_url)
      
      localStorage.setItem('business_name', name)
      localStorage.setItem('logo_url', logo_url || '')
    } catch (error) {
      console.error('Failed to fetch business info:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshBusiness = async () => {
    setLoading(true)
    await fetchBusinessInfo()
  }

  useEffect(() => {
    // Try to load from localStorage first
    const storedName = localStorage.getItem('business_name')
    const storedLogo = localStorage.getItem('logo_url')

    if (storedName) {
      setBusinessName(storedName)
      setLogoUrl(storedLogo)
    }

    // Fetch fresh data if authenticated
    if (isAuthenticated && businessId) {
      fetchBusinessInfo()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, businessId])

  return (
    <BusinessContext.Provider value={{ businessName, logoUrl, loading, refreshBusiness }}>
      {children}
    </BusinessContext.Provider>
  )
}

export const useBusiness = () => {
  const context = useContext(BusinessContext)
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider')
  }
  return context
}
