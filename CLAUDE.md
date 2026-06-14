# VecteurGN — Instructions Claude

## Présentation

Application de gestion de flotte de bus pour une compagnie de transport en Guinée.
Elle suit les recettes, dépenses, objectifs journaliers et classements par bus.
Les montants sont en **GNF** (Franc Guinéen, grands entiers ~1 000 000) ou **EUR**.

---

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | React Native + Expo Router (tabs), TypeScript |
| État global | Zustand (`frontend/store/index.ts`) |
| Backend | FastAPI (Python) + asyncpg (PostgreSQL) |
| Auth | JWT (HS256, 7 jours) + bcrypt via passlib |
| DB locale | PostgreSQL local (`postgresql://localhost/vecteurgn`) |
| DB production | PostgreSQL cloud (Neon, Supabase, Railway…) |
| Déploiement | Vercel (frontend statique Expo + API Python serverless) |

---

## Structure des fichiers clés

```
frontend/
  app/
    _layout.tsx        — Navigation tabs + AuthProvider + garde de route
    index.tsx          — Dashboard : soldes, classement, actions rapides
    buses.tsx          — CRUD des bus
    transactions.tsx   — Historique des transactions
    analytics.tsx      — Graphiques / analyses
    users.tsx          — Gestion des utilisateurs (admin seulement)
    login.tsx          — Écran de connexion
  store/index.ts       — Store Zustand (buses, transactions, ranking, balances)
  components/
    BusSelector.tsx
    PeriodSelector.tsx

backend/
  server.py            — Toutes les routes FastAPI + pool asyncpg global
  auth.py              — JWT + bcrypt helpers

api/
  index.py             — Entrée Vercel ASGI (importe backend.server.app)

requirements.txt       — Dépendances Python production (pour Vercel)
vercel.json            — Config déploiement Vercel
```

---

## Modèles de données

**Bus** : `id, name, registration, currency (GNF|EUR), dailyTarget (float), staff (JSON array 5 personnes), createdAt`

**Transaction** : `id, busId, type (recette|dépense), category, amount, description, date, createdAt`

**User** : `id, username, password (bcrypt), role (admin|user), createdAt`

Compte admin par défaut : `vecteur` / `vecteurgn`

---

## Accès base de données (asyncpg + PostgreSQL)

Le pool global `pool` est initialisé au démarrage dans `backend/server.py`.
Les colonnes SQL sont en **snake_case** (`bus_id`, `daily_target`, `created_at`) ; les helpers font la conversion vers camelCase pour l'API.

```python
# Lecture d'une ligne
async with pool.acquire() as conn:
    row = await conn.fetchrow("SELECT * FROM buses WHERE id = $1", bus_id)
if not row:
    raise HTTPException(status_code=404)
return bus_helper(_row(row))   # → dict camelCase

# Lecture multiple
async with pool.acquire() as conn:
    rows = await conn.fetch("SELECT * FROM buses")
return [bus_helper(r) for r in _rows(rows)]

# DELETE avec vérification : utiliser RETURNING
async with pool.acquire() as conn:
    deleted = await conn.fetchrow("DELETE FROM buses WHERE id = $1 RETURNING id", bus_id)
if not deleted:
    raise HTTPException(status_code=404)
```

- Paramètres positionnels : `$1, $2, $3…` (pas `?`)
- Pas de `commit()` — auto-commit par défaut avec asyncpg
- `pool.acquire()` comme context manager pour chaque requête

---

## Logique métier importante

- **Classement** : endpoint `/api/stats/ranking?period=day|week|month|year` — retourne `revenue`, `target` (= dailyTarget × jours ouvrés), `percentage` (capé à 999 côté backend)
- **Pourcentage affiché** : calculé côté frontend comme `item.revenue / bus.dailyTarget * 100` — diviser par `bus.dailyTarget`, **jamais** par `item.target` (période scalée)
- **Périodes** : jour (1 jour), semaine (6 jours), mois (jours Mon–Sam), année (312 jours)
- **Soldes** : endpoint `/api/stats/balance-per-bus` — recettes et dépenses ALL TIME (pas filtrées par période)

---

## Design system (dark theme)

| Token | Valeur |
|-------|--------|
| Fond principal | `#0D0F12` |
| Cartes / headers | `#171A1F` |
| Bordures / inputs | `#2B313A` |
| Accent (jaune/or) | `#F4B400` |
| Succès (vert) | `#10B981` |
| Erreur (rouge) | `#EF4444` |
| Texte secondaire | `#A6ABB4` |

---

## Conventions de code

- **Formatage des nombres** : toujours `toLocaleString('fr-FR')` pour montants et pourcentages
- **URL backend** : lue depuis `process.env.EXPO_PUBLIC_BACKEND_URL` (jamais en dur)
- **Langue** : UI en français, code en anglais

---

## Déploiement Vercel

### Variables d'environnement à définir dans Vercel → Settings → Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host/dbname` (Neon, Supabase, Railway…) |
| `SECRET_KEY` | Clé secrète JWT |
| `EXPO_PUBLIC_BACKEND_URL` | URL du projet Vercel (ex: `https://vecteurgn.vercel.app`) |

### Développement local

Fichier `backend/.env` (non commité) :
```
SECRET_KEY=vecteur-gn-secret-key-change-in-production
DATABASE_URL=postgresql://localhost/vecteurgn
```

Fichier `frontend/.env.local` (non commité) :
```
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Lancer en local

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn server:app --reload

# Frontend
cd frontend && yarn install
npx expo start
```

---

## Git

- Branche principale : `develop` (deployée sur Vercel)
- Remote : `orign` (non-standard, pas `origin`)
- Push : `git push orign develop`
