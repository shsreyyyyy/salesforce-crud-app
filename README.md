# Salesforce CRUD Web App (React + Node.js, OAuth 2.0)

A web app that performs Create/Read/Update/Delete on Salesforce **Account,
Opportunity, Lead, Contact, and Case** records — selected via a dropdown —
without touching the native Salesforce UI. Auth is OAuth 2.0 (Authorization
Code flow) via a Salesforce **External Client App**. Records load 20 at a
time and auto-load the next 20 on scroll.

```
salesforce-crud-app/
├── backend/     Node.js + Express — OAuth2 + Salesforce REST API proxy
└── frontend/    React — login, object dropdown, table, create/edit/delete
```

---

## 1. Create the Salesforce Developer Org

1. Go to https://developer.salesforce.com/signup and sign up (free).
2. Check your email, verify the account, and set a password.
3. Log in at the login URL you were given (usually `https://login.salesforce.com`).

## 2. Create an External Client App (the OAuth "connected app")

1. In Salesforce, click the gear icon → **Setup**.
2. In Quick Find, search **External Client App Manager**.
3. Click **New External Client App**.
4. Fill in:
   - Name: `SF CRUD Web App`
   - Contact Email: your email
   - Distribution State: Local
5. Under **API (Enable OAuth Settings)**, check **Enable OAuth**.
6. Callback URL — add BOTH (one for local dev, one for your deployed backend):
   ```
   http://localhost:5000/auth/callback
   https://YOUR-DEPLOYED-BACKEND-URL/auth/callback
   ```
7. OAuth Scopes — add:
   - `Manage user data via APIs (api)`
   - `Perform requests at any time (refresh_token, offline_access)`
8. Save. Salesforce can take a few minutes to activate a new app.
9. Open the app, go to **Settings**, and copy the **Consumer Key** (Client
   ID) and **Consumer Secret** (Client Secret) — you'll need these in
   `backend/.env`.
10. Also under Settings, set **Require Proof Key for Code Exchange (PKCE)**
    to *not required*, since this app uses the client-secret flow (or add
    PKCE support if you prefer — see "Optional: PKCE" below).

## 3. Configure and run the backend

```bash
cd backend
cp .env.example .env
# edit .env: paste SF_CLIENT_ID, SF_CLIENT_SECRET, and a random SESSION_SECRET
npm install
npm run dev        # or: npm start
```

Backend runs on `http://localhost:5000` by default.

## 4. Configure and run the frontend

```bash
cd frontend
cp .env.example .env   # REACT_APP_BACKEND_URL=http://localhost:5000
npm install
npm start
```

Frontend runs on `http://localhost:3000`. Click **Log in with Salesforce**,
authorize the app, and you'll be redirected back logged in.

---

## How OAuth 2.0 is wired up

1. `GET /auth/login` (backend) redirects the browser to Salesforce's
   `/services/oauth2/authorize` endpoint (Authorization Code flow).
2. User logs in and approves access on Salesforce's own login page.
3. Salesforce redirects back to `GET /auth/callback` with a `code`.
4. The backend exchanges that code for an `access_token` + `refresh_token`
   at `/services/oauth2/token`, and stores them server-side in an
   HTTP-only session cookie (never exposed to the browser's JS).
5. Every `/api/records/...` call attaches `Authorization: Bearer <access_token>`
   when calling the Salesforce REST API; on a `401` the backend
   automatically uses the `refresh_token` to get a new access token and
   retries once.

## How CRUD + dynamic fields work

- `backend/config/objects.js` lists the 5 objects and 5–10 fields each
  (per the assignment). `GET /api/objects` exposes this to the frontend,
  which renders the dropdown and, per object, a dynamically-built table
  and form from that field list.
- **Read**: `GET /api/records/:object?offset=&limit=20` runs a SOQL query
  (`SELECT ... LIMIT 20 OFFSET n`) against `/services/data/vXX.0/query`.
- **Create**: `POST /api/records/:object` → `POST .../sobjects/:object`.
- **Update**: `PUT /api/records/:object/:id` → `PATCH .../sobjects/:object/:id`.
- **Delete**: `DELETE /api/records/:object/:id` → `DELETE .../sobjects/:object/:id`.
- **Pagination**: the frontend table (`RecordTable.js`) keeps an `offset`
  and calls `loadPage` again when the scroll container nears its bottom,
  appending the next 20 records (infinite scroll).

---

## 5. Deploying for free

**Backend → Render (free web service)**
1. Push this repo to GitHub.
2. On https://render.com → New → Web Service → connect the repo, root
   directory `backend`.
3. Build command: `npm install`. Start command: `npm start`.
4. Add environment variables from `backend/.env.example`, using your real
   values. Set `SF_REDIRECT_URI` to
   `https://your-render-app.onrender.com/auth/callback` and
   `FRONTEND_URL` to your deployed frontend URL (step below). Set
   `NODE_ENV=production`.
5. Add `https://your-render-app.onrender.com/auth/callback` as a Callback
   URL on the External Client App (step 2 above).

**Frontend → Vercel or Netlify (free)**
1. New project → import the same repo, root directory `frontend`.
2. Build command: `npm run build`, output dir: `build`.
3. Env var: `REACT_APP_BACKEND_URL=https://your-render-app.onrender.com`.
4. Deploy, then set `FRONTEND_URL` on the backend (Render) to this
   frontend's URL and redeploy the backend so CORS/redirects match.

Both free tiers serve over HTTPS, which is required for the secure
cross-site session cookie used here.

---

## Notes / possible extensions

- Field lists are curated per object (5–10 fields) rather than showing
  every field, per the assignment's min/max requirement — edit
  `backend/config/objects.js` to change them.
- For production hardening you'd add: PKCE on the OAuth flow, CSRF
  protection, server-side input validation matching Salesforce field
  types, and a persistent session store (e.g. Redis) instead of the
  default in-memory `express-session` store.
