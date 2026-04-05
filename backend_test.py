#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for Vecteur GN Bus Fleet Management
Tests all CRUD operations and statistics endpoints
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Backend URL from environment
BACKEND_URL = "https://vecteur-gn.preview.emergentagent.com/api"

class VecteurGNAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.created_buses = []
        self.created_transactions = []
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None) -> tuple:
        """Make HTTP request and return response and success status"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        try:
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, timeout=10)
            else:
                return None, False
                
            return response, True
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None, False
    
    def test_bus_crud_operations(self):
        """Test all bus CRUD operations"""
        print("\n=== Testing Bus Management API ===")
        
        # Test 1: Create buses with different currencies
        bus_data_gnf = {
            "name": "Bus Conakry Express",
            "registration": "GN-001-CKY",
            "currency": "GNF",
            "dailyTarget": 500000.0,
            "staff": ["Mamadou Diallo", "Fatoumata Camara", "Alpha Barry", "", ""]
        }
        
        bus_data_eur = {
            "name": "Bus International",
            "registration": "GN-002-INT",
            "currency": "EUR",
            "dailyTarget": 50.0,
            "staff": ["Jean Dupont", "Marie Martin", "", "", ""]
        }
        
        # Create GNF bus
        response, success = self.make_request("POST", "/buses", bus_data_gnf)
        if success and response.status_code == 200:
            bus_gnf = response.json()
            self.created_buses.append(bus_gnf["id"])
            self.log_test("Create Bus (GNF)", True, f"Created bus with ID: {bus_gnf['id']}")
        else:
            self.log_test("Create Bus (GNF)", False, f"Status: {response.status_code if response else 'No response'}")
            return
        
        # Create EUR bus
        response, success = self.make_request("POST", "/buses", bus_data_eur)
        if success and response.status_code == 200:
            bus_eur = response.json()
            self.created_buses.append(bus_eur["id"])
            self.log_test("Create Bus (EUR)", True, f"Created bus with ID: {bus_eur['id']}")
        else:
            self.log_test("Create Bus (EUR)", False, f"Status: {response.status_code if response else 'No response'}")
            return
        
        # Test 2: Get all buses
        response, success = self.make_request("GET", "/buses")
        if success and response.status_code == 200:
            buses = response.json()
            if len(buses) >= 2:
                self.log_test("Get All Buses", True, f"Retrieved {len(buses)} buses")
            else:
                self.log_test("Get All Buses", False, f"Expected at least 2 buses, got {len(buses)}")
        else:
            self.log_test("Get All Buses", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: Get single bus
        response, success = self.make_request("GET", f"/buses/{bus_gnf['id']}")
        if success and response.status_code == 200:
            bus = response.json()
            if bus["id"] == bus_gnf["id"] and bus["currency"] == "GNF":
                self.log_test("Get Single Bus", True, f"Retrieved bus: {bus['name']}")
            else:
                self.log_test("Get Single Bus", False, "Bus data mismatch")
        else:
            self.log_test("Get Single Bus", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 4: Update bus
        update_data = {
            "name": "Bus Conakry Express Updated",
            "registration": "GN-001-CKY",
            "currency": "GNF",
            "dailyTarget": 600000.0,
            "staff": ["Mamadou Diallo", "Fatoumata Camara", "Alpha Barry", "Ibrahima Sow", ""]
        }
        
        response, success = self.make_request("PUT", f"/buses/{bus_gnf['id']}", update_data)
        if success and response.status_code == 200:
            updated_bus = response.json()
            if updated_bus["name"] == "Bus Conakry Express Updated" and updated_bus["dailyTarget"] == 600000.0:
                self.log_test("Update Bus", True, "Bus updated successfully")
            else:
                self.log_test("Update Bus", False, "Update data mismatch")
        else:
            self.log_test("Update Bus", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 5: Test invalid bus ID
        response, success = self.make_request("GET", "/buses/invalid_id")
        if success and response.status_code == 422:  # Validation error for invalid ObjectId
            self.log_test("Invalid Bus ID Handling", True, "Properly handled invalid ID")
        else:
            self.log_test("Invalid Bus ID Handling", False, f"Expected 422, got {response.status_code if response else 'No response'}")
    
    def test_transaction_crud_operations(self):
        """Test all transaction CRUD operations"""
        print("\n=== Testing Transaction Management API ===")
        
        if not self.created_buses:
            self.log_test("Transaction Tests", False, "No buses available for transaction testing")
            return
        
        bus_id = self.created_buses[0]
        
        # Test 1: Create recette transactions
        recette_data = {
            "busId": bus_id,
            "type": "recette",
            "category": "billets",
            "amount": 150000.0,
            "description": "Vente billets matinée",
            "date": datetime.utcnow().isoformat()
        }
        
        response, success = self.make_request("POST", "/transactions", recette_data)
        if success and response.status_code == 200:
            transaction_recette = response.json()
            self.created_transactions.append(transaction_recette["id"])
            self.log_test("Create Recette Transaction", True, f"Created transaction ID: {transaction_recette['id']}")
        else:
            self.log_test("Create Recette Transaction", False, f"Status: {response.status_code if response else 'No response'}")
            return
        
        # Test 2: Create depense transaction
        depense_data = {
            "busId": bus_id,
            "type": "depense",
            "category": "carburant",
            "amount": 75000.0,
            "description": "Plein d'essence",
            "date": datetime.utcnow().isoformat()
        }
        
        response, success = self.make_request("POST", "/transactions", depense_data)
        if success and response.status_code == 200:
            transaction_depense = response.json()
            self.created_transactions.append(transaction_depense["id"])
            self.log_test("Create Depense Transaction", True, f"Created transaction ID: {transaction_depense['id']}")
        else:
            self.log_test("Create Depense Transaction", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: Get all transactions
        response, success = self.make_request("GET", "/transactions")
        if success and response.status_code == 200:
            transactions = response.json()
            if len(transactions) >= 2:
                self.log_test("Get All Transactions", True, f"Retrieved {len(transactions)} transactions")
            else:
                self.log_test("Get All Transactions", False, f"Expected at least 2 transactions, got {len(transactions)}")
        else:
            self.log_test("Get All Transactions", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 4: Filter transactions by busId
        response, success = self.make_request("GET", f"/transactions?busId={bus_id}")
        if success and response.status_code == 200:
            filtered_transactions = response.json()
            if all(t["busId"] == bus_id for t in filtered_transactions):
                self.log_test("Filter Transactions by Bus ID", True, f"Retrieved {len(filtered_transactions)} transactions for bus")
            else:
                self.log_test("Filter Transactions by Bus ID", False, "Filter not working correctly")
        else:
            self.log_test("Filter Transactions by Bus ID", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 5: Filter transactions by type
        response, success = self.make_request("GET", "/transactions?type=recette")
        if success and response.status_code == 200:
            recette_transactions = response.json()
            if all(t["type"] == "recette" for t in recette_transactions):
                self.log_test("Filter Transactions by Type", True, f"Retrieved {len(recette_transactions)} recette transactions")
            else:
                self.log_test("Filter Transactions by Type", False, "Type filter not working correctly")
        else:
            self.log_test("Filter Transactions by Type", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 6: Get single transaction
        if self.created_transactions:
            transaction_id = self.created_transactions[0]
            response, success = self.make_request("GET", f"/transactions/{transaction_id}")
            if success and response.status_code == 200:
                transaction = response.json()
                if transaction["id"] == transaction_id:
                    self.log_test("Get Single Transaction", True, f"Retrieved transaction: {transaction['category']}")
                else:
                    self.log_test("Get Single Transaction", False, "Transaction data mismatch")
            else:
                self.log_test("Get Single Transaction", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 7: Update transaction
        if self.created_transactions:
            transaction_id = self.created_transactions[0]
            update_data = {
                "busId": bus_id,
                "type": "recette",
                "category": "billets",
                "amount": 175000.0,
                "description": "Vente billets matinée - mise à jour",
                "date": datetime.utcnow().isoformat()
            }
            
            response, success = self.make_request("PUT", f"/transactions/{transaction_id}", update_data)
            if success and response.status_code == 200:
                updated_transaction = response.json()
                if updated_transaction["amount"] == 175000.0:
                    self.log_test("Update Transaction", True, "Transaction updated successfully")
                else:
                    self.log_test("Update Transaction", False, "Update data mismatch")
            else:
                self.log_test("Update Transaction", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 8: Test transaction with invalid bus ID
        invalid_transaction = {
            "busId": "invalid_bus_id",
            "type": "recette",
            "category": "billets",
            "amount": 100000.0,
            "description": "Test invalid bus",
            "date": datetime.utcnow().isoformat()
        }
        
        response, success = self.make_request("POST", "/transactions", invalid_transaction)
        if success and response.status_code == 422:  # Validation error
            self.log_test("Invalid Bus ID in Transaction", True, "Properly handled invalid bus ID")
        else:
            self.log_test("Invalid Bus ID in Transaction", False, f"Expected 422, got {response.status_code if response else 'No response'}")
    
    def test_statistics_endpoints(self):
        """Test all statistics endpoints"""
        print("\n=== Testing Statistics API ===")
        
        # Test 1: Get ranking with different periods
        periods = ["day", "week", "month", "year"]
        for period in periods:
            response, success = self.make_request("GET", f"/stats/ranking?period={period}")
            if success and response.status_code == 200:
                ranking = response.json()
                if isinstance(ranking, list):
                    self.log_test(f"Get Ranking ({period})", True, f"Retrieved ranking with {len(ranking)} buses")
                else:
                    self.log_test(f"Get Ranking ({period})", False, "Invalid ranking format")
            else:
                self.log_test(f"Get Ranking ({period})", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 2: Get total balance
        response, success = self.make_request("GET", "/stats/balance")
        if success and response.status_code == 200:
            balance = response.json()
            if "GNF" in balance and "EUR" in balance:
                self.log_test("Get Total Balance", True, f"GNF: {balance['GNF']}, EUR: {balance['EUR']}")
            else:
                self.log_test("Get Total Balance", False, "Invalid balance format")
        else:
            self.log_test("Get Total Balance", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: Get analytics for specific bus
        if self.created_buses:
            bus_id = self.created_buses[0]
            periods = ["day", "week", "month"]
            for period in periods:
                response, success = self.make_request("GET", f"/stats/analytics?busId={bus_id}&period={period}")
                if success and response.status_code == 200:
                    analytics = response.json()
                    if "busId" in analytics and "totalRecettes" in analytics and "totalDepenses" in analytics:
                        self.log_test(f"Get Bus Analytics ({period})", True, f"Recettes: {analytics['totalRecettes']}, Dépenses: {analytics['totalDepenses']}")
                    else:
                        self.log_test(f"Get Bus Analytics ({period})", False, "Invalid analytics format")
                else:
                    self.log_test(f"Get Bus Analytics ({period})", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 4: Get comparison analytics (all buses)
        periods = ["day", "week", "month"]
        for period in periods:
            response, success = self.make_request("GET", f"/stats/analytics?period={period}")
            if success and response.status_code == 200:
                analytics = response.json()
                if "comparison" in analytics and isinstance(analytics["comparison"], list):
                    self.log_test(f"Get Comparison Analytics ({period})", True, f"Compared {len(analytics['comparison'])} buses")
                else:
                    self.log_test(f"Get Comparison Analytics ({period})", False, "Invalid comparison format")
            else:
                self.log_test(f"Get Comparison Analytics ({period})", False, f"Status: {response.status_code if response else 'No response'}")
    
    def test_cascade_delete(self):
        """Test that deleting a bus also deletes its transactions"""
        print("\n=== Testing Cascade Delete ===")
        
        if not self.created_buses:
            self.log_test("Cascade Delete Test", False, "No buses available for cascade delete testing")
            return
        
        bus_id = self.created_buses[0]
        
        # First, verify transactions exist for this bus
        response, success = self.make_request("GET", f"/transactions?busId={bus_id}")
        if success and response.status_code == 200:
            transactions_before = response.json()
            transaction_count = len(transactions_before)
            
            if transaction_count > 0:
                # Delete the bus
                response, success = self.make_request("DELETE", f"/buses/{bus_id}")
                if success and response.status_code == 200:
                    # Check if transactions are also deleted
                    response, success = self.make_request("GET", f"/transactions?busId={bus_id}")
                    if success and response.status_code == 200:
                        transactions_after = response.json()
                        if len(transactions_after) == 0:
                            self.log_test("Cascade Delete", True, f"Bus and {transaction_count} transactions deleted successfully")
                            # Remove from our tracking lists
                            self.created_buses.remove(bus_id)
                            self.created_transactions = [t for t in self.created_transactions if t not in [tr["id"] for tr in transactions_before]]
                        else:
                            self.log_test("Cascade Delete", False, f"Bus deleted but {len(transactions_after)} transactions remain")
                    else:
                        self.log_test("Cascade Delete", False, "Could not verify transaction deletion")
                else:
                    self.log_test("Cascade Delete", False, f"Bus deletion failed: {response.status_code if response else 'No response'}")
            else:
                self.log_test("Cascade Delete", False, "No transactions found for bus")
        else:
            self.log_test("Cascade Delete", False, "Could not retrieve transactions for bus")
    
    def cleanup(self):
        """Clean up created test data"""
        print("\n=== Cleaning Up Test Data ===")
        
        # Delete remaining transactions
        for transaction_id in self.created_transactions:
            response, success = self.make_request("DELETE", f"/transactions/{transaction_id}")
            if success and response.status_code == 200:
                print(f"✅ Deleted transaction {transaction_id}")
            else:
                print(f"❌ Failed to delete transaction {transaction_id}")
        
        # Delete remaining buses
        for bus_id in self.created_buses:
            response, success = self.make_request("DELETE", f"/buses/{bus_id}")
            if success and response.status_code == 200:
                print(f"✅ Deleted bus {bus_id}")
            else:
                print(f"❌ Failed to delete bus {bus_id}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print(f"🚀 Starting Vecteur GN Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        try:
            self.test_bus_crud_operations()
            self.test_transaction_crud_operations()
            self.test_statistics_endpoints()
            self.test_cascade_delete()
        finally:
            self.cleanup()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = VecteurGNAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)