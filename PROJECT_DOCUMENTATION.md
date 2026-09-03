# Gulf Cargo Admin

## 1. Project Overview

Gulf Cargo Admin is a React-based single-page administration portal for managing cargo shipments, bills, customers, branches, staff, shipment operations, invoices, and system configuration.

The frontend communicates with the Gulf Cargo REST API and provides role-aware navigation for super administrators, staff users, and agency users. The application is designed for authenticated internal users and uses responsive layouts for desktop and smaller screens.

## 2. Technology Stack

| Area | Technology |
| --- | --- |
| Application | React 19, JSX |
| Build tool | Vite 8 |
| Routing | React Router DOM 7 |
| Global state | Redux Toolkit and React Redux |
| Server/cache state | TanStack React Query 5 |
| HTTP client | Axios |
| Styling | Tailwind CSS, component-level CSS, Material UI, Radix UI |
| UI feedback | React Hot Toast |
| Icons | React Icons, Lucide React, MUI icons |
| Charts | Recharts |
| Documents | jsPDF, pdfmake, html2canvas, html2pdf.js, react-to-print |
| Spreadsheet operations | SheetJS (`xlsx`) |
| Animation | Framer Motion |
| Code quality | ESLint |

## 3. Getting Started

### Prerequisites

- Node.js and npm
- Access to the Gulf Cargo API
- A browser with support for `BroadcastChannel` for cross-tab session handling

### Installation

```bash
npm install
```

### Environment configuration

The API base URL is read from `VITE_API_BASE_URL`.

```env
VITE_API_BASE_URL=https://api.gulfcargoksa.com/public/api
```

If the variable is not defined, the application uses the default URL shown above. For local or staging development, create a local environment file such as `.env.local` and do not commit secrets.

### Development commands

```bash
npm run dev       # Start the Vite development server
npm run build     # Create a production build in dist/
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
```

## 4. Application Architecture

