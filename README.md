# BloodLink — merged full-stack app

One Express server that serves **both** the API and the website — run one command,
open one URL.

```
backend/
├── public/            ← the frontend (plain HTML/CSS/JS), served as static files
│   ├── index.html
│   ├── styles.css
│   ├── api.js
│   └── app.js
└── src/                ← the API (Express + Mongoose)
    ├── index.js         ← serves public/ AND mounts /api/* routes
    ├── models/
    ├── routes/
    ├── middleware/
    ├── lib/
    └── utils/
```

## Run it

```bash
cd backend
cp .env.example .env      # edit MONGO_URI if needed
npm install
npm run seed               # optional: demo donors/camps/requests
npm run dev
```

Then open **http://localhost:5000** in a browser — that's it. The same server
answers both the page (`/`, `/donors`, `/camps`, etc. via the SPA) and the API
(`/api/donors`, `/api/camps`, etc.), so there's no CORS or "is the API running"
step to worry about.

Requires a running MongoDB instance — local `mongod`, Docker, or a free
MongoDB Atlas cluster (set `MONGO_URI` in `.env` accordingly).

## Deploying

Because it's one server, deployment is simpler too: push this whole `backend/`
folder to Render, Railway, Fly.io, or similar, set `MONGO_URI` and `JWT_SECRET`
as environment variables, and the platform's assigned URL serves the entire
site — frontend and API together. No separate GitHub Pages step needed.

## API reference

```
POST   /api/auth/register            POST /api/auth/login       GET  /api/auth/me
GET    /api/donors?bloodGroup&compatible&city&pincode&lat&lng&radius&available&eligible
POST   /api/donors                   GET  /api/donors/:id
PATCH  /api/donors/:id/availability  DELETE /api/donors/:id
GET    /api/camps?scope=upcoming|past&city
POST   /api/camps                    POST /api/camps/:id/register
PATCH  /api/camps/:id                DELETE /api/camps/:id
GET    /api/requests?status          POST /api/requests
PATCH  /api/requests/:id/status
GET    /api/notifications?donorId    PATCH /api/notifications/:id
GET    /api/stats
GET    /api/health
```
