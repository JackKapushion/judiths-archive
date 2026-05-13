import type { ReactNode } from 'react'
import { Header } from './header'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
