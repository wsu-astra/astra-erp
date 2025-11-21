import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

let toastListeners: ((toast: ToastMessage) => void)[] = []

export function showToast(message: string, type: ToastType = 'info') {
  const toast: ToastMessage = {
    id: Date.now().toString(),
    message,
    type
  }
  toastListeners.forEach(listener => listener(toast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const listener = (toast: ToastMessage) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 5000)
    }
    
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
    error: <XCircle className="w-5 h-5 text-red-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-600" />
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200'
  }

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
    warning: 'text-yellow-800'
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg pointer-events-auto min-w-[300px] max-w-md ${bgColors[toast.type]}`}
        >
          {icons[toast.type]}
          <p className={`flex-1 text-sm font-medium ${textColors[toast.type]}`}>
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}