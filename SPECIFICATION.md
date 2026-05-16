# HealthProber — Implementation Specification

## Overview
A health probe Angular dashboard application built from the CovadisSkeletonProject. It monitors configured websites, displays their health status (Healthy / Partially Out / Entirely Out), and allows adding/configuring sites via a wizard-style modal. All data is stored in local storage (site metadata) and session storage (auth credentials).

## Technology Stack
- Angular 21 (from skeleton)
- ng-zorro-antd v21.2.2 + @ant-design/icons-angular
- RxJS
- Standalone components
- Signals for local state
- Reactive forms
- LESS for styling
- LocalStorage / SessionStorage for persistence

---

## Step 0: Bootstrap from Skeleton & Rename

**Source**: `CovadisSkeletonProject/skeleton/frontend`

**Clone Strategy**:
1. Clone the full `CovadisSkeletonProject` repository into `E:\Projects\HealthProber\temp-clone\`.
2. Delete the `.git` folder immediately (no history preservation — this is a new project).
3. Delete everything except `skeleton/frontend/` (backend, pipelines, tools, components, code-snippets).
4. Move `skeleton/frontend/` contents to `E:\Projects\HealthProber\frontend/`.
5. Delete the empty `temp-clone/` and `skeleton/` directories.
6. Keep `SPECIFICATION.md` at the project root.

**Final structure**:
```
HealthProber/
├── frontend/          <-- Angular project root
│   ├── package.json
│   ├── angular.json
│   └── src/
└── SPECIFICATION.md
```

**Rename Actions** ({Name}: `HealthProber`, {name}: `health-prober`):
1. Delete generated artifacts: `frontend/dist/`, `frontend/.angular/`, `frontend/node_modules/`.
2. Update `frontend/angular.json`:
   - Project key: `"Skeleton"` → `"HealthProber"`
   - Component selector prefix: `"prefix": "skeleton"` → `"prefix": "health-prober"`
   - Build output path: `"outputPath": "dist/skeleton"` → `"dist/health-prober"`
   - Serve build targets: `"Skeleton:build:..."` → `"HealthProber}:build:..."`
3. Update `frontend/package.json`: `"name": "skeleton"` → `"name": "health-prober"`
4. Update `frontend/src/index.html`: `<title>Skeleton</title>` → `<title>HealthProber</title>`
5. Update component & directive selectors (all `.ts` files in `src/`):
   - `'skeleton-` → `'health-prober-`
   - `[skeleton-` → `[health-prober-`
6. Update HTML templates (all `.html` files in `src/`):
   - `<skeleton-` → `<health-prober-`
   - `</skeleton-` → `</health-prober-`
   - `skeleton-loading-button` → `health-prober-loading-button`
   - `class="skeleton-button"` → `class="health-prober-button"`
7. Update global styles (`.less`/`.css` files):
   - `.skeleton-button` → `.health-prober-button`
8. Delete sample code but preserve structure:
   - Delete `src/app/features/projects/` (sample pages and components)
   - Delete `src/app/core/services/api/project.service.ts`
   - Keep `src/app/features/` directory for new dashboard feature
9. Verify rename:
   - `npm install` (regenerates lock file)
   - `npm run build`
   - `npm run lint` (ensures no stale `skeleton-` selectors)
   - `npm start`

**Expected result**: The app compiles, serves, and contains zero `Skeleton`/`skeleton` references.

---

## Step 1: Install ng-zorro-antd

1. Install packages:
   ```bash
   npm install ng-zorro-antd @ant-design/icons-angular
   ```
2. Import the ng-zorro pre-built LESS theme into `src/styles.less`.
3. Ensure `angular.json` assets include inline SVG icons from `@ant-design/icons-angular`.

---

## Step 2: Domain Models

Create `src/app/core/models/health-prober/`:

### `site-config.model.ts`

```typescript
export interface SiteConfig {
    id: string;
    name: string;
    endpoints: SiteEndpoint[];
    auth: AuthConfig;
    warningThresholdMs: number;
    criticalThresholdMs: number;
    /** Polling interval in milliseconds. Supported: 10000, 30000, 60000, 300000. 0 = Off. */
    pollingIntervalMs: number;
}

export interface SiteEndpoint {
    id: string;
    url: string;
    method: 'GET' | 'HEAD';
    headers: { key: string; value: string }[];
    queryParams: { key: string; value: string }[];
}

export type AuthConfig =
    | { type: 'none' }
    | { type: 'bearer'; token: string }
    | { type: 'basic'; username: string; password: string };
```

> **Rationale**: `endpoints` is an array even though v1 only supports a single endpoint. This allows future multi-endpoint support without a breaking localStorage migration. `pollingIntervalMs` is per-site (not global).

### `probe-result.model.ts`

```typescript
export interface ProbeResult {
    siteId: string;
    endpointId: string;
    checkedAt: number;
    statusCode: number | null;
    responseTimeMs: number;
    outcome: 'success' | 'slow' | 'error' | 'timeout' | 'cors';
}
```

### `health-status.enum.ts`

```typescript
export enum HealthStatus {
    Healthy = 'Healthy',
    PartiallyOut = 'PartiallyOut',
    EntirelyOut = 'EntirelyOut',
}
```

---

## Step 3: Core Services

### `site-storage.service.ts`
- **Location**: `src/app/core/services/site-storage.service.ts`
- **Responsibility**: CRUD for `SiteConfig[]` in `localStorage` under key `healthprober-sites`.
- **State**: `public readonly $sites = signal<SiteConfig[]>(this.load())`
- **Methods**:
  - `add(site: SiteConfig): void`
  - `update(site: SiteConfig): void`
  - `delete(id: string): void`
- Persist to `localStorage` on every mutation and update the signal.
- Site IDs are generated as **UUID v4** (`crypto.randomUUID()`).

### `auth-storage.service.ts`
- **Location**: `src/app/core/services/auth-storage.service.ts`
- **Responsibility**: Read/write auth credentials to `sessionStorage` keyed by site ID.
- **Methods**:
  - `save(siteId: string, auth: AuthConfig): void`
  - `load(siteId: string): AuthConfig`
  - `clear(siteId: string): void`
- Auth credentials are stored separately from site metadata so passwords/tokens are not persisted across browser sessions.

### `health-probe.service.ts`
- **Location**: `src/app/core/services/health-probe.service.ts`
- **Responsibility**: Execute a single HTTP probe against a `SiteEndpoint`.
- **Method**: `probe(siteId: string, endpoint: SiteEndpoint): Observable<ProbeResult>`
- **Internals**:
  1. Build URL with `HttpParams`.
  2. Build `HttpHeaders` including `Authorization` if auth is configured (reads from `sessionStorage` via `authStorage.load(siteId)`).
  3. Call `HttpClient.request()` with `observe: 'response'`.
  4. Measure duration with `performance.now()`.
  5. Map success to `ProbeResult` with `outcome: 'success'` or `'slow'` based on thresholds.
  6. Catch errors: `HttpErrorResponse` → `error`, timeout → `timeout`, generic network/CORS → `cors`.

### `site-health-state.service.ts`
- **Location**: `src/app/core/services/site-health-state.service.ts`
- **Responsibility**: Orchestrate polling and maintain latest probe results per site.
- **State**:
  - `public readonly $results = signal<Record<string, ProbeResult[]>>({})`
  - `public readonly $statuses = computed(() => { ... })` deriving `HealthStatus` per site.
- **Polling**:
  - Supports per-site intervals: `10000` (10s), `30000` (30s), `60000` (60s), `300000` (5m), `0` (Off).
  - Default interval for new sites: `30000`.
  - If interval is `0`, no auto-polling occurs for that site.
  - Uses individual RxJS `timer()` observables per site based on its interval.
  - On each tick: use `forkJoin` to run `healthProbeService.probe(siteId, endpoint)` for all endpoints in parallel.
  - Update `$results` with the new batch.
  - Stop/restart automatically when the site list changes.
- **Status Mapping** (v1, single endpoint):
  - **Healthy**: `outcome === 'success'` AND `responseTimeMs < warningThresholdMs`
  - **PartiallyOut**: `outcome === 'slow'`, OR (`outcome === 'success'` AND `responseTimeMs >= warningThresholdMs`), OR 4xx status
  - **EntirelyOut**: `outcome === 'error'`, `'timeout'`, `'cors'`, OR 5xx status
- **CORS Display**: CORS failures show `EntirelyOut` status with a `nz-icon nzType="question-circle"` tooltip: "Could not reach site. The site may be blocking cross-origin requests from the browser."

> **Future multi-endpoint mapping** (prepared but not active):
> - Healthy: all endpoints succeed and are fast.
> - PartiallyOut: some endpoints succeed, some fail/slow.
> - EntirelyOut: all endpoints fail.

---

## Step 4: Auth Storage

| Data | Storage | Key |
|---|---|---|
| Site metadata (`SiteConfig[]`) | `localStorage` | `healthprober-sites` |
| Auth credentials (Bearer token / Basic password) | `sessionStorage` | `healthprober-auth-{siteId}` |

- `SiteStorageService` handles `localStorage` for site metadata.
- `AuthStorageService` handles `sessionStorage` keyed by site ID.
- When probing, `HealthProbeService` reads auth from `AuthStorageService`.
- When editing a site, `SiteFormModalComponent` reads/writes auth via `AuthStorageService`.

---

## Step 5: Shared Components

### `status-indicator.component.ts`
- **Location**: `src/app/shared/components/status-indicator/`
- **Inputs**: `$status: HealthStatus`
- **Visual**: Colored `nz-badge` (green/orange/red) + label text.
- **Mapping**:
  - `Healthy` → green badge
  - `PartiallyOut` → orange badge
  - `EntirelyOut` → red badge
- If outcome was `cors`, display a `question-circle` icon with tooltip next to the badge.

---

## Step 6: Add/Edit Site Modal

### `site-form-modal.component.ts`
- **Location**: `src/app/shared/components/site-form-modal/`
- **Launch**: Via `NzModalService.create({ nzContent: SiteFormModalComponent })`.
- **Close**: Injects `NzModalRef` to close with the resulting `SiteConfig`.
- **Wizard Structure**: 5 tabs with a "Next" button. On the final (Review) step, the tabset is replaced by a full review panel.

### Tab 1 — Basics
- `name`: `FormControl<string>` (required)
- `url`: required, URL validator
- `method`: `'GET' | 'HEAD'` (default `GET`)
- `pollingIntervalMs`: `nz-select` with options:
  - `10 seconds` → `10000`
  - `30 seconds` → `30000` (default)
  - `1 minute` → `60000`
  - `5 minutes` → `300000`
  - `Off` → `0`

### Tab 2 — Request
- `headers`: `FormArray` of `{ key: string; value: string }` with "Add Header" / delete-row buttons
- `queryParams`: `FormArray` of `{ key: string; value: string }` with "Add Parameter" / delete-row buttons

### Tab 3 — Authentication
- `authType`: `'none' | 'bearer' | 'basic'`
  - Conditional fields:
    - `bearer`: `token` string
    - `basic`: `username` + `password` strings

### Tab 4 — Thresholds
- `warningThresholdMs`: number (default `2000`)
- `criticalThresholdMs`: number (default `5000`)

### Tab 5 — Review
- Read-only summary of all configured values.
- **"Test Connection" button**: fires a one-off probe and shows result inline (status code / response time / error or CORS message).
- **"Back to Edit" button**: returns to the tabset.
- **"Save Site" button**: constructs `SiteConfig`, generates `id` (UUID v4) if new, passes back via `NzModalRef.close(result)`.

### Validation
- `warningThresholdMs < criticalThresholdMs`
- Header/param keys must be non-empty and unique within their array
- URL must be valid

---

## Step 7: Feature — Dashboard

### Routing
Update `src/app/app.routes.ts`:
- Default redirect: `redirectTo: 'dashboard'`
- Lazy-loaded `/dashboard` route inside `MainLayoutComponent` children.
- Detail page route (top-level): `/sites/:siteId`
  ```typescript
  {
      path: 'sites/:siteId',
      loadComponent: () => import('@app/features/dashboard/pages/site-detail-page/site-detail-page.component')
          .then(m => m.SiteDetailPageComponent),
  }
  ```

### `dashboard-page.component.ts`
- **Location**: `src/app/features/dashboard/pages/dashboard-page/`
- Injects `SiteStorageService` and `SiteHealthStateService`.
- Reads `siteStorage.$sites()`.
- Starts polling via `siteHealthState.startPolling(...)` in constructor.

### Dashboard Header Area
Below the page title, a flex row contains:
- **Left**: Search input (filters cards by name/URL in real-time)
- **Center/Right**: Sort dropdown (`nz-select`) with options:
  - `Status (failed first)` → default
  - `Name (A-Z)`
  - `Last checked (recent first)`
- **Far Right**: "Refresh All" button (manual probe trigger) + "Add Site" button (`nz-button nzType="primary"`)

### Summary Bar
Above the card grid, a compact bar shows aggregate counts:
```
[green] {n} Healthy  |  [orange] {n} Partially Out  |  [red] {n} Entirely Out
```
Updates automatically with polling.

### Card Grid
Responsive columns:
- Mobile (< 576px): 1 column
- Tablet (576–992px): 2 columns
- Desktop (> 992px): 3 columns

### Empty State
When no sites exist, show centered illustration/icon with text:
> "No sites configured yet. Add your first site to start monitoring."
Plus a prominent "Add Site" button.

### `site-card.component.ts`
- **Location**: `src/app/features/dashboard/components/site-card/`
- **Inputs**:
  - `$site: SiteConfig`
  - `$results: ProbeResult[]`
  - `$status: HealthStatus`
- **Displays**:
  - Site name and URL (first endpoint, truncated if long)
  - `StatusIndicatorComponent` with current status + CORS tooltip if applicable
  - Last checked relative time (e.g., "2s ago")
  - Response time in ms (if available)
- **Actions**:
  - **Edit** button (icon): opens `SiteFormModalComponent` in edit mode (starts at Basics tab)
  - **Delete** button (icon): uses `NzPopconfirmModule` to confirm, then calls `SiteStorageService.deleteSite()` and `AuthStorageService.clear()`
- **Card click**: Entire card is clickable, navigates to `/sites/{siteId}`
- **Hover**: Subtle shadow/border change indicating clickability

---

## Step 8: Feature — Site Detail Page

### `site-detail-page.component.ts`
- **Location**: `src/app/features/dashboard/pages/site-detail-page/`
- Sets `PageHeaderService` title to site name and `backUrl` to `/dashboard`.
- **Top Section**: Large status display
  - Current `HealthStatus` with `StatusIndicatorComponent`
  - Latest probe result: status code, response time, last checked time
  - "Refresh Now" button to manually re-probe this site
- **Bottom Section**: Read-only configuration view
  - Name, URL, method, headers table, query params table, auth type (masked), thresholds, polling interval
- **Actions**:
  - "Edit" button: opens `SiteFormModalComponent` in edit mode
  - "Delete" button: `NzPopconfirmModule` → delete and navigate back to `/dashboard`

---

## Step 9: Layout

Keep `MainLayoutComponent` unchanged. The layout's back button and title service are preserved for detail pages. The dashboard page itself sets the title via `PageHeaderService` but does not set a back URL (back button hidden).

The "Add Site", "Refresh All", search, and sort controls live inside `DashboardPageComponent`, styled to a flex row below the page header.

---

## Step 10: Notifications

Use `NzMessageService` for all transient user feedback:
- `"Site '{name}' saved successfully"` — success
- `"Site '{name}' deleted"` — success
- `"All sites refreshed"` — success
- `"Test failed: could not reach site (possible CORS)"` — warning
- `"Unable to refresh sites"` — error
- Validation errors in modal — shown inline, not as toasts

---

## Step 11: Styling

- Create `dashboard-page.component.less`:
  - Flex row for search/sort/action controls
  - Responsive grid for site cards (1/2/3 columns)
  - Summary bar styling
- Create `site-card.component.less`:
  - Card styling with status color indicator (left border or top border)
  - Hover effects indicating clickability
  - Action buttons visibility on hover
- Create `site-detail-page.component.less`:
  - Large status display area
  - Read-only config sections
- Update `styles.less`:
  - Health status color variables:
    - `$health-healthy: #52c41a`
    - `$health-partial: #faad14`
    - `$health-out: #f5222d`
  - `.health-prober-button` baseline styles (from renamed skeleton styles)

---

## Step 12: Verification

### Build
```bash
cd frontend
npm run build
```
Expected: zero errors.

### Lint
```bash
npm run lint
```
Expected: zero errors, no `skeleton-` references, signal prefix rules respected.

### Serve
```bash
npm start
```
Expected:
- Browser tab shows `HealthProber`.
- Dashboard loads at `/dashboard`.
- Empty state appears when no sites exist.
- "Add Site" button opens modal with wizard tabs.
- Create a site, save, card appears in grid.
- Polling initializes and updates status badges.
- Search filters cards.
- Sort reorders cards.
- Click card navigates to `/sites/{id}`.
- Detail page shows status + config.
- Back button returns to dashboard.
- Refresh All triggers immediate re-probe.
- Delete with confirmation removes card.

---

## File Structure Summary

```
src/app/
├── core/
│   ├── models/
│   │   └── health-prober/
│   │       ├── site-config.model.ts
│   │       ├── probe-result.model.ts
│   │       └── health-status.enum.ts
│   ├── services/
│   │   ├── site-storage.service.ts
│   │   ├── auth-storage.service.ts
│   │   ├── health-probe.service.ts
│   │   └── site-health-state.service.ts
│   └── ... (existing skeleton core files)
├── features/
│   └── dashboard/
│       ├── pages/
│       │   ├── dashboard-page/
│       │   │   ├── dashboard-page.component.ts
│       │   │   ├── dashboard-page.component.html
│       │   │   └── dashboard-page.component.less
│       │   └── site-detail-page/
│       │       ├── site-detail-page.component.ts
│       │       ├── site-detail-page.component.html
│       │       └── site-detail-page.component.less
│       └── components/
│           ├── site-card/
│           │   ├── site-card.component.ts
│           │   ├── site-card.component.html
│           │   └── site-card.component.less
│           └── site-form-modal/
│               ├── site-form-modal.component.ts
│               ├── site-form-modal.component.html
│               └── site-form-modal.component.less
├── shared/
│   └── components/
│       └── status-indicator/
│           ├── status-indicator.component.ts
│           ├── status-indicator.component.html
│           └── status-indicator.component.less
└── app.routes.ts
```

---

## Conventions Followed (from AGENTS.md)

- Standalone components (default, omit `standalone: true` preferred).
- Signal-based state with `$` prefix.
- `computed()` for derived state (`$statuses`).
- `inject()` over constructor injection.
- `providedIn: 'root'` for singleton services.
- Reactive forms (`FormBuilder`, `FormArray`).
- Native control flow (`@if`, `@for`) in templates.
- `input()` / `output()` functions instead of decorators.
- No method calls inside template expressions.
- Dedicated `.html` template files.

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-05-08 | Initial specification. |
| 1.1 | 2026-05-08 | Post-interview updates: per-site polling intervals, wizard modal with review step + test button, CORS tooltip handling, detail page (`/sites/:siteId`), search/sort, summary bar, UUID IDs, auth in sessionStorage, card grid layout, notification system, empty state, back navigation via layout service. |
