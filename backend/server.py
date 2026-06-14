from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import asyncpg
import os
import logging
import json
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timedelta
import calendar
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

DATABASE_URL = os.environ.get('DATABASE_URL')

pool: asyncpg.Pool = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ── DB row helpers ────────────────────────────────────────────────────────────

def _row(record) -> dict:
    return dict(record)

def _rows(records) -> List[dict]:
    return [dict(r) for r in records]


# ── Domain helpers ────────────────────────────────────────────────────────────

def bus_helper(bus: dict) -> dict:
    staff = bus["staff"]
    if isinstance(staff, str):
        staff = json.loads(staff)
    created_at = bus["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    return {
        "id": bus["id"],
        "name": bus["name"],
        "registration": bus["registration"],
        "currency": bus["currency"],
        "dailyTarget": bus["daily_target"],
        "staff": staff,
        "createdAt": created_at,
    }


def transaction_helper(t: dict) -> dict:
    date = t["date"]
    created_at = t["created_at"]
    if isinstance(date, str):
        date = datetime.fromisoformat(date)
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    return {
        "id": t["id"],
        "busId": t["bus_id"],
        "type": t["type"],
        "category": t["category"],
        "amount": t["amount"],
        "description": t.get("description") or "",
        "date": date,
        "createdAt": created_at,
    }


def user_helper(u: dict) -> dict:
    created_at = u["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    return {
        "id": u["id"],
        "username": u["username"],
        "role": u["role"],
        "createdAt": created_at,
    }


# ── Models ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str
    role: Literal["admin", "user"] = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    createdAt: datetime

class UserUpdate(BaseModel):
    role: Literal["admin", "user"]

class BusCreate(BaseModel):
    name: str
    registration: str
    currency: Literal["GNF", "EUR"]
    dailyTarget: float
    staff: List[str] = Field(default_factory=lambda: ["", "", "", "", ""])

class Bus(BaseModel):
    id: str
    name: str
    registration: str
    currency: Literal["GNF", "EUR"]
    dailyTarget: float
    staff: List[str]
    createdAt: datetime

class TransactionCreate(BaseModel):
    busId: str
    type: Literal["recette", "depense"]
    category: str
    amount: float
    description: Optional[str] = ""
    date: datetime = Field(default_factory=datetime.utcnow)

class Transaction(BaseModel):
    id: str
    busId: str
    type: Literal["recette", "depense"]
    category: str
    amount: float
    description: str
    date: datetime
    createdAt: datetime


# ── Startup / init DB ─────────────────────────────────────────────────────────

