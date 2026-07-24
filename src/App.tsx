import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './components/auth/auth-context'
import { Layout } from './components/layout/layout'
import { Home } from './pages/home'

// Code splitting: Viewer and Chat are lazy-loaded so their code (PDF library,
// chat client, etc.) doesn't bloat the initial bundle. Home is eagerly loaded
// since it's the landing page and needs to render fast.
const Viewer = lazy(() => import('./pages/viewer').then(m => ({ default: m.Viewer })))
const Chat = lazy(() => import('./pages/chat').then(m => ({ default: m.Chat })))

// App has NO state. This is intentional. Auth modal state lives in AuthProvider
// so that opening/closing the modal doesn't re-render App's children (Layout,
// Home, all cards). If modal state lived here, every modal toggle would cascade
// re-renders through the entire tree and freeze the main thread.
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/read/:docId" element={<Viewer />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:conversationId" element={<Chat />} />
            </Routes>
          </Suspense>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
