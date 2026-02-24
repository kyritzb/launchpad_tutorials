'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const steps = [
  { href: '/', label: 'Overview', badge: null },
  { href: '/auth', label: '1. Auth Tokens', badge: '🔑' },
  { href: '/session', label: '2. Sessions', badge: '🔄' },
  { href: '/rls-private', label: '3. RLS: Private', badge: '🔒' },
  { href: '/rls-friends', label: '4. RLS: Friends', badge: '🤝' },
  { href: '/rls-admin', label: '5. RLS: Admin', badge: '👑' },
  { href: '/demo', label: 'Live Demo', badge: '🎮' },
]

export function TutorialNav() {
  const pathname = usePathname()

  return (
    <nav className="w-64 shrink-0 border-r border-border h-screen sticky top-0 flex flex-col p-4 gap-1 overflow-y-auto">
      <div className="mb-4 pb-4 border-b border-border">
        <h1 className="font-bold text-sm text-foreground">Supabase Auth Tutorial</h1>
        <p className="text-xs text-muted-foreground mt-1">Auth · Sessions · RLS</p>
      </div>
      {steps.map((step) => (
        <Link
          key={step.href}
          href={step.href}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
            pathname === step.href
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {step.badge && <span>{step.badge}</span>}
          {step.label}
        </Link>
      ))}
    </nav>
  )
}
