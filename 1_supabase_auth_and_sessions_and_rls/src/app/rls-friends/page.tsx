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

const friendshipTableCode = `-- A simple friendships join table
create table public.friendships (
  id        uuid primary key default gen_random_uuid(),
  user_a_id uuid references public.profiles(id) on delete cascade,
  user_b_id uuid references public.profiles(id) on delete cascade,
  unique(user_a_id, user_b_id)
);

alter table public.friendships enable row level security;

-- Each user can see friendships they are part of
create policy "friendship_participants_can_read"
  on public.friendships for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- Either user can create a friendship
create policy "users_can_create_friendship"
  on public.friendships for insert
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);`

const friendPolicyCode = `-- RLS policy: friends can read each other's profiles
create policy "friends_can_read_profile"
  on public.profiles for select
  using (
    -- The viewer (auth.uid()) has a friendship row with the profile owner (id)
    exists (
      select 1 from public.friendships f
      where
        (f.user_a_id = auth.uid() and f.user_b_id = id) or
        (f.user_b_id = auth.uid() and f.user_a_id = id)
    )
  );

-- Combined with the "read own profile" policy:
-- - You always see yourself
-- - You see friends
-- - Strangers are invisible`

const addFriendCode = `// Add a friendship (either direction works — policy covers both)
const { error } = await supabase
  .from('friendships')
  .insert({
    user_a_id: myUserId,
    user_b_id: friendUserId,
  })

// Now both users can see each other's profile row`

export default function RlsFriendsPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<{ access_token: string; user: { id: string; email?: string } } | null>(null)
  const [profiles, setProfiles] = useState<{ id: string; username: string; role: string }[]>([])
  const [friendId, setFriendId] = useState('')
  const [friendMsg, setFriendMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const signIn = async () => {
    setError('')
    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    setSession(data.session)
    setLoading(false)
  }

  const fetchProfiles = async () => {
    if (!session) return
    setLoading(true)
    const { createClient: raw } = await import('@supabase/supabase-js')
    const client = raw(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${session.access_token}` } } }
    )
    const { data } = await client.from('profiles').select('id, username, role')
    setProfiles(data ?? [])
    setLoading(false)
  }

  const addFriend = async () => {
    if (!session || !friendId) return
    setFriendMsg('')
    const { createClient: raw } = await import('@supabase/supabase-js')
    const client = raw(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${session.access_token}` } } }
    )
    const { error: err } = await client.from('friendships').insert({
      user_a_id: session.user.id,
      user_b_id: friendId,
    })
    if (err) setFriendMsg(`Error: ${err.message}`)
    else setFriendMsg('Friendship created! Fetch profiles again to see the change.')
  }

  return (
    <div className="flex min-h-screen">
      <TutorialNav />
      <main className="flex-1 p-8 max-w-3xl space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🤝</span>
            <h1 className="text-3xl font-bold">RLS: Friend Access</h1>
          </div>
          <p className="text-muted-foreground">
            RLS policies can reference <em>other tables</em>. Here we add a <code className="font-mono text-xs bg-muted px-1 rounded">friendships</code> table
            and write a policy that uses <code className="font-mono text-xs bg-muted px-1 rounded">EXISTS</code> to let friends
            see each other&apos;s profiles — while strangers remain invisible.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { emoji: '👤', label: 'Stranger', desc: 'Can only see themselves' },
            { emoji: '🤝', label: 'Friend', desc: 'Sees own + friend profiles' },
            { emoji: '🚫', label: 'No friendship', desc: 'Profile hidden from others' },
          ].map((item) => (
            <Card key={item.label}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">{item.emoji} {item.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{item.desc}</CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. The friendships table</h2>
          <CodeBlock code={friendshipTableCode} language="sql" label="Migration" />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. The RLS policy</h2>
          <p className="text-sm text-muted-foreground">
            The <code className="font-mono text-xs bg-muted px-1 rounded">EXISTS</code> subquery runs per-row.
            For each profile being considered, it checks whether there&apos;s a friendship row linking the viewer to the profile owner.
          </p>
          <CodeBlock code={friendPolicyCode} language="sql" label="Policy" highlight={[5, 6, 7, 8, 9, 10]} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3. Adding a friendship in code</h2>
          <CodeBlock code={addFriendCode} language="typescript" label="Client code" />
        </section>

        <Separator />

        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Live Demo</h2>
          <p className="text-sm text-muted-foreground">
            Sign in, fetch visible profiles, then add a friend by their user ID and refetch to see the difference.
          </p>

          {!session ? (
            <div className="space-y-2 max-w-sm">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-8 text-sm" />
              </div>
              <Button size="sm" onClick={signIn} disabled={loading}>Sign In</Button>
              {error && <Alert variant="destructive"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Signed in</Badge>
                <span className="text-sm font-mono text-muted-foreground">{session.user.email}</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">Your ID: {session.user.id}</p>

              <Button size="sm" variant="outline" onClick={fetchProfiles} disabled={loading}>
                {loading ? 'Fetching…' : 'Fetch visible profiles'}
              </Button>

              {profiles.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="px-3 py-1.5 bg-muted/30 text-xs font-medium">Visible profiles ({profiles.length})</div>
                  {profiles.map((p) => (
                    <div key={p.id} className="px-3 py-2 text-sm border-t border-border flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => setFriendId(p.id)} title="Click to use as friend ID">
                        {p.id.slice(0, 8)}…
                      </span>
                      <span className="font-medium">{p.username}</span>
                      <Badge variant="outline" className="text-xs ml-auto">{p.role}</Badge>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 max-w-sm">
                <Label className="text-xs">Add Friend by User ID</Label>
                <div className="flex gap-2">
                  <Input
                    value={friendId}
                    onChange={e => setFriendId(e.target.value)}
                    placeholder="paste a user UUID"
                    className="h-8 text-sm font-mono"
                  />
                  <Button size="sm" onClick={addFriend}>Add</Button>
                </div>
                {friendMsg && (
                  <p className="text-xs text-muted-foreground">{friendMsg}</p>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
