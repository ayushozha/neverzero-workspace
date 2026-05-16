'use client';

import { useState } from 'react';
import './doc-minimal.css';

const INITIAL = [
  { id: 1, done: true,  text: 'Lock pricing tiers — Solo, Team, Workspace' },
  { id: 2, done: true,  text: 'Draft launch narrative' },
  { id: 3, done: true,  text: 'Competitor matrix across 12 workspaces' },
  { id: 4, done: false, text: 'Land onboarding flow — show one real agent in under 60s' },
  { id: 5, done: false, text: 'Wire OAuth + agent SSO across providers' },
  { id: 6, done: false, text: 'Benchmark cold-start latency vs. 3 incumbents' },
  { id: 7, done: false, text: 'Ship beta to 200 design partner teams' },
  { id: 8, done: false, text: 'Send invites to launch event (Jul 12)' },
];

export default function DocMinimalPage() {
  const [rows, setRows] = useState(INITIAL);
  const toggle = (id: number) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));

  return (
    <div className="doc-min-root">
      <div className="top">
        <span className="logo" />
        <span className="crumb">Atlas</span>
        <span className="sep">/</span>
        <span className="crumb" style={{ color: 'var(--ink)' }}>Q3 Launch</span>
        <span className="save"><span className="dot" />saved · 14s ago</span>
      </div>

      <article className="doc">
        <div className="meta">May 16, 2026 · 4 collaborators · 1 agent</div>
        <h1>Atlas — Q3 Launch</h1>
        <p className="sub">The shared layer for AI-native work. Beta Jun 6 · Public Jul 14.</p>

        <h2>Mission</h2>
        <p>
          Most teams treat AI as a tool you visit, not a layer you work inside. We&apos;re building one
          persistent document where humans and agents share state — plans, memory, decisions, code — across
          laptop, mobile, and any time-zone.
        </p>
        <p>Beta opens June 6th to 200 design partner teams. Public launch July 14th.</p>

        <h2>Plan</h2>
        <div className="plan">
          {rows.map((r) => (
            <div key={r.id} className="row" data-done={r.done ? '1' : '0'}>
              <span className="c" onClick={() => toggle(r.id)} />
              <span className="t">{r.text}</span>
            </div>
          ))}
        </div>
      </article>

      <div className="ask-wrap">
        <div className="ask" onClick={(e) => e.currentTarget.querySelector<HTMLInputElement>('input')?.focus()}>
          <span className="slash">/</span>
          <input placeholder="Ask, plan, or invoke a skill…" />
          <button className="send" aria-label="Send">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8l10-5-3 11-3-4-4-2z" />
            </svg>
          </button>
        </div>
        <div className="hint">
          Press <span className="k">/</span> for skills · <span className="k">@</span> to mention an agent ·{' '}
          <span className="k">⌘↵</span> to send
        </div>
      </div>
    </div>
  );
}