@app.on_event("startup")
async def init_db():
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL)

    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS buses (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                registration TEXT NOT NULL,
                currency TEXT NOT NULL,
                daily_target FLOAT NOT NULL,
                staff TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                bus_id TEXT NOT NULL,
                type TEXT NOT NULL,
                category TEXT NOT NULL,
                amount FLOAT NOT NULL,
                description TEXT DEFAULT '',
                date TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (bus_id) REFERENCES buses(id)
            )
        """)

        row = await conn.fetchrow("SELECT id FROM users WHERE username = 'vecteur'")
        if not row:
            await conn.execute(
                "INSERT INTO users (id, username, password, role, created_at) VALUES ($1, $2, $3, $4, $5)",
                str(uuid.uuid4()), "vecteur", get_password_hash("vecteurgn"), "admin", datetime.utcnow().isoformat()
            )
            logger.info("Default admin user created: vecteur")


# ── Auth Routes ───────────────────────────────────────────────────────────────

@api_router.post("/auth/login")
async def login(user_login: UserLogin):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE username = $1", user_login.username)

    if not row or not verify_password(user_login.password, row["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username ou mot de passe incorrect"
        )
    user = _row(row)
    access_token = create_access_token(
        data={"sub": user_login.username, "role": user["role"], "id": user["id"]}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_helper(user)
    }


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE username = $1", current_user["sub"])
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return user_helper(_row(row))


# ── User Management (Admin) ───────────────────────────────────────────────────

@api_router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, current_user: dict = Depends(require_admin)):
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM users WHERE username = $1", user.username)
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")

        new_id = str(uuid.uuid4())
        await conn.execute(
            "INSERT INTO users (id, username, password, role, created_at) VALUES ($1, $2, $3, $4, $5)",
            new_id, user.username, get_password_hash(user.password), user.role, datetime.utcnow().isoformat()
        )
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", new_id)
    return user_helper(_row(row))


@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_admin)):
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM users")
    return [user_helper(r) for r in _rows(rows)]


@api_router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(user_id: str, user_update: UserUpdate, current_user: dict = Depends(require_admin)):
    if current_user.get("id") == user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    async with pool.acquire() as conn:
        await conn.execute("UPDATE users SET role = $1 WHERE id = $2", user_update.role, user_id)
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return user_helper(_row(row))


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    if current_user.get("id") == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    async with pool.acquire() as conn:
        deleted = await conn.fetchrow("DELETE FROM users WHERE id = $1 RETURNING id", user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}


# ── Bus Routes ────────────────────────────────────────────────────────────────

@api_router.post("/buses", response_model=Bus)
async def create_bus(bus: BusCreate):
    new_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO buses (id, name, registration, currency, daily_target, staff, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            new_id, bus.name, bus.registration, bus.currency, bus.dailyTarget,
            json.dumps(bus.staff), datetime.utcnow().isoformat()
        )
        row = await conn.fetchrow("SELECT * FROM buses WHERE id = $1", new_id)
    return bus_helper(_row(row))


@api_router.get("/buses", response_model=List[Bus])
async def get_buses():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM buses")
    return [bus_helper(r) for r in _rows(rows)]


@api_router.get("/buses/{bus_id}", response_model=Bus)
async def get_bus(bus_id: str):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM buses WHERE id = $1", bus_id)
    if not row:
        raise HTTPException(status_code=404, detail="Bus non trouvé")
    return bus_helper(_row(row))


@api_router.put("/buses/{bus_id}", response_model=Bus)
async def update_bus(bus_id: str, bus: BusCreate):
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE buses SET name=$1, registration=$2, currency=$3, daily_target=$4, staff=$5 WHERE id=$6",
            bus.name, bus.registration, bus.currency, bus.dailyTarget, json.dumps(bus.staff), bus_id
        )
        row = await conn.fetchrow("SELECT * FROM buses WHERE id = $1", bus_id)
    if not row:
        raise HTTPException(status_code=404, detail="Bus non trouvé")
    return bus_helper(_row(row))


@api_router.delete("/buses/{bus_id}")
async def delete_bus(bus_id: str):
    async with pool.acquire() as conn:
        deleted = await conn.fetchrow("DELETE FROM buses WHERE id = $1 RETURNING id", bus_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Bus non trouvé")
        await conn.execute("DELETE FROM transactions WHERE bus_id = $1", bus_id)
    return {"message": "Bus supprimé avec succès"}


# ── Transaction Routes ────────────────────────────────────────────────────────

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    async with pool.acquire() as conn:
        check = await conn.fetchrow("SELECT id FROM buses WHERE id = $1", transaction.busId)
        if not check:
            raise HTTPException(status_code=404, detail="Bus non trouvé")

        new_id = str(uuid.uuid4())
        date_str = transaction.date.isoformat()
        await conn.execute(
            "INSERT INTO transactions (id, bus_id, type, category, amount, description, date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            new_id, transaction.busId, transaction.type, transaction.category,
            transaction.amount, transaction.description or "", date_str, datetime.utcnow().isoformat()
        )
        row = await conn.fetchrow("SELECT * FROM transactions WHERE id = $1", new_id)
    return transaction_helper(_row(row))


@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(busId: Optional[str] = None, type: Optional[str] = None):
    conditions = []
    params = []
    if busId:
        params.append(busId)
        conditions.append(f"bus_id = ${len(params)}")
    if type:
        params.append(type)
        conditions.append(f"type = ${len(params)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"SELECT * FROM transactions {where} ORDER BY date DESC"
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    return [transaction_helper(r) for r in _rows(rows)]


@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM transactions WHERE id = $1", transaction_id)
    if not row:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    return transaction_helper(_row(row))


@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, transaction: TransactionCreate):
    date_str = transaction.date.isoformat()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE transactions SET bus_id=$1, type=$2, category=$3, amount=$4, description=$5, date=$6 WHERE id=$7",
            transaction.busId, transaction.type, transaction.category,
            transaction.amount, transaction.description or "", date_str, transaction_id
        )
        row = await conn.fetchrow("SELECT * FROM transactions WHERE id = $1", transaction_id)
    if not row:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    return transaction_helper(_row(row))


@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    async with pool.acquire() as conn:
        deleted = await conn.fetchrow("DELETE FROM transactions WHERE id = $1 RETURNING id", transaction_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    return {"message": "Transaction supprimée avec succès"}


# ── Stats Routes ──────────────────────────────────────────────────────────────

@api_router.get("/stats/ranking")
async def get_ranking(
    period: Literal["day", "week", "month", "year"] = "day",
    year: Optional[int] = None,
    month: Optional[int] = None,
    week: Optional[int] = None
):
    now = datetime.utcnow()
    target_year = year if year else now.year
    target_month = month if month else now.month

    if period == "day":
        start_date = datetime(target_year, target_month, now.day, 0, 0, 0)
        end_date = start_date + timedelta(days=1)
        days_in_period = 1
    elif period == "week":
        if week:
            first_day = datetime(target_year, target_month, 1)
            start_date = first_day + timedelta(weeks=week - 1)
            end_date = start_date + timedelta(days=7)
        else:
            start_date = now - timedelta(days=now.weekday())
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=7)
        days_in_period = 6
    elif period == "month":
        start_date = datetime(target_year, target_month, 1, 0, 0, 0)
        last_day = calendar.monthrange(target_year, target_month)[1]
        end_date = datetime(target_year, target_month, last_day, 23, 59, 59)
        days_in_period = sum(
            1 for d in range(1, last_day + 1)
            if datetime(target_year, target_month, d).weekday() < 6
        )
    else:  # year
        start_date = datetime(target_year, 1, 1, 0, 0, 0)
        end_date = datetime(target_year, 12, 31, 23, 59, 59)
        days_in_period = 312

    start_str = start_date.isoformat()
    end_str = end_date.isoformat()

    async with pool.acquire() as conn:
        buses = _rows(await conn.fetch("SELECT * FROM buses"))
        ranking = []
        for bus in buses:
            recettes_rows = await conn.fetch(
                "SELECT amount FROM transactions WHERE bus_id=$1 AND type='recette' AND date >= $2 AND date < $3",
                bus["id"], start_str, end_str
            )
            total_recettes = sum(r["amount"] for r in recettes_rows)
            target = bus["daily_target"] * days_in_period
            percentage = (total_recettes / target * 100) if target > 0 else 0

            ranking.append({
                "id": bus["id"],
                "name": bus["name"],
                "registration": bus["registration"],
                "currency": bus["currency"],
                "revenue": total_recettes,
                "target": target,
                "percentage": min(percentage, 999),
                "period_info": {
                    "year": target_year,
                    "month": target_month if period in ["month", "week"] else None,
                    "week": week if period == "week" else None,
                    "working_days": days_in_period,
                }
            })

    ranking.sort(key=lambda x: x["revenue"], reverse=True)
    return ranking


@api_router.get("/stats/balance")
async def get_total_balance():
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT t.type, t.amount, b.currency
            FROM transactions t
            JOIN buses b ON t.bus_id = b.id
        """)

    balance_gnf = 0.0
    balance_eur = 0.0
    for row in rows:
        amount = row["amount"]
        if row["type"] == "recette":
            if row["currency"] == "GNF":
                balance_gnf += amount
            else:
                balance_eur += amount
        else:
            if row["currency"] == "GNF":
                balance_gnf -= amount
            else:
                balance_eur -= amount

    return {"GNF": balance_gnf, "EUR": balance_eur}


