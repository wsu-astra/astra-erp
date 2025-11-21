/**
 * Authentication Context
 * Manages user authentication state across the application
 */
import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  userId: string | null
  businessId: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, businessName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token')
    const storedBusinessId = localStorage.getItem('business_id')
    const storedUserId = localStorage.getItem('user_id')

    if (token && storedBusinessId && storedUserId) {
      setIsAuthenticated(true)
      setBusinessId(storedBusinessId)
      setUserId(storedUserId)
    }
    
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password })
      const { access_token, user_id, business_id } = response.data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('user_id', user_id)
      localStorage.setItem('business_id', business_id)

      setIsAuthenticated(true)
      setUserId(user_id)
      setBusinessId(business_id)
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed')
    }
  }

  const signup = async (email: string, password: string, businessName: string) => {
    try {
      const response = await api.post('/api/auth/signup', {
        email,
        password,
        business_name: businessName,
      })
      const { access_token, user_id, business_id } = response.data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('user_id', user_id)
      localStorage.setItem('business_id', business_id)

      setIsAuthenticated(true)
      setUserId(user_id)
      setBusinessId(business_id)
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Signup failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('business_id')
    localStorage.removeItem('business_name')
    localStorage.removeItem('logo_url')

    setIsAuthenticated(false)
    setUserId(null)
    setBusinessId(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, userId, businessId, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
