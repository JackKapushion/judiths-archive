import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './components/auth/auth-context'
import { AuthModal } from './components/auth/auth-modal'
import { Layout } from './components/layout/layout'
import { Home } from './pages/home'
import { Viewer } from './pages/viewer'

function App() {
  const [authModalOpen, setAuthModalOpen] = useState(false)

  return (
    <BrowserRouter>
      <AuthProvider onOpenAuthModal={() => setAuthModalOpen(true)}>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/read/:docId" element={<Viewer />} />
          </Routes>
        </Layout>
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
