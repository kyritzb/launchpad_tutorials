'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { TutorialNav } from '@/components/tutorial-nav'
import { CodeBlock } from '@/components/code-block'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

const noRlsCode = `-- No RLS — anyone can read all profiles
select * from public.profiles;
-- Returns ALL rows, regardless of who is asking.
-- Both Alice and Bob can see each other's data. ❌`

const enableRlsCode = `-- Enable RLS on the table — now ALL rows are hidden by default
alter table public.profiles enable row level security;

-- Without any policies, even the owner can't see their own row!
-- You must explicitly grant access via policies.`

const policyCode = `-- Allow users to read only their own profile
create policy "users_read_own_profile"
  on public.profiles
  for select
  using (
    auth.uid() = id   -- auth.uid() is the logged-in user's UUID
  );

-- Now if Alice queries:  select * from profiles
-- She gets back only her own row.
-- Bob's row is invisible — returns 0 rows, no error.`

const updatePolicyCode = `-- Also allow users to update their own profile
create policy "users_update_own_profile"
  on public.profiles
  for update
  using (auth.uid() = id)     -- who can trigger the update
  with check (auth.uid() = id); -- what the row must look like after`

type Profile = { id: string; username: string; bio: string | null; role: string }

interface UserSlot {
  email: string
  password: string
  session: { access_token: string } | null
  profile: Profile | null
  allProfiles: Profile[]
  error: string
  loading: boolean
}

const defaultSlot = (): UserSlot => ({
  email: '', password: '', session: null, profile: null, allProfiles: [], error: '', loading: false,
})

export default function RlsPrivatePage() {
  const [users, setUsers] = useState<[UserSlot, UserSlot]>([defaultSlot(), defaultSlot()])

  const update = (i: 0 | 1, patch: Partial<UserSlot>) =>
    setUsers(prev => {
      const next = [...prev] as [UserSlot, UserSlot]
      next[i] = { ...next[i], ...patch }
      return next
    })

  const signUp = async (i: 0 | 1) => {
    const { email, password } = users[i]
    update(i, { loading: true, error: '' })
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { update(i, { error: error.message, loading: false }); return }
    update(i, { session: data.session, loading: false })
  }

  const signIn = async (i: 0 | 1) => {
    const { email, password } = users[i]
    update(i, { loading: true, error: '' })
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { update(i, { error: error.message, loading: false }); return }
    update(i, { session: data.session, loading: false })
  }

  const fetchProfiles = async (i: 0 | 1) => {
    const slot = users[i]
    if (!slot.session) return
    update(i, { loading: true, error: '' })

    // Create a client with this user's access token
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${slot.session.access_token}` } } }
    )

    const { data, error } = await client.from('profiles').select('*')
    if (error) { update(i, { error: error.message, loading: false }); return }
    update(i, { allProfiles: data ?? [], loading: false })
  }

  const userColors = ['text-blue-400', 'text-green-400'] as const
  const userLabels = ['Alice', 'Bob'] as const

  return (
    <div className="flex min-h-screen">
      <TutorialNav />
      <main className="flex-1 p-8 max-w-3xl space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔒</span>
            <h1 className="text-3xl font-bold">RLS: Private Data</h1>
          </div>
          <p className="text-muted-foreground">
            Row Level Security (RLS) lets you write SQL policies that control which rows each user
            can see — enforced <em>in the database</em>, not your application code. Without RLS,
            every authenticated user can read every row. With it, they can only see what the policy allows.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Without RLS</h2>
          <CodeBlock code={noRlsCode} language="sql" label="No protection" />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Step 1: Enable RLS</h2>
          <CodeBlock code={enableRlsCode} language="sql" label="Enable RLS" highlight={[2]} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Step 2: Add a Policy</h2>
          <p className="text-sm text-muted-foreground">
            The <code className="font-mono text-xs bg-muted px-1 rounded">USING</code> clause is evaluated
            for every row. If it returns <code className="font-mono text-xs bg-muted px-1 rounded">false</code>,
            the row is silently filtered out — the user never knows it exists.
          </p>
          <CodeBlock code={policyCode} language="sql" label="SELECT policy" highlight={[5, 6]} />
          <CodeBlock code={updatePolicyCode} language="sql" label="UPDATE policy" />
        </section>

        <Separator />

        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Live Demo: Two Users</h2>
          <p className="text-sm text-muted-foreground">
            Sign up as Alice and Bob. After signing in, click &quot;Fetch all profiles&quot; for each.
            Watch how RLS controls what each user can see.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {([0, 1] as const).map((i) => {
              const slot = users[i]
              return (
                <div key={i} className="space-y-3">
                  <h3 className={`font-semibold ${userColors[i]}`}>{userLabels[i]}</h3>

                  {!slot.session ? (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          value={slot.email}
                          onChange={e => update(i, { email: e.target.value })}
                          placeholder={`${userLabels[i].toLowerCase()}@example.com`}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Password</Label>
                        <Input
                          type="password"
                          value={slot.password}
                          onChange={e => update(i, { password: e.target.value })}
                          placeholder="••••••••"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => signUp(i)} disabled={slot.loading} className="flex-1">
                          Sign Up
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => signIn(i)} disabled={slot.loading} className="flex-1">
                          Sign In
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Signed in</Badge>
                        <span className="text-xs text-muted-foreground font-mono">{slot.email}</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => fetchProfiles(i)} disabled={slot.loading}>
                        {slot.loading ? 'Fetching…' : 'Fetch all profiles'}
                      </Button>
                      {slot.allProfiles.length > 0 && (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <div className="px-3 py-1.5 bg-muted/30 text-xs font-medium">
                            Visible rows ({slot.allProfiles.length})
                          </div>
                          {slot.allProfiles.map((p) => (
                            <div key={p.id} className="px-3 py-2 text-sm border-t border-border">
                              <span className="font-mono text-xs text-muted-foreground">{p.id.slice(0, 8)}…</span>
                              {' '}<span className="font-medium">{p.username}</span>
                              {' '}<Badge variant="outline" className="text-xs">{p.role}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                      {slot.allProfiles.length === 0 && !slot.loading && (
                        <p className="text-xs text-muted-foreground italic">No results yet — click fetch.</p>
                      )}
                    </div>
                  )}

                  {slot.error && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-xs">{slot.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
