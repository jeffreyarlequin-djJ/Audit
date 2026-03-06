#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime
import time

class TicketQualityAPITester:
    def __init__(self):
        self.base_url = "https://ticket-quality-audit.preview.emergentagent.com/api"
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Test counters
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test data storage
        self.test_ticket_id = None
        self.test_template_id = None

    def log_test_result(self, test_name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"   Details: {details}")
        
        if details and success:
            print(f"   {details}")

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request and validate response"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url)
            else:
                return False, f"Unsupported HTTP method: {method}"
                
            success = response.status_code == expected_status
            
            if success:
                try:
                    return True, response.json()
                except json.JSONDecodeError:
                    return True, {"status": "success", "status_code": response.status_code}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                return False, error_msg
                
        except Exception as e:
            return False, f"Request failed: {str(e)}"

    def test_root_endpoint(self):
        """Test GET /api/ root endpoint"""
        success, result = self.make_request('GET', '/')
        
        if success and isinstance(result, dict):
            expected_msg = "Swiss Telecom QA API"
            if result.get("message") == expected_msg:
                self.log_test_result("Root endpoint returns correct message", True, 
                                   f"Message: {result.get('message')}")
                return True
            else:
                self.log_test_result("Root endpoint message validation", False, 
                                   f"Expected '{expected_msg}', got '{result.get('message')}'")
        else:
            self.log_test_result("Root endpoint accessibility", False, str(result))
        return False

    def test_templates_endpoints(self):
        """Test template-related endpoints"""
        # Test GET /api/templates (should return 5 default templates)
        success, result = self.make_request('GET', '/templates')
        
        if success and isinstance(result, list):
            if len(result) == 5:
                self.log_test_result("Templates endpoint returns 5 default templates", True,
                                   f"Found {len(result)} templates")
                
                # Store first template ID for update test
                if result:
                    self.test_template_id = result[0].get("id")
                
                # Verify required template fields
                template = result[0]
                required_fields = ["id", "name", "category", "content", "description", "updated_at"]
                missing_fields = [field for field in required_fields if field not in template]
                
                if not missing_fields:
                    self.log_test_result("Template structure validation", True, 
                                       "All required fields present")
                else:
                    self.log_test_result("Template structure validation", False,
                                       f"Missing fields: {missing_fields}")
                    
            else:
                self.log_test_result("Templates count validation", False,
                                   f"Expected 5 templates, got {len(result)}")
        else:
            self.log_test_result("Templates GET endpoint", False, str(result))
            return False

        # Test PUT /api/templates/{id} - update template content
        if self.test_template_id:
            update_data = {
                "content": "TEST UPDATED CONTENT - This is a test update to verify the API functionality.",
                "name": "Updated Template Name",
                "description": "Updated description for testing"
            }
            
            success, result = self.make_request('PUT', f'/templates/{self.test_template_id}', 
                                              update_data)
            
            if success:
                updated_content = result.get("content", "")
                if "TEST UPDATED CONTENT" in updated_content:
                    self.log_test_result("Template update (PUT)", True, 
                                       "Template content updated successfully")
                else:
                    self.log_test_result("Template update verification", False,
                                       "Updated content not reflected")
            else:
                self.log_test_result("Template update (PUT)", False, str(result))

        # Test POST /api/templates/reset - reset templates to defaults
        success, result = self.make_request('POST', '/templates/reset')
        
        if success and isinstance(result, list) and len(result) == 5:
            self.log_test_result("Templates reset (POST)", True, 
                               f"Reset successful, {len(result)} default templates restored")
        else:
            self.log_test_result("Templates reset (POST)", False, str(result))

        return True

    def test_ticket_analysis(self):
        """Test POST /api/tickets/analyze with sample ticket content"""
        sample_ticket_content = """
INCIDENT REPORT - INC-2024-001234

Date: 2024-01-15 09:30:00
Priority: P2 - Majeur
Client: ENTERPRISE-CLIENT-001
Service: Ligne téléphonique fixe

DESCRIPTION:
Le client signale une interruption complète du service téléphonique depuis 08:45 ce matin.
Aucun appel entrant ou sortant n'est possible.

IMPACT:
- Service téléphonique indisponible
- Affecte 50 postes dans l'entreprise
- Impact business critique pour les ventes

ACTIONS REALISEES:
1. Vérification de l'état de la ligne via le portail technique
2. Test de connectivité - ECHEC
3. Vérification des équipements client - OK
4. Diagnostic réseau - Panne identifiée sur l'infrastructure Orange

RESOLUTION:
Escalade vers l'équipe réseau N2 à 10:15
Intervention technique planifiée sous 4h (SLA respecté)

COMMUNICATION CLIENT:
Client informé de la prise en charge et du délai d'intervention
Mise à jour prévue toutes les 2h

STATUS: EN_COURS
"""

        ticket_data = {
            "content": sample_ticket_content,
            "ticket_ref": "INC-2024-001234",
            "priority": "P2 - Majeur"
        }

        print(f"🔄 Analyzing ticket (this may take 10-15 seconds)...")
        start_time = time.time()
        
        success, result = self.make_request('POST', '/tickets/analyze', ticket_data)
        
        analysis_time = time.time() - start_time
        
        if success:
            # Verify response structure
            required_fields = ["id", "ticket_ref", "priority", "content", "scores", 
                             "score_global", "details", "recommandations", "created_at"]
            missing_fields = [field for field in required_fields if field not in result]
            
            if not missing_fields:
                # Check if scores contain all 10 criteria
                scores = result.get("scores", {})
                expected_criteria = ["procedures", "priorite", "description", "acquittement", 
                                   "sla", "communication", "diagnostic", "statut", "escalade", "cloture"]
                missing_criteria = [c for c in expected_criteria if c not in scores]
                
                if not missing_criteria:
                    score_global = result.get("score_global", 0)
                    self.log_test_result("Ticket analysis with AI (POST)", True, 
                                       f"Analysis completed in {analysis_time:.1f}s, "
                                       f"Global score: {score_global}/10")
                    
                    # Store ticket ID for further testing
                    self.test_ticket_id = result.get("id")
                    return True
                else:
                    self.log_test_result("AI analysis criteria validation", False,
                                       f"Missing criteria: {missing_criteria}")
            else:
                self.log_test_result("AI analysis response structure", False,
                                   f"Missing fields: {missing_fields}")
        else:
            self.log_test_result("Ticket analysis with AI (POST)", False, str(result))
        
        return False

    def test_ticket_crud_operations(self):
        """Test ticket CRUD operations"""
        # Test GET /api/tickets - get analyzed tickets list
        success, result = self.make_request('GET', '/tickets')
        
        if success and isinstance(result, dict):
            tickets = result.get("tickets", [])
            total = result.get("total", 0)
            
            if total > 0 and tickets:
                self.log_test_result("Tickets list (GET)", True, 
                                   f"Found {total} tickets, returned {len(tickets)} in list")
                
                # Test GET /api/tickets/{id} - get ticket detail
                if self.test_ticket_id:
                    success_detail, detail_result = self.make_request('GET', f'/tickets/{self.test_ticket_id}')
                    
                    if success_detail:
                        if detail_result.get("id") == self.test_ticket_id:
                            self.log_test_result("Ticket detail (GET)", True,
                                               f"Retrieved ticket {self.test_ticket_id}")
                        else:
                            self.log_test_result("Ticket detail ID verification", False,
                                               "Returned ticket ID doesn't match requested")
                    else:
                        self.log_test_result("Ticket detail (GET)", False, str(detail_result))
                
                # Test DELETE /api/tickets/{id} - delete a ticket
                if self.test_ticket_id:
                    success_delete, delete_result = self.make_request('DELETE', f'/tickets/{self.test_ticket_id}')
                    
                    if success_delete:
                        self.log_test_result("Ticket deletion (DELETE)", True, 
                                           f"Ticket {self.test_ticket_id} deleted successfully")
                        
                        # Verify deletion - should return 404
                        verify_success, verify_result = self.make_request('GET', f'/tickets/{self.test_ticket_id}', 
                                                                        expected_status=404)
                        if verify_success:
                            self.log_test_result("Ticket deletion verification", True, 
                                               "Deleted ticket no longer accessible")
                        else:
                            self.log_test_result("Ticket deletion verification", False, 
                                               "Deleted ticket still accessible")
                    else:
                        self.log_test_result("Ticket deletion (DELETE)", False, str(delete_result))
                        
            else:
                self.log_test_result("Tickets list validation", False, 
                                   "No tickets found or incorrect response structure")
        else:
            self.log_test_result("Tickets list (GET)", False, str(result))

    def test_dashboard_endpoint(self):
        """Test GET /api/dashboard - returns dashboard KPIs"""
        success, result = self.make_request('GET', '/dashboard')
        
        if success and isinstance(result, dict):
            expected_fields = ["total_tickets", "avg_score", "sla_rate", "priority_distribution",
                             "criteria_averages", "recent_tickets", "score_distribution"]
            missing_fields = [field for field in expected_fields if field not in result]
            
            if not missing_fields:
                total_tickets = result.get("total_tickets", 0)
                avg_score = result.get("avg_score", 0)
                sla_rate = result.get("sla_rate", 0)
                
                self.log_test_result("Dashboard KPIs (GET)", True, 
                                   f"Total: {total_tickets}, Avg Score: {avg_score}, SLA: {sla_rate}%")
            else:
                self.log_test_result("Dashboard structure validation", False,
                                   f"Missing fields: {missing_fields}")
        else:
            self.log_test_result("Dashboard KPIs (GET)", False, str(result))

    def test_statistics_endpoint(self):
        """Test GET /api/statistics - returns statistics data"""
        success, result = self.make_request('GET', '/statistics')
        
        if success and isinstance(result, dict):
            expected_fields = ["total", "criteria_averages", "monthly_trend", 
                             "priority_stats", "top_tickets", "bottom_tickets"]
            missing_fields = [field for field in expected_fields if field not in result]
            
            if not missing_fields:
                total = result.get("total", 0)
                criteria_count = len(result.get("criteria_averages", {}))
                
                self.log_test_result("Statistics data (GET)", True, 
                                   f"Total analyzed: {total}, Criteria tracked: {criteria_count}")
            else:
                self.log_test_result("Statistics structure validation", False,
                                   f"Missing fields: {missing_fields}")
        else:
            self.log_test_result("Statistics data (GET)", False, str(result))

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Ticket Quality Analysis API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("-" * 60)

        # Test order matters for dependencies
        self.test_root_endpoint()
        print()
        
        self.test_templates_endpoints()  
        print()
        
        self.test_ticket_analysis()  # This creates test data
        print()
        
        self.test_ticket_crud_operations()
        print()
        
        self.test_dashboard_endpoint()
        print()
        
        self.test_statistics_endpoint()
        
        # Final summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n🚨 FAILED TESTS:")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"  {i}. {failure['test']}")
                print(f"     → {failure['details']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Excellent! Backend API is working well.")
            return 0
        elif success_rate >= 70:
            print("⚠️  Good, but some issues need attention.")
            return 1
        else:
            print("🚫 Critical issues detected. Backend needs fixes.")
            return 2

if __name__ == "__main__":
    tester = TicketQualityAPITester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)