@api_router.get("/stats/balance-per-bus")
async def get_balance_per_bus():
    async with pool.acquire() as conn:
        buses = _rows(await conn.fetch("SELECT * FROM buses"))
        balances = []
        for bus in buses:
            rows = await conn.fetch(
                "SELECT type, amount FROM transactions WHERE bus_id = $1", bus["id"]
            )
            total_recettes = sum(r["amount"] for r in rows if r["type"] == "recette")
            total_depenses = sum(r["amount"] for r in rows if r["type"] == "depense")
            balances.append({
                "id": bus["id"],
                "name": bus["name"],
                "currency": bus["currency"],
                "recettes": total_recettes,
                "depenses": total_depenses,
                "balance": total_recettes - total_depenses,
            })
    return balances


@api_router.get("/stats/analytics")
async def get_analytics(
    busId: Optional[str] = None,
    period: Literal["day", "week", "month", "year"] = "month",
    year: Optional[int] = None,
    month: Optional[int] = None,
    week: Optional[int] = None
):
    now = datetime.utcnow()
    target_year = year if year else now.year
    target_month = month if month else now.month

    if period == "day":
        start_date = datetime(target_year, target_month, now.day if not year and not month else 1, 0, 0, 0)
        end_date = start_date + timedelta(days=1)
    elif period == "week":
        if week and month:
            first_day = datetime(target_year, target_month, 1)
            start_date = first_day + timedelta(weeks=week - 1)
            end_date = start_date + timedelta(days=7)
        else:
            start_date = now - timedelta(days=now.weekday())
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=7)
    elif period == "month":
        start_date = datetime(target_year, target_month, 1, 0, 0, 0)
        last_day = calendar.monthrange(target_year, target_month)[1]
        end_date = datetime(target_year, target_month, last_day, 23, 59, 59)
    else:  # year
        start_date = datetime(target_year, 1, 1, 0, 0, 0)
        end_date = datetime(target_year, 12, 31, 23, 59, 59)

    start_str = start_date.isoformat()
    end_str = end_date.isoformat()

    async with pool.acquire() as conn:
        if busId:
            rows = await conn.fetch(
                "SELECT type, category, amount FROM transactions WHERE bus_id=$1 AND date >= $2 AND date < $3",
                busId, start_str, end_str
            )
            recettes_by_category: dict = {}
            depenses_by_category: dict = {}
            total_recettes = 0.0
            total_depenses = 0.0

            for t in rows:
                if t["type"] == "recette":
                    total_recettes += t["amount"]
                    recettes_by_category[t["category"]] = recettes_by_category.get(t["category"], 0) + t["amount"]
                else:
                    total_depenses += t["amount"]
                    depenses_by_category[t["category"]] = depenses_by_category.get(t["category"], 0) + t["amount"]

            return {
                "busId": busId,
                "period": period,
                "totalRecettes": total_recettes,
                "totalDepenses": total_depenses,
                "recettesByCategory": recettes_by_category,
                "depensesByCategory": depenses_by_category,
                "period_info": {
                    "year": target_year,
                    "month": target_month if period in ["month", "week", "day"] else None,
                    "week": week if period == "week" else None,
                }
            }
        else:
            buses = _rows(await conn.fetch("SELECT * FROM buses"))
            comparison = []
            for bus in buses:
                rows = await conn.fetch(
                    "SELECT type, amount FROM transactions WHERE bus_id=$1 AND date >= $2 AND date < $3",
                    bus["id"], start_str, end_str
                )
                total_recettes = sum(t["amount"] for t in rows if t["type"] == "recette")
                total_depenses = sum(t["amount"] for t in rows if t["type"] == "depense")
                comparison.append({
                    "id": bus["id"],
                    "name": bus["name"],
                    "currency": bus["currency"],
                    "recettes": total_recettes,
                    "depenses": total_depenses,
                    "balance": total_recettes - total_depenses,
                })

            return {
                "period": period,
                "comparison": comparison,
                "period_info": {
                    "year": target_year,
                    "month": target_month if period in ["month", "week", "day"] else None,
                    "week": week if period == "week" else None,
                }
            }


# ── App setup ─────────────────────────────────────────────────────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    if pool:
        await pool.close()
