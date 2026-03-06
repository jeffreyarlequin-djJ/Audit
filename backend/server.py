from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# --- Models ---

class TicketInput(BaseModel):
    content: str
    ticket_ref: Optional[str] = ""
    priority: Optional[str] = ""

class AnalysisScore(BaseModel):
    procedures: int = 0
    priorite: int = 0
    description: int = 0
    acquittement: int = 0
    sla: int = 0
    communication: int = 0
    diagnostic: int = 0
    statut: int = 0
    escalade: int = 0
    cloture: int = 0

class TicketAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_ref: str = ""
    priority: str = ""
    content: str
    scores: dict = {}
    score_global: float = 0.0
    details: dict = {}
    recommandations: list = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TemplateModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    content: str
    description: str = ""
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TemplateUpdate(BaseModel):
    content: str
    name: Optional[str] = None
    description: Optional[str] = None

# --- Default Templates ---

DEFAULT_TEMPLATES = [
    {
        "name": "Acquittement Dossier",
        "category": "acquittement",
        "description": "Template de commentaire client pour l'acquittement du dossier d'incident",
        "content": """Bonjour,

Nous accusons reception de votre signalement d'incident sous la reference [REF_TICKET].

Nature de l'incident : [DESCRIPTION_COURTE]
Impact identifie : [IMPACT]
Priorite attribuee : [PRIORITE]

Notre equipe technique prend en charge votre dossier et reviendra vers vous dans les meilleurs delais avec un diagnostic initial.

Pour toute information complementaire, n'hesitez pas a nous contacter.

Cordialement,
Equipe Support N1 - SAV Telephonie"""
    },
    {
        "name": "Criteres d'Entree d'Incident",
        "category": "criteres_entree",
        "description": "Grille des criteres d'entree pour qualifier un incident et evaluer son impact",
        "content": """CRITERES D'ENTREE D'INCIDENT

1. IDENTIFICATION
   - Reference ticket : [REF]
   - Date/Heure de declaration : [DATE_HEURE]
   - Client : [NOM_CLIENT]
   - Service impacte : [SERVICE]

2. CLASSIFICATION
   - Type d'incident : [ ] Panne totale  [ ] Degradation  [ ] Intermittent
   - Perimetre : [ ] Unitaire  [ ] Collectif  [ ] Massif
   - Priorite : [ ] P1 (Critique)  [ ] P2 (Majeur)  [ ] P3 (Mineur)  [ ] P4 (Information)

3. IMPACT
   - Nombre d'utilisateurs impactes : [NOMBRE]
   - Services affectes : [LISTE_SERVICES]
   - Impact business : [ ] Critique  [ ] Important  [ ] Modere  [ ] Faible

4. CONTEXTE
   - Dernier changement connu : [CHANGEMENT]
   - Environnement : [ENV]
   - Premiers symptomes : [SYMPTOMES]"""
    },
    {
        "name": "Tests Preliminaires et Diagnostics",
        "category": "diagnostics",
        "description": "Checklist des tests preliminaires et diagnostics a effectuer avant escalade",
        "content": """TESTS PRELIMINAIRES ET DIAGNOSTICS

1. VERIFICATION INITIALE
   [ ] Verification de l'etat du service sur le portail de supervision
   [ ] Consultation des alertes en cours
   [ ] Verification des maintenances planifiees
   [ ] Controle de l'historique des incidents similaires

2. TESTS RESEAU
   [ ] Test de connectivite (ping)
   [ ] Traceroute vers l'equipement
   [ ] Verification DNS
   [ ] Test de bande passante

3. TESTS SERVICE
   [ ] Verification des identifiants client
   [ ] Test de la ligne / du service
   [ ] Verification de la configuration
   [ ] Test depuis un autre poste / equipement

4. DIAGNOSTIC
   - Resultat des tests : [RESULTATS]
   - Hypothese de panne : [HYPOTHESE]
   - Action corrective tentee : [ACTION]
   - Resultat de l'action : [RESULTAT_ACTION]

5. CONCLUSION
   [ ] Incident resolu - Cloture
   [ ] Escalade necessaire vers : [EQUIPE]
   [ ] Attente retour client"""
    },
    {
        "name": "Communication Client",
        "category": "communication",
        "description": "Template de communication client pour les mises a jour d'incident",
        "content": """MISE A JOUR INCIDENT - [REF_TICKET]

Bonjour [NOM_CLIENT],

Nous vous informons de l'avancement concernant votre incident :

Statut actuel : [EN_COURS / GELE / RESOLU]
Actions realisees : [DESCRIPTION_ACTIONS]
Prochaine etape : [PROCHAINE_ETAPE]
Delai estime : [DELAI]

[Si Gel] : Nous sommes dans l'attente de [INFORMATION_ATTENDUE] de votre part afin de poursuivre le traitement de votre dossier.

Nous restons a votre disposition pour tout complement d'information.

Cordialement,
Equipe Support N1 - SAV Telephonie"""
    },
    {
        "name": "Cloture d'Incident",
        "category": "cloture",
        "description": "Template de cloture avec verification des codes et dates",
        "content": """CLOTURE D'INCIDENT

1. REFERENCES
   - Ticket : [REF_TICKET]
   - Date d'ouverture : [DATE_OUVERTURE]
   - Date de retablissement : [DATE_RETABLISSEMENT]
   - Date de cloture : [DATE_CLOTURE]

2. RESOLUTION
   - Code de cloture : [CODE]
   - Responsabilite : [ ] Client  [ ] Prestataire (Orange)  [ ] Tiers
   - Cause racine : [CAUSE]
   - Action de resolution : [ACTION_RESOLUTION]

3. VERIFICATION
   [ ] Service retabli et fonctionnel
   [ ] Client informe de la resolution
   [ ] Documentation complete
   [ ] SLA respecte : [ ] Oui  [ ] Non - Justification : [JUSTIF]

4. DETAILS
   - Description du probleme : [DESCRIPTION_COMPLETE]
   - Impact reel : [IMPACT]
   - Duree totale de l'incident : [DUREE]
   - Temps de diagnostic : [TEMPS_DIAG]"""
    }
]

