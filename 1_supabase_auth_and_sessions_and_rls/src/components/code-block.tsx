'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface CodeBlockProps {
  code: string
  language?: string
  label?: string
  highlight?: number[]
}

export function CodeBlock({ code, language = 'typescript', label, highlight = [] }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const lines = code.split('\n')

  return (
    <div className="rounded-lg border border-border overflow-hidden text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">{language}</span>
          {label && <Badge variant="secondary" className="text-xs">{label}</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={copy} className="h-6 text-xs px-2">
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 bg-zinc-950">
        <code className="font-mono text-sm leading-relaxed">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`${highlight.includes(i + 1) ? 'bg-yellow-500/10 border-l-2 border-yellow-400 pl-3 -ml-4 pr-4' : ''}`}
            >
              <span className="select-none text-zinc-600 mr-4 text-xs">{String(i + 1).padStart(2, ' ')}</span>
              <span>{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  )
}
