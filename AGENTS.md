# Agent Instructions

This file is read at the beginning of each task. Follow it before making code,
design, documentation, or filesystem changes in this repository.

## Memory Documentation

- Treat `memory/memory.md` as the main system memory for the repository.
- Treat `memory/features/` as the per-feature memory directory.
- For every task, feature, fix, design change, implementation change, or repo
  organization change, document the work in `memory/`.
- If the work belongs to a named feature, create or update:

```text
memory/features/<feature-name>.md
```

- Use lowercase kebab-case for feature memory filenames, for example:

```text
memory/features/local-state-store.md
memory/features/agent-registry.md
memory/features/demo-dashboard.md
```

- If the work is repo-wide or changes the overall system contract, also update
  `memory/memory.md`.
- Feature memory files should be concise but complete enough for a future agent
  to resume work without rediscovering context.

## Feature Memory Template

Use this structure when creating a new feature memory file:

```md
# <Feature Name>

## Purpose

What this feature is supposed to do and why it exists.

## Current State

What has been implemented or decided so far.

## Files And Entry Points

Important files, commands, data contracts, or UI surfaces.

## Decisions

Key decisions and the reasoning behind them.

## Open Tasks

Remaining work, risks, blockers, or follow-up checks.
```

## Documentation Timing

- Update memory documentation as part of the same task that changes behavior,
  structure, or intent.
- Do not leave memory updates for a later cleanup pass.
- If no feature-specific memory is needed, record that decision in the task
  summary or in `memory/memory.md` when the task is repo-wide.

## Existing System Memory

- Read `memory/memory.md` before substantial work.
- Read any relevant file under `memory/features/` before changing that feature.
- Preserve existing memory unless it is outdated; when updating outdated memory,
  replace it with the current truth and keep useful historical context when it
  helps future agents.
