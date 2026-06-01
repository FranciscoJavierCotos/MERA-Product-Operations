# API Contracts

Complete reference for every endpoint exposed by the Fastify API (`apps/api`). This is the **owned API boundary** that sits in front of Supabase — `apps/web` reaches it via `lib/api-client.ts` (server) and `lib/api-client-browser.ts` (client).

- **Base URL (dev):** `http://localhost:8080`
- **OpenAPI / Swagger UI:** `http://localhost:8080/docs`
- **Validation:** Every request is validated at the route layer with Zod (`fastify-type-provider-zod`). Bodies marked `.strict()` reject unknown keys with `400`.
- **Source of truth:** route schemas in [apps/api/src/routes/](../apps/api/src/routes/); response shapes come from the matching service in [apps/api/src/services/](../apps/api/src/services/).

> Notation: `body` shapes use the field — `?` denotes optional, `| null` denotes nullable, `=x` denotes a default. Path params are shown inline (`:id`). All IDs are UUIDs unless typed `int`.

---

## Authentication

Every route **except those marked `public`** requires a Supabase JWT.

```
Authorization: Bearer <supabase access_token>
```

The [auth plugin](../apps/api/src/plugins/auth.ts) verifies the token via `supabase.auth.getUser()`, then decorates the request with a Supabase client **scoped to that user** (`req.supabase`) and the user object (`req.user`). All DB access therefore flows through Postgres **RLS** with `auth.uid()` resolved — RLS is the real authorization layer; API-level role checks (e.g. `PATCH /users/:id`) are defense-in-depth.

| Failure | Status | Body |
|---|---|---|
| No / malformed `Authorization` header | `401` | `{ error: "missing_token" }` |
| Token rejected by Supabase | `401` | `{ error: "invalid_token" }` |

**Public routes (no auth):** `GET /health`, Swagger docs.

### Rate limiting

Global: **300 requests / 15 minutes**, keyed by user (`sub` claim) when a Bearer token is present, otherwise by IP.

### Other global middleware

- **CORS** — restricted to `env.corsOrigins`, credentials enabled.
- **Helmet** — security headers on (CSP disabled, tuned per-deployment).

---

## Error model

Errors are returned by the [error handler](../apps/api/src/plugins/error-handler.ts) in a uniform shape: `{ error: string, message?: string, details?: ... }`.

| Status | `error` | Cause |
|---|---|---|
| `400` | `validation_error` | Zod request-schema failure (`details` = flattened Zod error) |
| `401` | `missing_token` / `invalid_token` | Auth failure |
| `403` | `forbidden` | API-level role / ownership check failed |
| `404` | `not_found` | Unknown route (`message` = `METHOD /url`) |
| `409` | `conflict` | Postgres unique violation (`23505`) |
| `422` | `constraint_violation` | Postgres check violation (`23514`) — e.g. resolution required on final status |
| `422` | `invalid_reference` | Postgres FK violation (`23503`) |
| `422` | `missing_required_field` | Postgres NOT NULL violation (`23502`) |
| `5xx` | `internal_error` | Unhandled error (logged) |

Delete/archive/action endpoints that don't return an entity respond with `{ ok: true }`.

---

## Meta & Auth

### `GET /health` _(public)_
Liveness probe. → `{ status: "ok", uptime: number, timestamp: string }`

### `GET /me`
Authenticated user + profile row.
→ `{ id, email: string|null, profile: { id, full_name: string|null, role } | null }`

---

## Users — [routes/users.ts](../apps/api/src/routes/users.ts)

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| `GET` | `/users` | — | All profiles |
| `GET` | `/users/support` | — | Support members only |
| `GET` | `/users/:id` | — | Single profile |
| `PATCH` | `/users/:id` | `PublicProfileUpdate` or `AdminProfileUpdate` | Role-gated (see below) |

**`PublicProfileUpdate`** (any user, own row only): `{ full_name?: string(1..200), avatar_url?: string(url) | null }`
**`AdminProfileUpdate`** (admin only, any row): adds `{ role?: "admin"|"support_lead"|"support_member"|"client", team_id?: uuid | null }`

`PATCH /users/:id` enforces three checks: non-admins may only update their own row; non-admins may not set `role` or `team_id` (anti self-promotion); body is re-parsed against the role-appropriate schema. Returns `403 forbidden` on violation.

---

