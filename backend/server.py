from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timedelta
import calendar
from bson import ObjectId
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    get_current_user,
    require_admin
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper function to convert ObjectId to string
def bus_helper(bus) -> dict:
    return {
        "id": str(bus["_id"]),
        "name": bus["name"],
        "registration": bus["registration"],
        "currency": bus["currency"],
        "dailyTarget": bus["dailyTarget"],
        "staff": bus["staff"],
        "createdAt": bus.get("createdAt", datetime.utcnow())
    }

def transaction_helper(transaction) -> dict:
    return {
        "id": str(transaction["_id"]),
        "busId": str(transaction["busId"]),
        "type": transaction["type"],
        "category": transaction["category"],
        "amount": transaction["amount"],
        "description": transaction.get("description", ""),
        "date": transaction["date"],
        "createdAt": transaction.get("createdAt", datetime.utcnow())
    }

def user_helper(user) -> dict:
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "role": user["role"],
        "createdAt": user.get("createdAt", datetime.utcnow())
    }

# Models
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
    category: str  # For recettes: billets/location/autres, For dépenses: carburant/entretien/assurance/salaires/autres
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

# Initialize default admin user on startup
@app.on_event("startup")
async def create_default_admin():
    # Check if admin user exists
    admin = await db.users.find_one({"username": "vecteur"})
    if not admin:
        # Create default admin
        hashed_password = get_password_hash("vecteurgn")
        await db.users.insert_one({
            "username": "vecteur",
            "password": hashed_password,
            "role": "admin",
            "createdAt": datetime.utcnow()
        })
        logger.info("Default admin user created: vecteur")

# Authentication Routes
@api_router.post("/auth/login")
async def login(user_login: UserLogin):
    # Find user
    user = await db.users.find_one({"username": user_login.username})
    if not user or not verify_password(user_login.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username ou mot de passe incorrect"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user_login.username, "role": user["role"], "id": str(user["_id"])}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_helper(user)
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"username": current_user["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_helper(user)

# User Management Routes (Admin only)
@api_router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, current_user: dict = Depends(require_admin)):
    # Check if username exists
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password
    hashed_password = get_password_hash(user.password)
    
    # Create user
    user_dict = {
        "username": user.username,
        "password": hashed_password,
        "role": user.role,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    new_user = await db.users.find_one({"_id": result.inserted_id})
    return user_helper(new_user)

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_admin)):
    users = await db.users.find().to_list(1000)
    return [user_helper(user) for user in users]

