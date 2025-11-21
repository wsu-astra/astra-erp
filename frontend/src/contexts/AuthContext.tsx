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
  role: string | null
  permissions: string[]
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, businessName: string, fullName: string) => Promise<void>
  logout: () => void
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (...permissions: string[]) => boolean
  hasAllPermissions: (...permissions: string[]) => boolean
  isAdmin: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token')
    const storedBusinessId = localStorage.getItem('business_id')
    const storedUserId = localStorage.getItem('user_id')
    const storedRole = localStorage.getItem('role')
    const storedPermissions = localStorage.getItem('permissions')

    if (token && storedBusinessId && storedUserId) {
      setIsAuthenticated(true)
      setBusinessId(storedBusinessId)
      setUserId(storedUserId)
      setRole(storedRole || 'employee')
      setPermissions(storedPermissions ? JSON.parse(storedPermissions) : [])
    }
    
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password })
      const { access_token, user_id, business_id, role, permissions } = response.data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('user_id', user_id)
      localStorage.setItem('business_id', business_id)
      localStorage.setItem('role', role || 'employee')
      localStorage.setItem('permissions', JSON.stringify(permissions || []))

      setIsAuthenticated(true)
      setUserId(user_id)
      setBusinessId(business_id)
      setRole(role || 'employee')
      setPermissions(permissions || [])
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed')
    }
  }

  const signup = async (email: string, password: string, businessName: string, fullName: string) => {
    try {
      const response = await api.post('/api/auth/signup', {
        email,
        password,
        business_name: businessName,
        full_name: fullName,
      })
      const { access_token, user_id, business_id, role, permissions } = response.data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('user_id', user_id)
      localStorage.setItem('business_id', business_id)
      localStorage.setItem('role', role || 'admin')
      localStorage.setItem('permissions', JSON.stringify(permissions || []))

      setIsAuthenticated(true)
      setUserId(user_id)
      setBusinessId(business_id)
      setRole(role || 'admin')
      setPermissions(permissions || [])
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
    localStorage.removeItem('role')
    localStorage.removeItem('permissions')

    setIsAuthenticated(false)
    setUserId(null)
    setBusinessId(null)
    setRole(null)
    setPermissions([])
  }

  // Permission check helper functions
  const hasPermission = (permission: string): boolean => {
    if (role === 'admin') return true
    return permissions.includes(permission)
  }

  const hasAnyPermission = (...perms: string[]): boolean => {
    if (role === 'admin') return true
    return perms.some(perm => permissions.includes(perm))
  }

  const hasAllPermissions = (...perms: string[]): boolean => {
    if (role === 'admin') return true
    return perms.every(perm => permissions.includes(perm))
  }

  const isAdmin = (): boolean => {
    return role === 'admin'
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userId, 
      businessId, 
      role,
      permissions,
      loading, 
      login, 
      signup, 
      logout,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isAdmin
    }}>
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
