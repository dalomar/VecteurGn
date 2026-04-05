📊 Gestion des Données
Base de Données: MongoDB
Type: Base de données NoSQL (orientée documents)
Stockage: Les données sont persistées sur disque dans MongoDB
Localisation: Base de données MongoDB locale dans l'environnement Docker
Collections:
buses - Stocke tous vos bus (nom, immatriculation, objectifs, personnel, etc.)
transactions - Stocke toutes vos recettes et dépenses
💾 Vos données sont SÉCURISÉES:
✅ Persistantes - Stockées sur disque (pas en mémoire) ✅ Ne seront PAS perdues au redémarrage de l'application ✅ Sauvegardées tant que le service MongoDB fonctionne

🛠️ Technologies Utilisées
Backend (Serveur API):
Framework: FastAPI (Python 3.11)
Base de données: MongoDB avec driver motor (async)
Port: 8001
Endpoints: API REST avec /api/*
Fichier principal: /app/backend/server.py

Frontend (Application Mobile):
Framework: Expo React Native
Langage: TypeScript + JavaScript
Navigation: Expo Router (file-based routing)
State Management: Zustand
Graphiques: react-native-gifted-charts
Notifications: react-native-toast-message
Port: 3000
Structure: /app/frontend/app/ (toutes vos pages)

📁 Structure de Stockage
MongoDB (Base de données)
├── Collection "buses"
│   ├── Bus Express 1
│   ├── Bus Express 2
│   └── Bus Test Objectif
│
└── Collection "transactions"
    ├── Recette - Billets - Bus Express 1
    ├── Dépense - Carburant - Bus Express 1
    └── ... (toutes vos transactions)
Format des documents MongoDB:
Bus:

{
  "_id": ObjectId("..."),
  "name": "Bus Express 1",
  "registration": "AB-1234-CD",
  "currency": "GNF",
  "dailyTarget": 1000000,
  "staff": ["Amadou", "Mariama", ...],
  "createdAt": "2026-04-05T10:10:26Z"
}
Transaction:

{
  "_id": ObjectId("..."),
  "busId": ObjectId("..."),
  "type": "recette",
  "category": "billets",
  "amount": 1000000,
  "description": "Vente journée complète",
  "date": "2026-04-05T10:10:41Z"
}
🔒 Garantie de Persistance
Vos données sont 100% sauvegardées car:

MongoDB écrit les données sur le disque dur
Les données survivent aux redémarrages du serveur
Collections indexées pour performance optimale
Configuration MongoDB: /app/backend/.env

MONGO_URL=mongodb://localhost:27017
DB_NAME=vecteur_gn
🚀 En Résumé:
Aspect	Technologie
Backend	FastAPI (Python)
Frontend	Expo React Native (TypeScript)
Base de données	MongoDB (NoSQL)
Stockage	Persistant sur disque
API	REST API (/api/*)
État	Zustand + React Hooks
Vos données sont sûres et ne seront jamais perdues! 🛡️