# --- AI Analysis ---

ANALYSIS_SYSTEM_PROMPT = """Tu es un expert en analyse de qualite des tickets d'incident pour un SAV Telephonie de niveau 1 (prestataire Orange). 
Tu dois analyser le contenu d'un ticket d'incident et fournir une evaluation detaillee sur les criteres suivants.

Pour chaque critere, attribue une note de 0 a 10 et fournis un commentaire explicatif.

CRITERES D'EVALUATION :

1. PROCEDURES (procedures) : Respect des procedures mises en place (workflow, etapes obligatoires)
2. PRIORITE (priorite) : Bon taggage de la priorite (P1/P2/P3/P4) en coherence avec l'impact et l'urgence
3. DESCRIPTION (description) : Qualite et completude de la description de l'incident
4. ACQUITTEMENT (acquittement) : Presence et qualite du commentaire d'acquittement dossier vers le client
5. SLA (sla) : Respect des SLA par rapport a la priorite de l'incident
6. COMMUNICATION (communication) : Qualite de la communication, maitrise de l'orthographe, clarte des messages
7. DIAGNOSTIC (diagnostic) : Qualite des tests preliminaires et diagnostics effectues
8. STATUT (statut) : Bonne gestion des etats du ticket (en cours/gele), coherence des dates et heures de gel avec les actions
9. ESCALADE (escalade) : Determination si la bonne equipe a ete activee pour investigation
10. CLOTURE (cloture) : Verification des codes de cloture, dates de retablissement/reparation, details du probleme

Tu DOIS repondre UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "scores": {
    "procedures": <0-10>,
    "priorite": <0-10>,
    "description": <0-10>,
    "acquittement": <0-10>,
    "sla": <0-10>,
    "communication": <0-10>,
    "diagnostic": <0-10>,
    "statut": <0-10>,
    "escalade": <0-10>,
    "cloture": <0-10>
  },
  "details": {
    "procedures": "<commentaire>",
    "priorite": "<commentaire>",
    "description": "<commentaire>",
    "acquittement": "<commentaire>",
    "sla": "<commentaire>",
    "communication": "<commentaire>",
    "diagnostic": "<commentaire>",
    "statut": "<commentaire>",
    "escalade": "<commentaire>",
    "cloture": "<commentaire>"
  },
  "recommandations": ["<recommandation 1>", "<recommandation 2>", ...],
  "resume": "<resume global de l'analyse en 2-3 phrases>"
}

Sois objectif, precis et constructif dans tes commentaires. Identifie les points forts et les axes d'amelioration."""