@api_router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(user_id: str, user_update: UserUpdate, current_user: dict = Depends(require_admin)):
    # Don't allow changing own role
    if str(current_user["id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    # Update user
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": user_update.role}}
    )
    
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_helper(updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    # Don't allow deleting yourself
    if str(current_user["id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# Bus Routes
@api_router.post("/buses", response_model=Bus)
async def create_bus(bus: BusCreate):
    bus_dict = bus.dict()
    bus_dict["createdAt"] = datetime.utcnow()
    result = await db.buses.insert_one(bus_dict)
    new_bus = await db.buses.find_one({"_id": result.inserted_id})
    return bus_helper(new_bus)

@api_router.get("/buses", response_model=List[Bus])
async def get_buses():
    buses = await db.buses.find().to_list(1000)
    return [bus_helper(bus) for bus in buses]

@api_router.get("/buses/{bus_id}", response_model=Bus)
async def get_bus(bus_id: str):
    bus = await db.buses.find_one({"_id": ObjectId(bus_id)})
    if not bus:
        raise HTTPException(status_code=404, detail="Bus non trouvé")
    return bus_helper(bus)

@api_router.put("/buses/{bus_id}", response_model=Bus)
async def update_bus(bus_id: str, bus: BusCreate):
    bus_dict = bus.dict()
    await db.buses.update_one({"_id": ObjectId(bus_id)}, {"$set": bus_dict})
    updated_bus = await db.buses.find_one({"_id": ObjectId(bus_id)})
    if not updated_bus:
        raise HTTPException(status_code=404, detail="Bus non trouvé")
    return bus_helper(updated_bus)

@api_router.delete("/buses/{bus_id}")
async def delete_bus(bus_id: str):
    result = await db.buses.delete_one({"_id": ObjectId(bus_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bus non trouvé")
    # Also delete all transactions for this bus
    await db.transactions.delete_many({"busId": ObjectId(bus_id)})
    return {"message": "Bus supprimé avec succès"}

# Transaction Routes
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    # Verify bus exists
    bus = await db.buses.find_one({"_id": ObjectId(transaction.busId)})
    if not bus:
        raise HTTPException(status_code=404, detail="Bus non trouvé")
    
    transaction_dict = transaction.dict()
    transaction_dict["busId"] = ObjectId(transaction.busId)
    transaction_dict["createdAt"] = datetime.utcnow()
    result = await db.transactions.insert_one(transaction_dict)
    new_transaction = await db.transactions.find_one({"_id": result.inserted_id})
    return transaction_helper(new_transaction)

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(busId: Optional[str] = None, type: Optional[str] = None):
    query = {}
    if busId:
        query["busId"] = ObjectId(busId)
    if type:
        query["type"] = type
    
    transactions = await db.transactions.find(query).sort("date", -1).to_list(1000)
    return [transaction_helper(transaction) for transaction in transactions]

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    transaction = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    return transaction_helper(transaction)

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, transaction: TransactionCreate):
    transaction_dict = transaction.dict()
    transaction_dict["busId"] = ObjectId(transaction.busId)
    await db.transactions.update_one({"_id": ObjectId(transaction_id)}, {"$set": transaction_dict})
    updated_transaction = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    if not updated_transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    return transaction_helper(updated_transaction)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"_id": ObjectId(transaction_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    return {"message": "Transaction supprimée avec succès"}

# Statistics Routes
@api_router.get("/stats/ranking")
async def get_ranking(
    period: Literal["day", "week", "month", "year"] = "day",
    year: Optional[int] = None,
    month: Optional[int] = None,
    week: Optional[int] = None
):
    """
    Get bus ranking for a specific period.
    - period: day, week, month, year
    - year: specific year (default: current year)
    - month: specific month 1-12 (for month/week period)
    - week: specific week number in month 1-5 (for week period)
    
    Note: Buses work Monday-Saturday (6 days/week)
    """
    from datetime import datetime, timedelta
    import calendar
    
    # Use current date if not specified
    now = datetime.utcnow()
    target_year = year if year else now.year
    target_month = month if month else now.month
    
    if period == "day":
        # Today or specific date
        start_date = datetime(target_year, target_month, now.day, 0, 0, 0)
        end_date = start_date + timedelta(days=1)
        days_in_period = 1
    elif period == "week":
        # Specific week of month
        if week:
            # Get first day of month
            first_day = datetime(target_year, target_month, 1)
            # Calculate start of specific week
            start_date = first_day + timedelta(weeks=week-1)
            end_date = start_date + timedelta(days=7)
            days_in_period = 6  # Monday-Saturday
        else:
            # Current week
            start_date = now - timedelta(days=now.weekday())
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=7)
            days_in_period = 6
    elif period == "month":
        # Specific month
        start_date = datetime(target_year, target_month, 1, 0, 0, 0)
        # Last day of month
        last_day = calendar.monthrange(target_year, target_month)[1]
        end_date = datetime(target_year, target_month, last_day, 23, 59, 59)
        # Count working days (Mon-Sat) in month
        days_in_period = 0
        current = start_date
        while current <= end_date:
            if current.weekday() < 6:  # Monday=0 to Saturday=5
                days_in_period += 1
            current += timedelta(days=1)
    else:  # year
        start_date = datetime(target_year, 1, 1, 0, 0, 0)
        end_date = datetime(target_year, 12, 31, 23, 59, 59)
        # 52 weeks * 6 days = 312 working days per year
        days_in_period = 312
    
    # Get all buses
    buses = await db.buses.find().to_list(1000)
    
    ranking = []
    for bus in buses:
        bus_id = bus["_id"]
        
        # Calculate revenue for this bus in the period
        recettes = await db.transactions.find({
            "busId": bus_id,
            "type": "recette",
            "date": {"$gte": start_date, "$lt": end_date}
        }).to_list(1000)
        
        total_recettes = sum(t["amount"] for t in recettes)
        
        # Calculate target based on working days (Monday-Saturday)
        target = bus["dailyTarget"] * days_in_period
        
        percentage = (total_recettes / target * 100) if target > 0 else 0
        
        ranking.append({
            "id": str(bus_id),
            "name": bus["name"],
            "registration": bus["registration"],
            "currency": bus["currency"],
            "revenue": total_recettes,
            "target": target,
            "percentage": min(percentage, 999),  # Cap at 999%
            "period_info": {
                "year": target_year,
                "month": target_month if period in ["month", "week"] else None,
                "week": week if period == "week" else None,
                "working_days": days_in_period
            }
        })
    
    # Sort by revenue descending
    ranking.sort(key=lambda x: x["revenue"], reverse=True)
    
    return ranking

@api_router.get("/stats/balance")
async def get_total_balance():
    # Get all transactions
    transactions = await db.transactions.find().to_list(10000)
    
    balance_gnf = 0
    balance_eur = 0
    
    for transaction in transactions:
        bus = await db.buses.find_one({"_id": transaction["busId"]})
        if bus:
            currency = bus["currency"]
            amount = transaction["amount"]
            
            if transaction["type"] == "recette":
                if currency == "GNF":
                    balance_gnf += amount
                else:
                    balance_eur += amount
            else:  # depense
                if currency == "GNF":
                    balance_gnf -= amount
                else:
                    balance_eur -= amount
    
    return {
        "GNF": balance_gnf,
        "EUR": balance_eur
    }

@api_router.get("/stats/balance-per-bus")
async def get_balance_per_bus():
    # Get all buses
    buses = await db.buses.find().to_list(1000)
    
    balances = []
    for bus in buses:
        bus_id = bus["_id"]
        
        # Get all transactions for this bus
        transactions = await db.transactions.find({"busId": bus_id}).to_list(1000)
        
        total_recettes = sum(t["amount"] for t in transactions if t["type"] == "recette")
        total_depenses = sum(t["amount"] for t in transactions if t["type"] == "depense")
        balance = total_recettes - total_depenses
        
        balances.append({
            "id": str(bus_id),
            "name": bus["name"],
            "currency": bus["currency"],
            "recettes": total_recettes,
            "depenses": total_depenses,
            "balance": balance
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
    """
    Get analytics data for charts.
    Supports specific periods with year/month/week parameters.
    """
    import calendar
    
    # Calculate date range
    now = datetime.utcnow()
    target_year = year if year else now.year
    target_month = month if month else now.month
    
    if period == "day":
        start_date = datetime(target_year, target_month, now.day if not year and not month else 1, 0, 0, 0)
        end_date = start_date + timedelta(days=1)
    elif period == "week":
        if week and month:
            # Specific week of month
            first_day = datetime(target_year, target_month, 1)
            start_date = first_day + timedelta(weeks=week-1)
            end_date = start_date + timedelta(days=7)
        else:
            # Current week
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
    
    query = {"date": {"$gte": start_date, "$lt": end_date}}
    
    if busId:
        # Analytics for specific bus
        query["busId"] = ObjectId(busId)
        transactions = await db.transactions.find(query).to_list(1000)
        
        recettes_by_category = {}
        depenses_by_category = {}
        total_recettes = 0
        total_depenses = 0
        
        for t in transactions:
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
                "week": week if period == "week" else None
            }
        }
    else:
        # Comparison of all buses
        buses = await db.buses.find().to_list(1000)
        comparison = []
        
        for bus in buses:
            bus_id = bus["_id"]
            query_bus = query.copy()
            query_bus["busId"] = bus_id
            
            transactions = await db.transactions.find(query_bus).to_list(1000)
            
            total_recettes = sum(t["amount"] for t in transactions if t["type"] == "recette")
            total_depenses = sum(t["amount"] for t in transactions if t["type"] == "depense")
            
            comparison.append({
                "id": str(bus_id),
                "name": bus["name"],
                "currency": bus["currency"],
                "recettes": total_recettes,
                "depenses": total_depenses,
                "balance": total_recettes - total_depenses
            })
        
        return {
            "period": period,
            "comparison": comparison,
            "period_info": {
                "year": target_year,
                "month": target_month if period in ["month", "week", "day"] else None,
                "week": week if period == "week" else None
            }
        }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
