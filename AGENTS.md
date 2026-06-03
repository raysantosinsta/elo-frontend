# Elo Frontend Agents Guide

This repository is the Elo Produtivo web client.

## Stack

- Next.js App Router, React, TypeScript.
- Axios client in `src/services/api.ts`.
- Auth token is stored in cookies/localStorage and checked by `middleware.ts`.
- UI uses Tailwind, Radix primitives, lucide icons, maps, charts, and socket clients.

## Agent Rules

- Prefer existing components, hooks, services, and page structure before adding new patterns.
- Use the centralized Axios client for API calls.
- Keep auth behavior aligned with `middleware.ts` and the backend JWT flow.
- Every user-facing async view needs loading, empty, error, and success states.
- Preserve route protection for main application pages.
- Do not duplicate token refresh logic outside `src/services/api.ts`.
- Keep page and component text in Portuguese unless the surrounding feature is already in English.
- Validate responsive behavior for dense operational screens, especially tables, maps, kanban, and forms.
- Avoid broad visual redesigns while implementing product changes.

## Required Checks

- Run `npm run lint` when touching frontend code.
- Run `npm run build` for navigation, auth, routing, or shared component changes.
- For API integration changes, verify the backend route and response shape.

## Critical Flows

- Login and token refresh.
- Kanban and task CRUD.
- Route planning, route detail, driver, and watch pages.
- Users, companies, roles, suppliers, materials, products.
- Reports and dashboards.
- WhatsApp integration screens.