async def analyze_ticket_with_ai(content: str, ticket_ref: str = "", priority: str = "") -> dict:
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=str(uuid.uuid4()),
            system_message=ANALYSIS_SYSTEM_PROMPT
        )
        chat.with_model("openai", "gpt-4o")

        user_text = f"Analyse ce ticket d'incident :\n\nReference: {ticket_ref}\nPriorite declaree: {priority}\n\nContenu du ticket:\n{content}"
        user_message = UserMessage(text=user_text)
        response = await chat.send_message(user_message)

        # Parse JSON from response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        result = json.loads(response_text)
        return result
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}, response: {response_text[:500]}")
        return {
            "scores": {k: 5 for k in ["procedures", "priorite", "description", "acquittement", "sla", "communication", "diagnostic", "statut", "escalade", "cloture"]},
            "details": {k: "Analyse en cours - erreur de parsing" for k in ["procedures", "priorite", "description", "acquittement", "sla", "communication", "diagnostic", "statut", "escalade", "cloture"]},
            "recommandations": ["Veuillez reessayer l'analyse"],
            "resume": "Erreur lors de l'analyse. Veuillez reessayer."
        }
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse IA: {str(e)}")


# --- Routes ---

@api_router.get("/")
async def root():
    return {"message": "Swiss Telecom QA API"}

