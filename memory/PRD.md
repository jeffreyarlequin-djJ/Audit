# Swiss Telecom QA - PRD

## Problem Statement
Application d'audit qualité des tickets d'incident pour une équipe SAV Téléphonie N1 (Orange). Analyse IA des tickets sur 10 critères de qualité avec scoring, templates, historique et statistiques.

## Architecture
- **Backend**: FastAPI + MongoDB + OpenAI GPT (via emergentintegrations, Emergent LLM Key)
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Design**: Swiss High-Contrast (Blanc/Noir/Orange #FF5722), Barlow Condensed + IBM Plex Sans

## User Personas
- Soutien métier / Quality analyst SAV Téléphonie N1
- Superviseurs d'équipe téléphonie

## Core Requirements
- Analyse IA de tickets d'incident sur 10 critères (procédures, priorité, description, acquittement, SLA, communication, diagnostic, statut, escalade, clôture)
- Scoring global /10 par ticket
- Templates pré-remplis et modifiables
- Dashboard avec KPIs et graphiques
- Historique des analyses
- Statistiques et tendances

## What's Been Implemented (2026-03-06)
- [x] Backend API complet (CRUD tickets, templates, dashboard, statistiques)
- [x] Intégration OpenAI GPT-4o via Emergent LLM Key
- [x] 5 templates par défaut (Acquittement, Critères d'entrée, Diagnostics, Communication, Clôture)
- [x] Dashboard avec KPIs, radar chart, pie chart
- [x] Page analyse ticket avec formulaire + Sheet overlay résultats
- [x] Page templates avec édition inline
- [x] Page historique avec tableau + détail Sheet
- [x] Page statistiques avec graphiques recharts
- [x] Sidebar navigation
- [x] Design Swiss High-Contrast implémenté

### Phase 2 (2026-03-06)
- [x] Nouveau scoring: NA (non visible) / 0 (Mauvais) / 1 (Moyen) / 2 (Bon), score global en % sur 100
- [x] Nouveau critère: "Compréhension de l'incident" (11 critères total)
- [x] Champ agent/technicien pour chaque analyse
- [x] Filtres avancés dans l'historique (agent, priorité, score min/max)
- [x] Export CSV des analyses
- [x] Page Comparatif Agents (radar chart + tableau détaillé)
- [x] Extension navigateur Chrome/Edge/Firefox (capture contenu page + analyse IA)
- [x] Tests e2e Phase 2 passés (100% backend, 100% frontend, 100% intégration)

## Prioritized Backlog
### P0 (Done)
- Analyse IA des tickets ✅
- Templates modifiables ✅
- Dashboard + Historique + Statistiques ✅

### P1 (Next)
- Export PDF/Excel des analyses
- Filtres avancés dans l'historique (par date, priorité, score)
- Pagination dans l'historique

### P2
- Analyse batch (import CSV de tickets)
- Comparaison entre agents/périodes
- Alertes SLA automatiques
- Thèmes personnalisables

## Next Tasks
1. Export des rapports d'analyse en PDF
2. Filtres et recherche dans l'historique
3. Import batch de tickets (CSV/Excel)
4. Tableau comparatif agents/équipes
