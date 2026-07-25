# LeadForge Pro AI

Enterprise business intelligence and lead extraction platform delivered as a Manifest V3 Chrome Extension.

## Current status

| Phase | Status |
|-------|--------|
| Phase 1 — Foundation | Complete (frozen) |
| Phase 2 — Core Infrastructure | Complete |
| Phase 3+ — Extraction & beyond | Not started |

## Phase 2 infrastructure

- Typed messaging protocol (`src/messaging`)
- Dexie IndexedDB schema + repositories
- Chrome storage facade for settings / window bounds
- Services: settings, logger, notifications, queue, analytics, history, export (stub), extraction (stub)
- Zustand stores: settings, session, results, queue, analytics, notifications
- React Query provider
- Utilities: async, id, date, string, csv, validation, errors
- Domain types + provider interfaces (no implementations)
- Background message router

## Development

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Load the built extension (CRXJS) or unpacked `dist` in Chrome.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | TypeScript only |

## Architecture

Governed by:

- Architecture Specification v2.0
- Engineering Standards v1.0
- Design System & UI/UX Specification v1.0
- Component Library & Figma Blueprint v1.0
- Release & Milestone Plan

## License

Proprietary — All rights reserved.
