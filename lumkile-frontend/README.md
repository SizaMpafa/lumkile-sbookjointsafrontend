# Lumkile's Book Joint SA: frontend (Vue 3 + Vite)

Talks to the Node/Express API (`VITE_API_URL`). One login page for everyone; the account's role
decides the portal: staff → `/staff/*`, customers → `/shelf`, `/my-visits`, `/my-loans`.

## Run it locally
```bash
npm install
npm run dev          # http://localhost:5173, uses .env.development → API on https://impulsive-shopping-b-f.onrender.com/
```

## Deploy (Vercel)
1. Push this folder to its own GitHub repo → Vercel → *Add New Project* → import it (Vite is auto-detected).
2. Deploy. `.env.production` already points at the Render API; to change it, set `VITE_API_URL` in Vercel's Environment Variables.
3. **Important:** on Render, set the backend's `FRONTEND_URL` to your Vercel address, *first*, then localhost:
   `https://your-app.vercel.app,http://localhost:5173`
   Without it the browser blocks every request (CORS), and the first entry is also the link in the login emails.

## Where things live
| | |
|---|---|
| `src/api.js` | the only file that calls the backend: auth header, automatic token refresh, friendly errors, "server is waking up" detector |
| `src/stores/auth.js` | who is logged in, `must_change_password`, login/logout |
| `src/router.js` | route guards: logged-out → login, temporary password → /account, wrong role → own home |
| `src/views/customer/*` | Shelf, My visits, My loans |
| `src/views/staff/*` | Requests, Catalog, Visitors, Attendance, Accounts |
| `src/styles.css` | design tokens (same colours/fonts as the approved concept) and shared classes |
