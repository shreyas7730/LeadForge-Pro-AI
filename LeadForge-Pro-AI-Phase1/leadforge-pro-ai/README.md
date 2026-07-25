# LeadForge Pro AI

Enterprise business intelligence and lead extraction platform delivered as a Manifest V3 Chrome Extension.

## Phase 1 — Foundation

This milestone delivers:

- Vite + React + TypeScript (strict) scaffold
- Tailwind CSS + design tokens (dark / light)
- Manifest V3
- Single-instance desktop window manager
- Window bounds persistence
- React Router + AppShell (Sidebar + TopBar)
- Theme switching
- Placeholder workspace pages

## Development

```bash
npm install
npm run dev
```

Load the `dist` folder (after `npm run build`) as an unpacked extension in Chrome, or use the CRXJS dev workflow.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start Vite dev server    |
| `npm run build`| Typecheck + production build |
| `npm run typecheck` | TypeScript only     |

## Architecture

See project governance documents:

- Architecture Specification v2.0
- Engineering Standards v1.0
- Design System & UI/UX Specification v1.0
- Component Library & Figma Blueprint v1.0
- Release & Milestone Plan

## License

Proprietary — All rights reserved.