```text
src/
|-- main.jsx                  Application bootstrap and providers
|-- App.jsx                   Auth/session lifecycle and router provider
|-- router/                   Route definitions and route guards
|-- components/               Shared layout, navigation, and UI components
|-- features/                 Business features grouped by domain
|-- services/                 API clients and payload/response helpers
|-- store/                    Redux store and slices
|-- auth/                     In-memory and browser token handling
|-- hooks/                    Reusable data hooks
`-- utils/                    Normalization, selection, cache, and form helpers
```

### Providers and startup

`src/main.jsx` wraps the application with:

1. `React.StrictMode`
2. Redux `Provider`
3. TanStack `QueryClientProvider`

React Query defaults are configured with a five-minute stale time, thirty-minute garbage-collection time, no refetch on window focus, and one retry.

`src/App.jsx` initializes the stored session, validates the token through `/profile`, clears React Query data after logout, and mounts the browser router.

## 5. Authentication and Session Security

Authentication is implemented in `src/store/slices/authSlice.js` and `src/services/authService.js`.

### Authentication flow

1. The login form validates email and password locally.
2. The client calls `POST /login`.
3. The returned token is stored through `src/auth/tokenStore.js` and persisted in `localStorage`.
4. User information is taken from the login response or loaded from `GET /profile`.
5. The user and login date are stored for application initialization.
6. Protected routes render only after authentication initialization is complete.

### Session behavior

- A missing or invalid token redirects the user to `/login`.
- A `401` response clears the token and dispatches an unauthorized event.
- Sessions are automatically logged out after 30 minutes without mouse, keyboard, scroll, or touch activity.
- Sessions are cleared when a new calendar day is detected.
- A `BroadcastChannel` named `gulf_cargo_auth` synchronizes logout events and enforces one active tab/session instance.
- Logout clears authentication data and application cache keys beginning with `cargo_` or `party_`.

### Important security boundary

The frontend hides or disables UI actions based on roles, but the API must enforce authorization independently. Do not treat a disabled button or hidden menu item as a replacement for backend permission checks.

## 6. Roles and Navigation

Role normalization accepts `role_id`, `roleId`, or a role object/value. The currently configured role IDs are:

| Role ID | Role | Main access |
| --- | --- | --- |
| `1` | Super Admin | Dashboard, cargo, bills, branches, HR, customers, and system settings |
| `2` | Staff | Dashboard, cargo, and sender/receiver management |
| `3` | Agency | Dashboard, shipment creation/reporting, and agency/partner menu entries |

Role-specific navigation is defined in `src/rolemenu/rolesMenu.jsx`. Route-level protection currently requires authentication for the main application area. The `RoleRoute` helper is available for restricting routes to selected role IDs.

In the cargo list, cargo editing is enabled for super admins and users whose normalized role name is `admin`; other roles see a disabled edit button. The backend should apply the same rule to cargo update endpoints.

## 7. Feature Areas

### Dashboard

The dashboard selects a role-specific dashboard view and displays counters and charts. Dashboard data is loaded through `useDashboardCounters`, normalized for safe numeric and label values, and cached with React Query.

### Cargo

The cargo area supports:

- Creating cargo records with shipment, schedule, party, collection, box, charge, and summary details
- Listing cargo with pagination, booking-number search, and branch filtering
- Viewing cargo details and bills
- Editing cargo for authorized roles
- Selecting cargo across pages for operational reports
- Updating cargo and shipment statuses
- Creating and viewing bills and bill shipments

The cargo list persists selected cargo IDs using `src/utils/cargoSelection.js`, allowing report navigation to use the selected set.

### Shipments and operations

Shipment features cover shipment creation, shipment reports, shipment/bill shipment views, status updates, and operational report generation. The operations area contains:

- Delivery List
- Loading List
- Packing List
- Custom Manifest

These reports are available under `/reports/*` and are opened from selected cargo or shipment records.

### Bills and finance

The application supports physical bills, bill shipments, invoice views, bill import, bill status updates, PDF/print-oriented views, and invoice-related screens. Physical bill APIs are grouped in `src/services/billShipmentApi.js`.

### CRM

CRM features manage sender and receiver/customer records, including list, create, view, edit, modal, and form workflows. Party-related helpers normalize customer types and lookup behavior.

### HR and staff

HR features provide staff listing, creation, details, editing, and deletion. Staff API operations are grouped in `src/services/staffService.js`.

### Branches and settings

The settings area contains branch management plus configuration lists/forms for:

- Shipment methods
- Shipment statuses
- Ports
- Visa types
- Licence types
- Payment types
- Delivery types
- Document types
- Roles and invoice numbering helpers in the service layer

## 8. Route Reference

### Public routes

| Path | Purpose |
| --- | --- |
| `/login` | User login |
| `/forgotpassword` | Request password reset |
| `/resetpassword` | Complete password reset |

### Authenticated routes

| Area | Routes |
| --- | --- |
| Dashboard | `/dashboard` |
| Branches | `/branches`, `/branches/add`, `/branches/edit/:id`, `/branch/viewbranch/:id` |
| Customers | `/customers`, `/customers/create`, `/senderreceiver/senderview/:id` |
| HR | `/hr&staff/allstaffs`, `/hr&staff/createstaffs`, `/hr&staff/staff/:id`, `/hr&staff/staff/:id/edit` |
| Cargo | `/cargo/allcargolist`, `/cargo/view/:id`, `/cargoshipment/createcargo` |
| Shipments | `/shipment/createshipment`, `/shipment/shipmentreport`, `/shipments/shipmentsview/:id` |
| Bills | `/bills/create`, `/bills/view`, `/bill/view/:id`, `/invoice/:id` |
| Bill shipments | `/bills-shipments/create`, `/bills-shipments/list`, `/billshipment/:id`, `/billshipment/:id/edit` |
| Reports | `/reports/manifest`, `/reports/packinglist`, `/reports/loadinglist`, `/reports/deliverylist` |
| Settings | `/visa/allvisa`, `/shipmentmethod/view`, `/port/view`, `/shipmentstatus/view`, `/licence/view`, `/paymenttype/view`, `/documents/documentlist`, `/deliverytype/list` |
| Profile | `/profile` |

Unknown routes redirect to `/login`.

## 9. API Integration

All services use the Axios instance in `src/services/axios.js`.

### Axios behavior

- Base URL: `VITE_API_BASE_URL` or the production default
- Request timeout: 20 seconds by default
- `Authorization: Bearer <token>` is added automatically
- `FormData` requests remove the JSON content-type header so the browser can set the multipart boundary
- HTTP 401 responses clear the stored token

### Service modules

| Module | Responsibility |
| --- | --- |
| `authService.js` | Login, logout, profile, registration, forgot/reset password |
| `cargoService.js` | Cargo, cargo shipments, status updates, invoice normalization, payload building |
| `billShipmentApi.js` | Physical bills and grouped bill shipments, including Excel import |
| `partyService.js` | Sender, receiver, and customer/party CRUD and lookups |
| `staffService.js` | Staff CRUD and profile fallback lookups |
| `coreService.js` | Branches, roles, ports, statuses, methods, types, countries, counts, and master data |

API responses are normalized in service modules because backend responses may be returned as arrays, `data`, `items`, or nested `data.data` structures.

## 10. Common Development Patterns

### Adding a feature

1. Create the feature page and colocated components under the relevant `src/features/<Domain>` directory.
2. Add API calls to the appropriate service module, or create a new service module for a separate backend domain.
3. Normalize inconsistent API responses at the service boundary.
4. Add a lazy import and route in `src/router/router.jsx`.
5. Add navigation in `src/rolemenu/rolesMenu.jsx` when the page should appear in a role menu.
6. Add role protection at route or action level as required.
7. Run lint and production build checks.

### Data fetching

Use React Query for reusable server data and cacheable dashboard/master-data queries. Use local React state for transient form, modal, filter, and pagination state. Use Redux for cross-application authentication and dashboard state.

### Forms and documents

Cargo and bill forms use helper functions to build API payloads and normalize records. Document/report screens may use spreadsheet imports/exports and PDF/print libraries. Keep file uploads as `FormData` and let the Axios interceptor manage the content type.

## 11. Quality Checks

Before submitting a change:

```bash
npm run lint
npm run build
```

Manual smoke-test checklist:

- Login, invalid login, forgot password, and reset password
- Protected-route redirect after logout
- Role-specific navigation
- Cargo list filtering, pagination, selection, view, invoice, and edit permissions
- Cargo and bill create/edit workflows
- Excel import/export and report generation
- Session expiry, logout, and multi-tab behavior
- Mobile and desktop layouts

There is currently no dedicated automated test script in `package.json`; regression coverage is primarily provided by linting, production builds, and manual workflow testing.

## 12. Deployment Notes

1. Set `VITE_API_BASE_URL` for the target environment.
2. Run `npm run build`.
3. Serve the generated `dist/` directory from a static web server.
4. Configure SPA fallback so application routes serve `index.html` on direct navigation. The repository includes an `.htaccess` file for Apache deployments.
5. Confirm the API allows the deployed frontend origin and supports the required authentication headers.

## 13. Known Implementation Notes

- The repository contains both `vite.config.js` and `vite.config.ts`; the TypeScript config is the documented active configuration and should be kept aligned with the JavaScript config if both remain in use.
- Several older route and menu entries are commented out. They are not considered active product functionality until uncommented and verified.
- The frontend contains multiple styling systems because the application has evolved over time. New work should follow the conventions of the feature being changed and avoid introducing another styling approach without a clear reason.
- Authorization is partly represented in navigation and UI state. API-side authorization remains mandatory for production security.

## 14. Useful Files

| File | Description |
| --- | --- |
| `src/App.jsx` | Application session lifecycle |
| `src/main.jsx` | React, Redux, and React Query bootstrap |
| `src/router/router.jsx` | Routes and guards |
| `src/rolemenu/rolesMenu.jsx` | Role-based sidebar menus |
| `src/services/axios.js` | Shared API client |
| `src/store/slices/authSlice.js` | Authentication state and actions |
| `src/features/Cargo/CargoList.jsx` | Cargo list, filters, selection, and actions |
| `src/features/Dashboard/useDashboardCounters.js` | Dashboard query and normalization |
| `src/utils/cargoSelection.js` | Persistent cargo selection behavior |
