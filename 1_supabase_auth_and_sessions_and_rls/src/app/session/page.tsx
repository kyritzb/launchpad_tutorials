'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { TutorialNav } from '@/components/tutorial-nav'
import { CodeBlock } from '@/components/code-block'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

const middlewareCode = `// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        // Write refreshed tokens back to both request AND response
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // This call silently refreshes the access token if it's expired
  // It uses the refresh_token cookie to get a new access_token
  await supabase.auth.getUser()

  return supabaseResponse
}`

const onAuthChangeCode = `// Listen to session changes in a Client Component
const supabase = createClient()

supabase.auth.onAuthStateChange((event, session) => {
  //  event can be:
  //  'INITIAL_SESSION'  — page load, session restored from storage
  //  'SIGNED_IN'        — user just signed in
  //  'SIGNED_OUT'       — user signed out
  //  'TOKEN_REFRESHED'  — access token was refreshed automatically
  //  'USER_UPDATED'     — user metadata changed

  if (session) {
    console.log('User:', session.user.email)
    console.log('Expires at:', new Date(session.expires_at! * 1000))
  }
})`

const getSessionCode = `// Server Component / Route Handler — always prefer getUser()
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()

  // getUser() validates the JWT with Supabase auth server — safe
  const { data: { user } } = await supabase.auth.getUser()

  // getSession() reads from cookie only — NOT validated, use for display only
  const { data: { session } } = await supabase.auth.getSession()

  return <div>Hello {user?.email}</div>
}`

export default function SessionPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [events, setEvents] = useState<{ event: string; time: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      setEvents(prev => [{ event, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)])
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession()
    if (!error) setSession(data.session)
  }

  const expiresIn = session
    ? Math.max(0, Math.floor((session.expires_at! - Date.now() / 1000)))
    : null

  return (
    <div className="flex min-h-screen">
      <TutorialNav />
      <main className="flex-1 p-8 max-w-3xl space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔄</span>
            <h1 className="text-3xl font-bold">Session Management</h1>
          </div>
          <p className="text-muted-foreground">
            Supabase SSR stores your tokens in cookies so sessions survive page reloads.
            Middleware automatically refreshes the access token before it expires — the user
            never has to sign in again unless their refresh token expires (60 days by default).
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Storage</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">httpOnly Cookies</p>
              <p className="text-muted-foreground text-xs">JS can&apos;t read them — prevents XSS token theft</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Refresh Strategy</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">Middleware on every request</p>
              <p className="text-muted-foreground text-xs">Before your page renders, tokens are already refreshed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Expiry</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">1h access / 60d refresh</p>
              <p className="text-muted-foreground text-xs">Configurable in Supabase dashboard</p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Middleware: The Heart of SSR Sessions</h2>
          <p className="text-sm text-muted-foreground">
            This runs before every page render. It reads the refresh token cookie, exchanges it for a
            fresh access token, and writes both cookies back — all transparently.
          </p>
          <CodeBlock code={middlewareCode} language="typescript" label="src/middleware.ts" highlight={[21]} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Listening to Auth Events</h2>
          <CodeBlock code={onAuthChangeCode} language="typescript" label="Client Component" />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">getUser() vs getSession()</h2>
          <CodeBlock code={getSessionCode} language="typescript" label="Server Component" highlight={[11, 14]} />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Live Session Inspector</h2>

          {!session ? (
            <Alert>
              <AlertDescription>No active session — go to the Auth page and sign in first.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="font-mono text-sm font-medium">{session.user.email}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Access token expires in</p>
                    <p className="font-mono text-sm font-medium">
                      {expiresIn !== null
                        ? `${Math.floor(expiresIn / 60)}m ${expiresIn % 60}s`
                        : '—'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={refreshSession}>
                  Force token refresh
                </Button>
                <Button size="sm" variant="destructive" onClick={signOut}>
                  Sign out
                </Button>
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-muted/30 text-xs font-medium">Auth event log</div>
              <div className="divide-y divide-border">
                {events.map((e, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                    <Badge variant="outline" className="font-mono text-xs">{e.event}</Badge>
                    <span className="text-muted-foreground text-xs">{e.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
