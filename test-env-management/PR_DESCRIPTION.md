**Title**: feat(env): add config CRUD, Manage Configs UI, booking and user admin; fix JSON parsing

**Summary**:
This PR introduces environment configuration management (CRUD) with category support (application, hardware, network) and integrates the UI to manage configurations per environment. It also adds a Create Booking modal and a basic user administration UI, plus a robustness fix for JSON parsing in the environment controller.

**Why**:
- Allow teams to store multiple configuration items per environment, categorized by `application`, `hardware`, and `network`.
- Provide a simple UI for adding, editing, and deleting configurations without directly editing JSON in the DB.
- Restore missing Create Booking and user admin functionality that were requested earlier.
- Fix intermittent backend JSON.parse errors causing config reads to fail.

**Changes (high-level)**:
- Backend
  - `backend/src/controllers/environmentController.js` — added config CRUD handlers and hardened JSON parsing for `environments.configuration`.
  - `backend/src/routes/environmentRoutes.js` — added new routes for config management:
    - `GET /api/environments/:id/configs` (auth)
    - `POST /api/environments/:id/configs` (manager/admin)
    - `PUT /api/environments/:id/configs/:configId` (manager/admin)
    - `DELETE /api/environments/:id/configs/:configId` (admin)
  - `backend/src/controllers/authController.js` — added user listing and deletion endpoints (admin only).
  - `backend/src/routes/authRoutes.js` — exposed `GET /api/auth/users` and `DELETE /api/auth/users/:userId`.

- Frontend
  - `frontend/src/lib/api.js` — added `getConfigs`, `createConfig`, `updateConfig`, `deleteConfig` helpers.
  - `frontend/src/components/Environments.js` — added "Manage Configs" button, config modal (list + add/edit/delete), and client-side flows for config CRUD.
  - `frontend/src/components/Bookings.js` — added Create Booking modal/form and environment dropdown.
  - `frontend/src/components/Settings.js` — user admin UI to list, add, and delete users.

**Files changed (representative)**:
- `backend/src/controllers/environmentController.js`
- `backend/src/routes/environmentRoutes.js`
- `backend/src/controllers/authController.js`
- `backend/src/routes/authRoutes.js`
- `frontend/src/lib/api.js`
- `frontend/src/components/Environments.js`
- `frontend/src/components/Bookings.js`
- `frontend/src/components/Settings.js`

(Full diff is available in the branch `feature/configs-crud-ui`.)

**Testing / Verification**:
1. Start services (Docker):

```powershell
./start.sh
# Or
docker-compose up --build
```

2. Open the UI: `http://localhost:3000`
3. Login with demo admin: `admin@testenv.com` / `Admin@123`.
4. Config CRUD (API):
   - Login via POST `/api/auth/login` to get JWT.
   - POST `/api/environments/1/configs` with body `{ "category": "application", "name": "My App", "settings": { ... } }` → should return created config with `id`.
   - GET `/api/environments/1/configs` → should list created config.
   - PUT `/api/environments/1/configs/:id` → updates the config.
   - DELETE `/api/environments/1/configs/:id` → removes the config.

5. Config CRUD (UI):
   - On the Environments page, click `Manage Configs` for an environment.
   - Add a new config (choose category `application|hardware|network`), enter `name`, and JSON fields for `settings` (or use structured fields if provided).
   - Edit and delete an existing config — operations should reflect immediately in the list.

6. User Admin & Booking:
   - Visit Settings → User Admin: list, add and delete users (admin only).
   - Create a Booking via the Bookings modal and validate conflict detection & creation.

**Notes / Implementation details**:
- `environments.configuration` is stored as a JSON column representing an array of configuration objects with the following structure:
  - `id` (number) — generated timestamp-based id
  - `category` (string) — `application|hardware|network`
  - `name` (string)
  - `settings` (object) — category-specific settings
  - `created_by`, `created_at`, `updated_at`

- The backend parsing was hardened to handle either a string or an already-parsed object from the DB and to fallback safely to `[]` if parsing fails.

- Role-based access control enforced on the new endpoints: creating/updating configs is limited to Manager/Admin; deletion restricted to Admin.

**Security & Migration**:
- No DB schema migrations required since `environments.configuration` was already present as a JSON column in the seed schema.
- If your production DB stores different shapes inside `configuration`, confirm all entries are arrays of objects — otherwise use the provided endpoint to normalize data.

**Rollback**:
- Revert branch locally and on remote with:

```powershell
git checkout main
git revert <commit-hash>  # or
git reset --hard origin/main
```

**How to open the PR**:
- Web: visit:
  `https://github.com/aravindksk7/TEMS_new/pull/new/feature/configs-crud-ui` and paste this description into the body.

- gh CLI (if installed):

```powershell
# from repo root
gh pr create --base main --head feature/configs-crud-ui --title "feat(env): add config CRUD, Manage Configs UI, booking and user admin; fix JSON parsing" --body-file PR_DESCRIPTION.md
```

**Review checklist (suggested)**:
- [ ] Backend: validate `environmentController` parsing fix covers all DB cases.
- [ ] Frontend: ensure `Environments` modal handles large lists (pagination if needed).
- [ ] E2E: create/update/delete config flows tested with admin/manager/dev roles.
- [ ] Security: API role checks reviewed.
- [ ] Docs: update `COMPLETE_GUIDE.md` to mention new config endpoints and UI flows.

**Additional notes**:
- I can open the PR for you if you want me to create it automatically via the GitHub API — I will need a GitHub token with `repo` scope, or I can use the `gh` CLI if available.

---

*Generated by pair-programming assistant — branch: `feature/configs-crud-ui`*
