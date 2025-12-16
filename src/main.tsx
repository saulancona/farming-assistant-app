import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { VoiceProvider } from './contexts/VoiceContext'
import { CartProvider } from './contexts/CartContext'
import './i18n/config' // Initialize i18n

// Create a React Query client with optimal defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // Retry failed queries twice
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <VoiceProvider>
            <App />
            <ReactQueryDevtools initialIsOpen={false} />
          </VoiceProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
