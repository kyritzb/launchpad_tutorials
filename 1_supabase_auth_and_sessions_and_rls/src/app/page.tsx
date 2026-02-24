import { TutorialNav } from '@/components/tutorial-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const chapters = [
  {
    href: '/auth',
    emoji: '🔑',
    title: 'Authentication Tokens',
    description: 'See how Supabase issues a JWT access token and a refresh token on sign-in. Inspect the payload live.',
    tags: ['JWT', 'Access Token', 'Refresh Token'],
    color: 'text-blue-400',
  },
  {
    href: '/session',
    emoji: '🔄',
    title: 'Session Management',
    description: 'Understand how sessions are persisted in cookies, how middleware refreshes tokens, and what happens on expiry.',
    tags: ['Cookies', 'Middleware', 'Auto-refresh'],
    color: 'text-green-400',
  },
  {
    href: '/rls-private',
    emoji: '🔒',
    title: 'RLS: Private Data',
    description: "Create two accounts. Without RLS, both can read each other's data. Add RLS policies and watch access get blocked.",
    tags: ['RLS', 'Policies', 'select using'],
    color: 'text-red-400',
  },
  {
    href: '/rls-friends',
    emoji: '🤝',
    title: 'RLS: Friend Access',
    description: "Expand RLS so that friends can see each other's profiles. A friendships table drives the policy.",
    tags: ['RLS', 'Friendships', 'exists()'],
    color: 'text-purple-400',
  },
  {
    href: '/rls-admin',
    emoji: '👑',
    title: 'RLS: Admin Access',
    description: "Grant a special admin role the ability to read ALL profiles — while regular users still can't.",
    tags: ['RLS', 'Roles', 'Admin'],
    color: 'text-yellow-400',
  },
  {
    href: '/demo',
    emoji: '🎮',
    title: 'Live Demo',
    description: 'Try it all end-to-end. Sign up as different users, toggle RLS on/off, add friends, and promote admins.',
    tags: ['Interactive', 'Live'],
    color: 'text-pink-400',
  },
]

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <TutorialNav />
      <main className="flex-1 p-8 max-w-4xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Supabase Auth + RLS Tutorial
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            A hands-on walkthrough of Supabase authentication, session handling,
            and Row Level Security — from zero to fine-grained access control.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {chapters.map((ch) => (
            <Link key={ch.href} href={ch.href} className="group">
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{ch.emoji}</span>
                  </div>
                  <CardTitle className={`text-base ${ch.color}`}>{ch.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{ch.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {ch.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-10 p-4 border border-border rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Before you start:</strong> Create a Supabase project at{' '}
            <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">supabase.com</span>,
            copy your project URL + anon key into{' '}
            <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">.env.local</span>,
            then run the SQL migrations in{' '}
            <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">supabase/migrations/</span>{' '}
            against your project via the SQL Editor.
          </p>
        </div>
      </main>
    </div>
  )
}
