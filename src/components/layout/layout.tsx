import type { ReactNode } from 'react'
import { Header } from './header'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {children}
      </main>
    </div>
  )
}
