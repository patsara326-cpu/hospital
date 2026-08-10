<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project guidance for this repository

This repository is a Next.js 16 App Router project for a hospital/psychiatric patient management system. The current codebase is still a minimal starter, so most implementation work should follow the architecture described in the migration plan and keep the app organized by feature and route.

## Core workflow

- Prefer App Router conventions in `app/` over legacy pages or show/hide DOM patterns.
- Build features as route-driven modules, not as one large script file.
- Keep UI logic in components, data access in `lib/` and route handlers, and types in `types/`.
- Preserve the domain rules: patient registration, assessment scoring, discharge workflow, and Thai Buddhist Era date formatting must remain consistent with the legacy system.

## Project structure

- `app/` is for routes and root layout; create new pages under route folders such as `app/(main)/...`.
- `components/` holds reusable UI and feature-specific components.
- `lib/` is the place for Supabase helpers, constants, validation, date utilities, and export logic.
- `types/` should include generated or manual TypeScript models for database entities.

## Implementation preferences

- Use TypeScript everywhere and keep component props explicit.
- Use Tailwind utility classes instead of inline styling or custom DOM toggle patterns.
- Prefer `next/font/google` for fonts and keep the root layout metadata meaningful.
- For sensitive database writes, prefer route handlers or server actions over direct client-side Supabase mutation calls.
- For forms, use `react-hook-form` + `zod` instead of manual DOM access when implementing new features.
- For complex data access, prefer `@tanstack/react-query` or a simple server-data pattern rather than ad hoc global variables.

## Validation and safety

- Treat patient records and assessments as sensitive health data.
- Do not hardcode Supabase credentials in client code; use environment variables and review RLS before shipping.
- Verify clinical logic before changing it: scoring, SMI-V logic, and risk calculations must match the legacy behavior exactly unless the user approves a change.
- When exporting reports, prefer generating data from source arrays rather than reading from the DOM.

## Commands

- Install dependencies: `npm install`
- Run dev server: `npm run dev`
- Build production app: `npm run build`
- Run lint checks: `npm run lint`

## Important notes for agents

- This repo is not a generic starter template; it is a healthcare app migration target and should retain the original behavior while modernizing the architecture.
- Avoid broad rewrites without a route-by-route plan; migrate in small, testable slices.
- If a requirement is ambiguous, prefer route-level separation and domain-specific logic over shortcut hacks.
- Keep the codebase aligned with the migration guide and Next.js App Router conventions rather than copying old HTML/JS patterns into a new page component.
