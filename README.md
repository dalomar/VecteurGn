# VecteurGN

Application de gestion de flotte de bus pour une compagnie de transport en Guinée.  
Suivi des recettes, dépenses, objectifs journaliers et classements par bus.  
Montants en **GNF** (Franc Guinéen) ou **EUR**.

---

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | React Native + Expo Router, TypeScript |
| État global | Zustand |
| Backend | FastAPI (Python) + asyncpg |
| Base de données | PostgreSQL (Neon / Supabase / Railway en prod) |
| Auth | JWT HS256 (7 jours) + bcrypt via passlib |
| Déploiement | Docker + Kubernetes **ou** Vercel (frontend statique + API serverless) |

---

## Structure du projet

```
VecteurGN/
├── frontend/                        # App React Native / Expo
│   ├── app/
│   │   ├── _layout.tsx              # Navigation tabs + AuthProvider + garde de route
│   │   ├── index.tsx                # Dashboard : soldes, classement, actions rapides
│   │   ├── buses.tsx                # CRUD des bus
│   │   ├── transactions.tsx         # Historique des transactions
│   │   ├── analytics.tsx            # Graphiques / analyses
│   │   ├── users.tsx                # Gestion utilisateurs (admin seulement)
│   │   └── login.tsx                # Écran de connexion
│   ├── store/
│   │   └── index.ts                 # Store Zustand (buses, transactions, ranking, balances)
│   ├── components/
│   │   ├── BusSelector.tsx
│   │   └── PeriodSelector.tsx
│   ├── Dockerfile                   # Multi-stage : Node 20 build → nginx:alpine
│   ├── nginx.conf                   # SPA routing + gzip
│   └── package.json
│
├── backend/                         # API FastAPI
│   ├── server.py                    # Toutes les routes + pool asyncpg global
│   ├── auth.py                      # JWT + bcrypt helpers
│   ├── requirements.txt             # Dépendances dev (inclut pandas, pytest…)
│   └── Dockerfile                   # Image Python 3.12-slim (build depuis la racine)
│
├── api/
│   └── index.py                     # Entrée Vercel ASGI (importe backend.server.app)
│
├── k8s/                             # Manifests Kubernetes
│   ├── 00-namespace.yaml            # Namespace vecteurgn
│   ├── 01-secrets.yaml              # DATABASE_URL, SECRET_KEY, POSTGRES_PASSWORD
│   ├── 02-postgres.yaml             # StatefulSet Postgres 16 + PVC 5Gi + Service
│   ├── 03-backend.yaml              # Deployment FastAPI (2 replicas) + Service
│   ├── 04-frontend.yaml             # Deployment nginx/Expo (2 replicas) + Service
│   └── 05-ingress.yaml              # Ingress nginx : /api/* → backend, /* → frontend
│
├── requirements.txt                 # Dépendances Python production (lean, pour Vercel/Docker)
├── vercel.json                      # Config déploiement Vercel
├── .vercelignore                    # Exclut backend/requirements.txt du bundle Lambda
├── docker-compose.yml               # Stack locale : Postgres + backend + frontend
└── CLAUDE.md                        # Instructions pour Claude Code
```

---

## Modèles de données

**Bus** — `id, name, registration, currency (GNF|EUR), daily_target, staff (JSON), created_at`

**Transaction** — `id, bus_id, type (recette|depense), category, amount, description, date, created_at`

**User** — `id, username, password (bcrypt), role (admin|user), created_at`

Compte admin par défaut : `vecteur` / `vecteurgn`

---

## Lancer en local

### Option 1 — Docker Compose (recommandé)

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

### Option 2 — Manuel

```bash
# PostgreSQL requis en local (createdb vecteurgn)

# Backend
cd backend
pip install -r requirements.txt
# Créer backend/.env :
#   DATABASE_URL=postgresql://localhost/vecteurgn
#   SECRET_KEY=vecteur-gn-secret-key-change-in-production
uvicorn server:app --reload

# Frontend (dans un autre terminal)
cd frontend
yarn install
# Créer frontend/.env.local :
#   EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
npx expo start
```

---

## Déploiement Kubernetes

### 1. Builder et pousser les images

```bash
# Backend (build depuis la racine du projet)
docker build -f backend/Dockerfile -t ghcr.io/MON_ORG/vecteurgn-backend:latest .
docker push ghcr.io/MON_ORG/vecteurgn-backend:latest

# Frontend (EXPO_PUBLIC_BACKEND_URL = URL publique de l'API)
docker build \
  -f frontend/Dockerfile \
  --build-arg EXPO_PUBLIC_BACKEND_URL=https://api.mon-domaine.com \
  -t ghcr.io/MON_ORG/vecteurgn-frontend:latest \
  ./frontend
docker push ghcr.io/MON_ORG/vecteurgn-frontend:latest
```

### 2. Configurer les secrets

Éditer `k8s/01-secrets.yaml` — remplacer les `CHANGE_ME` :

```yaml
stringData:
  DATABASE_URL: "postgresql://vecteur:MOT_DE_PASSE@postgres:5432/vecteurgn"
  SECRET_KEY: "cle-jwt-secrete-forte"
  POSTGRES_PASSWORD: "MOT_DE_PASSE"
```

Mettre à jour les noms d'images dans `k8s/03-backend.yaml` et `k8s/04-frontend.yaml`,
et le domaine dans `k8s/05-ingress.yaml`.

### 3. Appliquer sur le cluster

```bash
kubectl apply -f k8s/
```

> Prérequis : `nginx-ingress-controller` installé sur le cluster.

---

## Déploiement Vercel (frontend statique + API serverless)

Variables à définir dans Vercel → Settings → Environment Variables :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | `postgresql://user:pass@host/dbname` |
| `SECRET_KEY` | Clé JWT secrète |
| `EXPO_PUBLIC_BACKEND_URL` | URL du projet Vercel (ex: `https://vecteurgn.vercel.app`) |

> Note : la Lambda Python Vercel a une limite de 250 MB. Préférer Kubernetes ou Railway pour le backend si les dépendances dépassent cette limite.

---

## API — Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion, retourne JWT |
| GET | `/api/auth/me` | Profil utilisateur connecté |
| GET/POST | `/api/buses` | Liste / création de bus |
| GET/PUT/DELETE | `/api/buses/{id}` | Détail / modification / suppression |
| GET/POST | `/api/transactions` | Liste / création de transactions |
| GET | `/api/stats/ranking?period=day\|week\|month\|year` | Classement des bus |
| GET | `/api/stats/balance-per-bus` | Soldes ALL TIME par bus |
| GET | `/api/stats/balance` | Solde global GNF + EUR |
| GET | `/api/stats/analytics` | Analyse par catégorie |

---

## Git

- Branche principale : `develop`
- Remote : `orign` (non-standard)
- Push : `git push orign develop`