## Tickets — [routes/tickets.ts](../apps/api/src/routes/tickets.ts)

| Method | Path | Body / Query |
|---|---|---|
| `GET` | `/tickets` | query: `TicketFilters` |
| `GET` | `/tickets/paginated` | query: `TicketFilters` + `page=1`, `pageSize=50` (max 200) |
| `GET` | `/tickets/me` | — (current user's tickets) |
| `GET` | `/tickets/me/paginated` | query: `TicketFilters` + `page`, `pageSize` |
| `GET` | `/tickets/me/navigation` | query: `currentTicketId` (prev/next nav) |
| `GET` | `/tickets/search` | query: `q` (min 1) |
| `GET` | `/tickets/:id` | — |
| `GET` | `/tickets/:id/comments` | — |
| `GET` | `/tickets/:id/history` | — (audit trail) |
| `POST` | `/tickets/similar-resolutions` | `{ embedding: number[], limit?: 1..50, excludeTicketId?: uuid }` |
| `POST` | `/tickets` | `TicketCreate` (`created_by` set from JWT) |
| `PATCH` | `/tickets/:id` | `TicketUpdate` |
| `DELETE` | `/tickets/:id` | — |
| `PATCH` | `/tickets/:id/time-worked` | `{ time_worked_minutes: int>=0 }` |

**`TicketFilters`** (all optional): `search`, `status_id` int, `priority_id` int, `category_id` int, `temperature_id` int, `team_id` uuid, `assigned_to` uuid, `created_from`, `created_to`, `sort_column`, `sort_dir: "asc"|"desc"`.

**`TicketCreate`** `.strict()`: `{ title: string(min1), description?, category_id: int, priority_id: int, status_id: int, cc_email?: email | null, assigned_to?: uuid | null, team_id?: uuid, company_id?: uuid | null, support_level_id?: int }`

**`TicketUpdate`** `.strict()` (all optional): `title`, `description`, `resolution: string | null`, `status_id` int, `priority_id` int, `category_id` int, `temperature_id` int|null, `support_level_id` int, `team_id` uuid|null, `company_id` uuid|null, `assigned_to` uuid|null, `cc_email` string|null.

> `resolution` is required by a DB trigger when transitioning to a final status → surfaces as `422 constraint_violation`. `resolution_plain` / `resolution_embedding` are derived server-side; never set manually.

---

## Comments — [routes/comments.ts](../apps/api/src/routes/comments.ts)

| Method | Path | Body |
|---|---|---|
| `POST` | `/tickets/:ticketId/comments` | `{ content: string(min1), time_worked_minutes?: int>=0, is_internal?: boolean }` |
| `PATCH` | `/comments/:id` | `{ content: string(min1) }` |
| `DELETE` | `/comments/:id` | — |

---

## Tasks — [routes/tasks.ts](../apps/api/src/routes/tasks.ts)

| Method | Path | Body / Query |
|---|---|---|
| `GET` | `/tasks` | query: `status?: "pending"\|"completed"`, `assigned_to?: uuid` |
| `GET` | `/tasks/me` | — |
| `GET` | `/tasks/upcoming` | query: `days=7` (1..60) |
| `GET` | `/tasks/pending` | — (all pending) |
| `GET` | `/tasks/stats` | — (current user) |
| `GET` | `/tasks/by-ticket/:ticketId` | — |
| `GET` | `/tasks/by-user/:userId` | — |
| `GET` | `/tasks/:id` | — |
| `POST` | `/tasks` | `TaskCreate` (`created_by` from JWT) |
| `PATCH` | `/tasks/:id` | `TaskCreate` (partial) |
| `POST` | `/tasks/:id/complete` | `{ time_spent_minutes?: int }` |
| `POST` | `/tasks/:id/reopen` | — |
| `DELETE` | `/tasks/:id` | — |

**`TaskCreate`** `.strict()`: `{ title: string(min1), description?: string|null, ticket_id?: uuid|null, assigned_to?: uuid|null, created_by?: uuid, status?: "pending"|"completed", due_date?: string|null, priority?: "low"|"medium"|"high"|"urgent", action_tag?: string|null, time_spent_minutes?: int|null }`

---

## Dashboard — [routes/dashboard.ts](../apps/api/src/routes/dashboard.ts)

| Method | Path | Query |
|---|---|---|
| `GET` | `/dashboard/stats` | — (scoped to current user) |
| `GET` | `/dashboard/recent-tickets` | `limit=10` (1..50) |

---

## Analytics — [routes/analytics.ts](../apps/api/src/routes/analytics.ts)

Range-scoped, filter-aware aggregates powering the `/analytics` reporting hub
(the trended counterpart to the real-time `/dashboard`). All reads go through
the per-request JWT-scoped Supabase client, so RLS is preserved. The `range`
query param is one of `7d` | `30d` | `qtd` | `ytd` (default `30d`); each
endpoint compares the current window against the equal-length previous window
where a delta is meaningful.

| Method | Path | Query | Returns |
|---|---|---|---|
| `GET` | `/analytics/summary` | `range=30d` | 5 primary KPIs (`slaCompliance`, `medianResolutionHours`, `p90ResolutionHours`, `netFlow`, `reopenRate`, `atRiskAccounts`), each `{ value, previous, delta }` |
| `GET` | `/analytics/net-flow` | `range=30d` | `{ range, series: [{ date, created, resolved, net }] }` — daily inflow vs resolved |
| `GET` | `/analytics/sla-compliance` | `range=30d` | `{ range, byPriority: [{ priority, met, breached, atRisk, compliance }] }` |
| `GET` | `/analytics/cfd` | `range=30d` | `{ range, series: [{ date, open, resolved, closed }] }` — cumulative flow |
| `GET` | `/analytics/backlog-aging` | — (current snapshot) | `{ buckets: [{ bucket, low, medium, high, urgent, total }] }` |
| `GET` | `/analytics/resolution-distribution` | `range=30d` | `{ range, points: [{ hours, priority }], median, p90 }` |
| `GET` | `/analytics/health-distribution` | `range=30d` | `{ range, levels: [{ level, name, label, emoji, count }], netSlippage }` |
| `GET` | `/analytics/velocity` | `limit=8` (1..20) | `{ sprints: [{ sprint, committed, completed }], rollingAverage }` |

Notes:
- Resolution times are **pause-aware**: wall-clock minus `sla_instances.total_paused_minutes`. Percentiles use median + P90 (never the mean).
- SLA "met" = `resolved_at ≤ resolution_due_at`; `atRisk` counts currently-open tickets already past due.
- `reopenRate` is derived from `ticket_history` status transitions out of a final status (`resolved`/`closed`) ÷ resolved.
- `atRiskAccounts.delta` and `health-distribution.netSlippage` are computed from `company_health_history` transitions within the window.

---

## Teams — [routes/teams.ts](../apps/api/src/routes/teams.ts)

Team types: `business` / `support` / `engineering`. Support levels: `L1`/`L2`/`L3`. Business & engineering teams are always L3.

| Method | Path | Body / Query |
|---|---|---|
| `GET` | `/teams` | — |
| `GET` | `/teams/by-type` | `type: business\|support\|engineering` |
| `GET` | `/teams/business` | — |
| `GET` | `/teams/l1` | — (L1 support team) |
| `GET` | `/teams/support` | — (all support teams) |
| `GET` | `/teams/support/by-level` | `level: L1\|L2\|L3` |
| `GET` | `/teams/escalations/:ticketId` | — |
| `GET` | `/teams/collaborators/:ticketId` | — |
| `GET` | `/teams/:id/detail` | — (team + members + activeProjects + recentTickets) |
| `GET` | `/teams/:id/members` | — |
| `GET` | `/teams/:id` | — |
| `POST` | `/teams` | `TeamBody` |
| `PATCH` | `/teams/:id` | `TeamBody` (partial) |
| `DELETE` | `/teams/:id` | → `{ ok: true }` |
| `POST` | `/teams/:id/members` | `{ user_id: uuid, role: "lead"\|"member" =member }` |
| `PATCH` | `/teams/:id/members/:mid` | `{ role: "lead"\|"member" }` |
| `DELETE` | `/teams/:id/members/:mid` | → `{ ok: true }` |
| `POST` | `/teams/collaborators/:ticketId` | `{ team_id: uuid, support_level?: L1\|L2\|L3, notes?: string }` (`added_by` from JWT) |
| `DELETE` | `/teams/collaborators/by-id/:collaboratorId` | → `{ ok: true }` |
| `POST` | `/teams/escalations` | `{ ticket_id: uuid, to_team_id: uuid, to_support_level: L1\|L2\|L3, reason?: string\|null }` |

**`TeamBody`** `.strict()`: `{ name: string(min1), description?: string|null, team_type?: business\|support\|engineering | null, support_level?: L1\|L2\|L3 | null }`

> Route ordering: `/teams/:id/detail` and `/teams/:id/members` are registered before `/teams/:id` to avoid param clashes.

---

## Companies (CRM) — [routes/companies.ts](../apps/api/src/routes/companies.ts)

Client companies. Access control (enforced by RLS): read = support/admin; company create/update/delete = **admin only**; health updates + contact CRUD = support/admin. Health statuses lookup is readable by any authenticated user.

| Method | Path | Body / Query |
|---|---|---|
| `GET` | `/companies` | — (all companies, with `healthStatus` + `account_owner`) |
| `GET` | `/companies/:id/detail` | — (company + contacts + healthStatus + healthHistory + openTickets/closedTickets + projects + stats) |
| `GET` | `/companies/:id/contacts` | — |
| `GET` | `/companies/:id` | — |
| `POST` | `/companies` | `CompanyBody` (admin; `created_by` from JWT) |
| `PATCH` | `/companies/:id` | `CompanyBody` (partial; admin) |
| `DELETE` | `/companies/:id` | → `{ ok: true }` (admin) |
| `PATCH` | `/companies/:id/health` | `{ health_status_id: int, health_note?: string\|null }` (`health_updated_by`/`health_updated_at` set server-side; a DB trigger records `company_health_history`) |
| `POST` | `/companies/:id/contacts` | `ContactBody` |
| `PATCH` | `/companies/:id/contacts/:cid` | `ContactBody` (partial) |
| `DELETE` | `/companies/:id/contacts/:cid` | → `{ ok: true }` |

**`CompanyBody`** `.strict()`: `{ name: string(min1), description?: string|null, industry?: string|null, website?: string|null, logo_url?: string|null, health_status_id?: int, health_note?: string|null, account_owner_id?: uuid|null }`

**`ContactBody`** `.strict()`: `{ full_name: string(min1), email: email, title?: string|null, phone?: string|null, is_primary?: boolean }`

> Route ordering: `/companies/:id/detail` and `/companies/:id/contacts` are registered before `/companies/:id` to avoid param clashes. Health-status options come from `GET /lookup/company-health-statuses`.

---

## Projects — [routes/projects.ts](../apps/api/src/routes/projects.ts)

| Method | Path | Body / Query |
|---|---|---|
| `GET` | `/projects` | — |
| `GET` | `/projects/active` | — (with sprint/point aggregates) |
| `GET` | `/projects/by-key/:key` | — |
| `GET` | `/projects/:id` | — |
| `POST` | `/projects` | `ProjectCreate` (`created_by` from JWT) |
| `PATCH` | `/projects/:id` | `ProjectUpdate` |
| `POST` | `/projects/:id/archive` | → `{ ok: true }` |
| `DELETE` | `/projects/:id` | → `{ ok: true }` |
| `GET` | `/projects/:id/members` | — |
| `POST` | `/projects/:id/members` | `{ user_id: uuid, role: "owner"\|"developer"\|"viewer" =developer }` |
| `PATCH` | `/projects/:id/members/:mid` | `{ role: "owner"\|"developer"\|"viewer" }` |
| `DELETE` | `/projects/:id/members/:mid` | → `{ ok: true }` |

**`ProjectCreate`** `.strict()`: `{ key: string(min1), name: string(min1), description?: string|null, methodology?: string, sprint_duration_weeks?: int 1..4, team_id?: uuid|null, company_id?: uuid|null, lead_id?: uuid|null }`
**`ProjectUpdate`** `.strict()`: same minus `key`, plus `status?: string`.

---

## Sprints — [routes/sprints.ts](../apps/api/src/routes/sprints.ts)

| Method | Path | Body |
|---|---|---|
| `GET` | `/projects/:projectId/sprints` | — |
| `GET` | `/projects/:projectId/sprints/active` | — |
| `GET` | `/projects/:projectId/sprints/next` | — |
| `GET` | `/sprints/:id` | — |
| `POST` | `/projects/:projectId/sprints` | `{ name: string(min1), goal?: string\|null, start_date?: string\|null, end_date?: string\|null }` |
| `PATCH` | `/sprints/:id` | above (partial) + `status?: string` |
| `POST` | `/sprints/:id/start` | — |
| `POST` | `/sprints/:id/complete` | — |
| `DELETE` | `/sprints/:id` | → `{ ok: true }` |

---

## Work Items — [routes/work-items.ts](../apps/api/src/routes/work-items.ts)

Uses fractional-ranking strings (`rank`) for drag-ordering.

| Method | Path | Body / Query |
|---|---|---|
| `GET` | `/work-items/backlog` | `projectId: uuid` |
| `GET` | `/work-items/rank/first` | `projectId`, `sprintId?`, `status?` → `{ rank }` |
| `GET` | `/work-items/rank/last` | `projectId`, `sprintId?`, `status?` → `{ rank }` |
| `GET` | `/work-items/sprint/:sprintId` | — |
| `GET` | `/work-items/sprint/:sprintId/board` | — (grouped by status) |
| `GET` | `/work-items/by-key/:key` | — |
| `GET` | `/work-items/:id` | — |
| `GET` | `/work-items/:id/history` | — |
| `GET` | `/work-items/:id/comments` | — |
| `POST` | `/work-items` | `WorkItemCreate` (`reporter_id` from JWT) |
| `PATCH` | `/work-items/:id` | `WorkItemUpdate` |
| `PATCH` | `/work-items/:id/status` | `{ status: string }` |
| `PATCH` | `/work-items/:id/move-to-sprint` | `{ sprint_id: uuid \| null }` |
| `PATCH` | `/work-items/:id/reorder` | `{ rank: string, status?: string, sprint_id?: uuid\|null }` |
| `POST` | `/work-items/:id/comments` | `{ content: string(min1) }` (`user_id` from JWT) |

**`WorkItemCreate`** `.strict()`: `{ project_id: uuid, sprint_id?: uuid|null, type?: string, title: string(min1), description?: string|null, priority_id?: int|null, story_points?: int|null, assigned_to?: uuid|null, parent_id?: uuid|null, rank: string }`
**`WorkItemUpdate`** `.strict()` (all optional): `title`, `description`, `type`, `priority_id`, `story_points`, `assigned_to`, `parent_id`, `sprint_id`, `rank`.

**`status`** (enum `work_item_status`): `todo | in_progress | in_review | done | rework`. `rework` is set by the planning board (`/reorder`) when a `done` item is dragged out of a **completed** sprint into the backlog or another sprint — it is reworked, not freshly done.

---

## Item Links — [routes/item-links.ts](../apps/api/src/routes/item-links.ts)

Polymorphic ticket↔work_item and work_item↔work_item bridges.

| Method | Path | Body / Query |
|---|---|---|
| `GET` | `/item-links/types` | — |
| `GET` | `/item-links/tickets/:ticketId` | — |
| `GET` | `/item-links/tickets/:ticketId/primary` | — |
| `GET` | `/item-links/work-items/:workItemId/inbound` | — |
| `GET` | `/item-links/work-items/:workItemId/outbound` | — |
| `GET` | `/item-links/work-items/search` | `q` (min1), `projectId?`, `limit?` 1..50 |
| `GET` | `/item-links/projects` | — (linkable projects) |
| `POST` | `/item-links` | `CreateLink` (`created_by` from JWT) |
| `POST` | `/item-links/:id/primary` | — (mark as primary) |
| `DELETE` | `/item-links/:id` | → `{ ok: true }` |

**`CreateLink`** `.strict()`: `{ source_ticket_id?: uuid|null, source_work_item_id?: uuid|null, target_work_item_id: uuid, link_type: string, is_primary?: boolean, note?: string|null }`

---

## SLA — [routes/slas.ts](../apps/api/src/routes/slas.ts)

| Method | Path | Body |
|---|---|---|
| `GET` | `/sla/policies` | — |
| `GET` | `/sla/policy-targets` | — (active targets keyed by priority id) |
| `GET` | `/sla/stats` | — |
| `GET` | `/sla/most-urgent` | — |
| `GET` | `/sla/instances/:ticketId` | — |
| `POST` | `/sla/policies` | `PolicyBody` |
| `PATCH` | `/sla/policies/:id` | `PolicyBody` (partial) |
| `DELETE` | `/sla/policies/:id` | → `{ ok: true }` |

**`PolicyBody`** `.strict()`: `{ name: string(min1), priority_id: int, response_time_minutes: int>=0, resolution_time_minutes: int>=0, is_active?: boolean }`

---

## Knowledge Base — [routes/knowledge.ts](../apps/api/src/routes/knowledge.ts)

Reads via `services/knowledge`; admin mutations via `services/knowledge-admin` (each takes `req.user.id` for audit).

### Reads
| Method | Path | Query |
|---|---|---|
| `GET` | `/knowledge/collections` | — |
| `GET` | `/knowledge/tags` | — |
| `GET` | `/knowledge/documents` | `collection_id?`, `archived?: boolean`, `search?` |
| `GET` | `/knowledge/documents/:id` | — |
| `GET` | `/knowledge/documents/:id/versions` | — |
| `GET` | `/knowledge/documents/:id/chunks` | — |
| `GET` | `/knowledge/resolutions` | `search?`, `ai_enabled?: boolean`, `archived?: boolean` |
| `GET` | `/knowledge/retrieval-config` | — |
| `GET` | `/knowledge/kpis` | — |
| `GET` | `/knowledge/audit` | `limit=50` (1..500) |
| `POST` | `/knowledge/match` | `{ embedding: number[], threshold?: number, count?: 1..50 }` |

### Admin mutations
| Method | Path | Body |
|---|---|---|
| `POST` | `/knowledge/documents` | `{ title: string(min1), description?: string\|null, collection_id?: uuid\|null, tag_ids?: uuid[] }` |
| `PATCH` | `/knowledge/documents/:documentId` | `.strict()` `{ title?, description?, collection_id?, current_version_id? }` |
| `POST` | `/knowledge/documents/:documentId/archive` | `{ archive: boolean }` |
| `DELETE` | `/knowledge/documents/:documentId` | — |
| `GET` | `/knowledge/documents/:documentId/next-version` | — → `{ version_number }` |
| `POST` | `/knowledge/document-versions` | `{ document_id, version_number: int>=1, storage_path, original_filename, mime_type, file_size_bytes: int>=0 }` |
| `POST` | `/knowledge/document-versions/:versionId/reprocess` | — |
| `POST` | `/knowledge/collections` | `{ id?: uuid, name: string(min1), slug: string(min1), description?: string\|null }` (upsert) |
| `POST` | `/knowledge/collections/:collectionId/archive` | `{ archive: boolean }` |
| `PATCH` | `/knowledge/retrieval-config` | `{ similarity_threshold: number, max_results: int, source_weights: Record<string,number>, sources_enabled: Record<string,boolean> }` |
| `POST` | `/knowledge/resolutions/:ticketId/toggle-ai` | `{ enabled: boolean }` |
| `POST` | `/knowledge/resolutions/:ticketId/archive` | `{ archive: boolean }` |
| `POST` | `/knowledge/resolutions/:ticketId/reembed` | — |
| `POST` | `/knowledge/retrieval-log` | `{ ticket_id: uuid, query_text: string, results: unknown, result_count: int>=0 }` |

---

## Storage — [routes/storage.ts](../apps/api/src/routes/storage.ts)

The API never proxies file bytes — it mints one-shot signed URLs with the user's RLS-scoped client; the browser PUTs directly to Supabase Storage. Filenames are sanitized (`[^a-zA-Z0-9._-]` → `_`).

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/storage/ticket-attachments/sign-upload` | `{ ticketId: uuid, filename: string(min1) }` | `{ signedUrl, token, path, publicUrl }` |
| `POST` | `/storage/kb-documents/sign-upload` | `{ documentId: uuid, version: int>=1, filename: string(min1) }` | `{ signedUrl, token, path }` |
| `POST` | `/storage/kb-documents/sign-download` | `{ path: string(min1), expiresIn?: int 60..3600 =600 }` | `{ signedUrl }` |
| `POST` | `/storage/kb-documents/delete` | `{ paths: string[](min1) }` | `{ ok: true }` |

- `ticket-attachments` is a **public** bucket — upload paths are `:ticketId/<timestamp>-<filename>`; downloads use the returned `publicUrl`.
- `kb-documents` is a **private** bucket — both upload and download require signed URLs. Upload paths are `:documentId/v<version>/<filename>`.
- Signing failures return `500 { error: "sign_failed" }`; delete failures `500 { error: "delete_failed" }`.
