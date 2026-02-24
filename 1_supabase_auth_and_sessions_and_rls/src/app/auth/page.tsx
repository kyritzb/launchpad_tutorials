'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { TutorialNav } from '@/components/tutorial-nav'
import { CodeBlock } from '@/components/code-block'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

function TokenViewer({ token, label }: { token: string; label: string }) {
  const [expanded, setExpanded] = useState(false)

  let decoded: Record<string, unknown> | null = null
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    }
  } catch {
    // not a JWT
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
        <span className="text-sm font-medium">{label}</span>
        {decoded && (
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-6 text-xs">
            {expanded ? 'Hide payload' : 'Decode JWT'}
          </Button>
        )}
      </div>
      <div className="p-3 bg-zinc-950 font-mono text-xs break-all text-green-400">
        {token.slice(0, 60)}…
      </div>
      {expanded && decoded && (
        <pre className="p-4 bg-zinc-900 text-xs text-blue-300 overflow-auto border-t border-border">
          {JSON.stringify(decoded, null, 2)}
        </pre>
      )}
    </div>
  )
}

const signUpCode = `// Sign up a new user
const { data, error } = await supabase.auth.signUp({
  email: 'alice@example.com',
  password: 'supersecret',
  options: {
    data: { username: 'alice' } // stored in raw_user_meta_data
  }
})

// data.session contains:
// {
//   access_token:  "eyJhbGciOi..."  ← JWT, expires in 1 hour
//   refresh_token: "v1.abc123..."   ← opaque, long-lived
//   expires_in:    3600
//   token_type:    "bearer"
//   user:          { id, email, ... }
// }`

const signInCode = `// Sign in an existing user
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'alice@example.com',
  password: 'supersecret',
})

// Same session shape — new tokens issued each time
console.log(data.session.access_token)   // JWT
console.log(data.session.refresh_token)  // opaque string`

const jwtCode = `// The access_token is a JWT — three base64 parts separated by "."
// header.payload.signature

// Decode the payload (middle part):
const payload = JSON.parse(atob(token.split('.')[1]))
// {
//   "sub":   "uuid of the user",     ← auth.uid()
//   "email": "alice@example.com",
//   "role":  "authenticated",        ← used by RLS
//   "iat":   1700000000,             ← issued at
//   "exp":   1700003600              ← expires at (iat + 3600)
// }
//
// Supabase verifies this signature server-side on every request.
// The client NEVER needs to send the refresh_token to the DB.`

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<{ access_token: string; refresh_token: string } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')

  const supabase = createClient()

  const handle = async () => {
    setError('')
    setLoading(true)
    try {
      const fn = mode === 'signup'
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password })
      const { data, error: err } = await fn
      if (err) throw err
      if (data.session) setSession(data.session)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <TutorialNav />
      <main className="flex-1 p-8 max-w-3xl space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔑</span>
            <h1 className="text-3xl font-bold">Authentication Tokens</h1>
          </div>
          <p className="text-muted-foreground">
            When a user signs in, Supabase issues two tokens: a short-lived <strong>JWT access token</strong> and
            a long-lived <strong>refresh token</strong>. The access token is what gets sent to the database
            on every query — it contains the user&apos;s ID and role, which RLS policies read via{' '}
            <code className="font-mono text-xs bg-muted px-1 rounded">auth.uid()</code>.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-400">Access Token (JWT)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>• Expires in <strong className="text-foreground">1 hour</strong></p>
              <p>• Sent as <code className="font-mono text-xs bg-muted px-1 rounded">Authorization: Bearer</code> header</p>
              <p>• Contains <code className="font-mono text-xs bg-muted px-1 rounded">sub</code> = user UUID</p>
              <p>• Signed — DB verifies it without a DB lookup</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-400">Refresh Token (opaque)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>• Valid for <strong className="text-foreground">60 days</strong> (default)</p>
              <p>• Stored in an <code className="font-mono text-xs bg-muted px-1 rounded">httpOnly</code> cookie by SSR client</p>
              <p>• Used to get a new access token when it expires</p>
              <p>• Rotated on every use (single-use)</p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Code: Sign Up</h2>
          <CodeBlock code={signUpCode} language="typescript" label="supabase.auth.signUp" />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Code: Sign In</h2>
          <CodeBlock code={signInCode} language="typescript" label="supabase.auth.signInWithPassword" />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">The JWT Payload</h2>
          <CodeBlock code={jwtCode} language="typescript" label="JWT decode" highlight={[6, 7, 8]} />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Try it live</h2>
          <p className="text-sm text-muted-foreground">Sign up or sign in and inspect your real tokens below.</p>

          <div className="flex gap-2 mb-4">
            <Button
              variant={mode === 'signup' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('signup')}
            >
              Sign Up
            </Button>
            <Button
              variant={mode === 'signin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('signin')}
            >
              Sign In
            </Button>
          </div>

          <div className="grid gap-3 max-w-sm">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="alice@example.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button onClick={handle} disabled={loading || !email || !password}>
              {loading ? 'Loading…' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {session && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-green-400 border-green-400/30">Session received</Badge>
              </div>
              <TokenViewer token={session.access_token} label="access_token (JWT — click Decode JWT)" />
              <TokenViewer token={session.refresh_token} label="refresh_token (opaque — no payload)" />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