# Ticket Analysis
@api_router.post("/tickets/analyze")
async def analyze_ticket(ticket_input: TicketInput):
    analysis = await analyze_ticket_with_ai(ticket_input.content, ticket_input.ticket_ref, ticket_input.priority)
    
    scores = analysis.get("scores", {})
    score_values = [v for v in scores.values() if isinstance(v, (int, float))]
    score_global = round(sum(score_values) / len(score_values), 1) if score_values else 0

    ticket_doc = {
        "id": str(uuid.uuid4()),
        "ticket_ref": ticket_input.ticket_ref,
        "priority": ticket_input.priority,
        "content": ticket_input.content,
        "scores": scores,
        "score_global": score_global,
        "details": analysis.get("details", {}),
        "recommandations": analysis.get("recommandations", []),
        "resume": analysis.get("resume", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.tickets.insert_one(ticket_doc)
    ticket_doc.pop("_id", None)
    return ticket_doc

# Get all tickets
@api_router.get("/tickets")
async def get_tickets(skip: int = 0, limit: int = 50, sort: str = "desc"):
    sort_order = -1 if sort == "desc" else 1
    tickets = await db.tickets.find({}, {"_id": 0}).sort("created_at", sort_order).skip(skip).limit(limit).to_list(limit)
    total = await db.tickets.count_documents({})
    return {"tickets": tickets, "total": total}

# Get single ticket
@api_router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trouve")
    return ticket

# Delete ticket
@api_router.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str):
    result = await db.tickets.delete_one({"id": ticket_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket non trouve")
    return {"message": "Ticket supprime"}

# Dashboard
@api_router.get("/dashboard")
async def get_dashboard():
    total_tickets = await db.tickets.count_documents({})
    
    pipeline_avg = [{"$group": {"_id": None, "avg_score": {"$avg": "$score_global"}}}]
    avg_result = await db.tickets.aggregate(pipeline_avg).to_list(1)
    avg_score = round(avg_result[0]["avg_score"], 1) if avg_result else 0

    pipeline_priority = [{"$group": {"_id": "$priority", "count": {"$sum": 1}}}]
    priority_dist = await db.tickets.aggregate(pipeline_priority).to_list(10)
    priority_data = {item["_id"]: item["count"] for item in priority_dist if item["_id"]}

    # Score distribution by criteria
    pipeline_criteria = [
        {"$group": {
            "_id": None,
            "procedures": {"$avg": "$scores.procedures"},
            "priorite": {"$avg": "$scores.priorite"},
            "description": {"$avg": "$scores.description"},
            "acquittement": {"$avg": "$scores.acquittement"},
            "sla": {"$avg": "$scores.sla"},
            "communication": {"$avg": "$scores.communication"},
            "diagnostic": {"$avg": "$scores.diagnostic"},
            "statut": {"$avg": "$scores.statut"},
            "escalade": {"$avg": "$scores.escalade"},
            "cloture": {"$avg": "$scores.cloture"}
        }}
    ]
    criteria_result = await db.tickets.aggregate(pipeline_criteria).to_list(1)
    criteria_avg = {}
    if criteria_result:
        for k, v in criteria_result[0].items():
            if k != "_id" and v is not None:
                criteria_avg[k] = round(v, 1)

    # Recent tickets
    recent = await db.tickets.find({}, {"_id": 0, "content": 0}).sort("created_at", -1).limit(5).to_list(5)

    # SLA compliance (score sla >= 7 is considered compliant)
    sla_compliant = await db.tickets.count_documents({"scores.sla": {"$gte": 7}})
    sla_rate = round((sla_compliant / total_tickets * 100), 1) if total_tickets > 0 else 0

    # Score ranges
    excellent = await db.tickets.count_documents({"score_global": {"$gte": 8}})
    bon = await db.tickets.count_documents({"score_global": {"$gte": 6, "$lt": 8}})
    moyen = await db.tickets.count_documents({"score_global": {"$gte": 4, "$lt": 6}})
    faible = await db.tickets.count_documents({"score_global": {"$lt": 4}})

    return {
        "total_tickets": total_tickets,
        "avg_score": avg_score,
        "sla_rate": sla_rate,
        "priority_distribution": priority_data,
        "criteria_averages": criteria_avg,
        "recent_tickets": recent,
        "score_distribution": {
            "excellent": excellent,
            "bon": bon,
            "moyen": moyen,
            "faible": faible
        }
    }

# Statistics
@api_router.get("/statistics")
async def get_statistics():
    total = await db.tickets.count_documents({})
    
    pipeline_criteria = [
        {"$group": {
            "_id": None,
            "procedures": {"$avg": "$scores.procedures"},
            "priorite": {"$avg": "$scores.priorite"},
            "description": {"$avg": "$scores.description"},
            "acquittement": {"$avg": "$scores.acquittement"},
            "sla": {"$avg": "$scores.sla"},
            "communication": {"$avg": "$scores.communication"},
            "diagnostic": {"$avg": "$scores.diagnostic"},
            "statut": {"$avg": "$scores.statut"},
            "escalade": {"$avg": "$scores.escalade"},
            "cloture": {"$avg": "$scores.cloture"}
        }}
    ]
    criteria_result = await db.tickets.aggregate(pipeline_criteria).to_list(1)
    criteria_avg = {}
    if criteria_result:
        for k, v in criteria_result[0].items():
            if k != "_id" and v is not None:
                criteria_avg[k] = round(v, 1)

    # Monthly trend (last 6 months)
    pipeline_monthly = [
        {"$addFields": {"date_parsed": {"$dateFromString": {"dateString": "$created_at"}}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$date_parsed"}},
            "count": {"$sum": 1},
            "avg_score": {"$avg": "$score_global"}
        }},
        {"$sort": {"_id": 1}},
        {"$limit": 6}
    ]
    try:
        monthly = await db.tickets.aggregate(pipeline_monthly).to_list(6)
    except Exception:
        monthly = []

    # Priority distribution
    pipeline_priority = [{"$group": {"_id": "$priority", "count": {"$sum": 1}, "avg_score": {"$avg": "$score_global"}}}]
    priority_stats = await db.tickets.aggregate(pipeline_priority).to_list(10)

    # Top/Bottom scores
    top_tickets = await db.tickets.find({}, {"_id": 0, "content": 0}).sort("score_global", -1).limit(5).to_list(5)
    bottom_tickets = await db.tickets.find({}, {"_id": 0, "content": 0}).sort("score_global", 1).limit(5).to_list(5)

    return {
        "total": total,
        "criteria_averages": criteria_avg,
        "monthly_trend": [{"month": m["_id"], "count": m["count"], "avg_score": round(m["avg_score"], 1)} for m in monthly],
        "priority_stats": [{"priority": p["_id"] or "Non defini", "count": p["count"], "avg_score": round(p["avg_score"], 1)} for p in priority_stats],
        "top_tickets": top_tickets,
        "bottom_tickets": bottom_tickets
    }

# Templates
@api_router.get("/templates")
async def get_templates():
    templates = await db.templates.find({}, {"_id": 0}).to_list(100)
    if not templates:
        # Initialize with defaults
        for t in DEFAULT_TEMPLATES:
            doc = {
                "id": str(uuid.uuid4()),
                "name": t["name"],
                "category": t["category"],
                "content": t["content"],
                "description": t["description"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.templates.insert_one(doc)
        templates = await db.templates.find({}, {"_id": 0}).to_list(100)
    return templates

@api_router.put("/templates/{template_id}")
async def update_template(template_id: str, update: TemplateUpdate):
    update_dict = {"content": update.content, "updated_at": datetime.now(timezone.utc).isoformat()}
    if update.name:
        update_dict["name"] = update.name
    if update.description:
        update_dict["description"] = update.description
    
    result = await db.templates.update_one({"id": template_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template non trouve")
    
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    return template

@api_router.post("/templates/reset")
async def reset_templates():
    await db.templates.delete_many({})
    for t in DEFAULT_TEMPLATES:
        doc = {
            "id": str(uuid.uuid4()),
            "name": t["name"],
            "category": t["category"],
            "content": t["content"],
            "description": t["description"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.templates.insert_one(doc)
    templates = await db.templates.find({}, {"_id": 0}).to_list(100)
    return templates

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
