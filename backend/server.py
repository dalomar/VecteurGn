from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timedelta
from bson import ObjectId

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

# Models
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
async def get_ranking(period: Literal["day", "week", "month", "year"] = "day"):
    # Calculate date range based on period
    now = datetime.utcnow()
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:  # year
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get all buses
    buses = await db.buses.find().to_list(1000)
    
    ranking = []
    for bus in buses:
        bus_id = bus["_id"]
        
        # Calculate revenue for this bus in the period
        recettes = await db.transactions.find({
            "busId": bus_id,
            "type": "recette",
            "date": {"$gte": start_date}
        }).to_list(1000)
        
        total_recettes = sum(t["amount"] for t in recettes)
        
        # Calculate target based on period
        if period == "day":
            target = bus["dailyTarget"]
        elif period == "week":
            target = bus["dailyTarget"] * 7
        elif period == "month":
            target = bus["dailyTarget"] * 30
        else:  # year
            target = bus["dailyTarget"] * 365
        
        percentage = (total_recettes / target * 100) if target > 0 else 0
        
        ranking.append({
            "id": str(bus_id),
            "name": bus["name"],
            "registration": bus["registration"],
            "currency": bus["currency"],
            "revenue": total_recettes,
            "target": target,
            "percentage": min(percentage, 999)  # Cap at 999%
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

@api_router.get("/stats/analytics")
async def get_analytics(busId: Optional[str] = None, period: Literal["day", "week", "month"] = "month"):
    # Calculate date range
    now = datetime.utcnow()
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        days_count = 1
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        days_count = 7
    else:  # month
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        days_count = 30
    
    query = {"date": {"$gte": start_date}}
    
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
            "depensesByCategory": depenses_by_category
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
            "comparison": comparison
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
