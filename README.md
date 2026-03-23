# MiniQuest

MiniQuest is an AI-powered local adventure planner. You describe what you are in the mood for, and it generates three complete single-day itineraries backed by real-time research. It currently operates in **Boston, MA** and **New York City, NY**.

It is not a list of recommendations. Each itinerary includes ordered venues, travel routes, live hours and prices, transit directions, and a narrative connecting the stops. Itineraries improve over time through RAG-based personalization built on your history.

---

## How it works

Each request runs through a pipeline of six specialized AI agents coordinated by LangGraph:

1. **LocationParser** resolves the location to coordinates and a canonical city name, with strict Boston/NYC guardrails. Defaults to Boston if nothing is found.
2. **IntentParser** extracts themes, activities, meal constraints, group size, and time-of-day context. Also maps vibe words like "chill" or "party night" to concrete venue categories.
3. **VenueScout** discovers venues using one of three paths in priority order: Google Places (primary, geocoded and proximity-ranked), Tavily live discovery (fallback if Maps is unavailable), or GPT-4o knowledge base (last resort). Websites are batch-fetched for Google Places results.
4. **TavilyResearch** researches up to 18 venues in parallel using Tavily search and extract, pulling current hours, prices, reviews, and standout details. Results are cached in Redis for 24 hours.
5. **RoutingAgent** resolves street-level addresses in parallel using Google Places, builds Google Maps deep links, and injects per-step transit directions. Uses typo-tolerant venue name matching with a name-similarity guard to prevent wrong-business substitutions.
6. **AdventureCreator** generates three themed itineraries from the researched and routed venues using GPT-4o. Adventures are created concurrently via `asyncio.as_completed` and streamed to the frontend as each one finishes.

The full pipeline completes in roughly 4 seconds on a warm cache. The ResearchSummary agent (`research_summary_agent.py`) still exists on disk but was removed from the active workflow — its function is handled directly by TavilyResearch and AdventureCreator.

---

## Live deployment

| Service | URL |
|---|---|
| Web app | https://project-572cd754-7f2b-465c-b68.web.app |
| Backend API | https://miniquest-backend-633153384860.us-east1.run.app |
| API docs | https://miniquest-backend-633153384860.us-east1.run.app/docs |

The backend runs on GCP Cloud Run (us-east1). The frontend is on Firebase Hosting. All secrets are in GCP Secret Manager.

---

## Tech stack

**Backend**
- Python 3.11, FastAPI, LangGraph
- OpenAI GPT-4o and GPT-4o-mini
- Tavily API (search and extract)
- MongoDB Atlas (Cluster0)
- ChromaDB for RAG-based personalization
- Redis for research result caching
- Google Maps API (routing and venue discovery)
- MBTA V3 API for live Boston transit

**Frontend**
- React 18 with TypeScript, Vite
- Glassmorphism design with full dark/light theme support
- ThemeContext with `t(isDark)` token helper used across all components
- Mobile-responsive via `useIsMobile` hook
- Generation options: configurable stops per adventure (1-6) and diversity mode (standard, high, fresh)
- Vibe chips, Surprise button, Group mode, and Onboarding modal on the main generator
- OpenTelemetry observability dashboard (feature-flagged)

**Mobile**
- React Native 0.83, Expo SDK 55
- Expo Router for file-based navigation
- expo-blur, expo-linear-gradient, expo-secure-store

**Infrastructure**
- GCP Cloud Run (backend, us-east1)
- Firebase Hosting (frontend)
- GCP Artifact Registry for Docker images
- GCP Cloud Build for CI/CD
- GCP Secret Manager for all secrets
- MongoDB Atlas, Redis

---

## Project structure

```
miniquest/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── base/               # BaseAgent class
│   │   │   ├── coordination/       # LangGraph coordinator and workflow state
│   │   │   ├── creation/           # AdventureCreator agent
│   │   │   ├── discovery/          # TavilyResearch agent and Redis research cache
│   │   │   ├── intent/             # IntentParser agent
│   │   │   ├── location/           # LocationParser agent
│   │   │   ├── routing/            # EnhancedRoutingAgent
│   │   │   └── scouting/           # VenueScout (Google Places / Tavily / GPT-4o)
│   │   │                           # and TavilyScout (venue discovery via Tavily)
│   │   ├── api/
│   │   │   └── routes/             # adventures, auth, analytics, chat,
│   │   │                           # saved_adventures, share, social, system, testing
│   │   ├── core/
│   │   │   ├── auth/               # JWT and bcrypt authentication
│   │   │   ├── rag/                # ChromaDB RAG system
│   │   │   ├── telemetry.py        # OpenTelemetry tracing setup
│   │   │   └── config.py           # Settings from env / GCP Secret Manager
│   │   ├── database/
│   │   │   └── repositories/       # MongoDB repositories (users, analytics, chat, queries)
│   │   ├── models/                 # Pydantic models including GenerationOptions
│   │   ├── services/               # Analytics service
│   │   └── utils/                  # Logger, validators
│   ├── tests/
│   ├── Dockerfile
│   ├── cloudbuild.yaml
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── api/                    # adventures, analytics, auth, chat, client, savedAdventures
│       ├── components/             # AdventureForm, EnhancedAdventureCard, NavigationBar,
│       │   │                       # ProgressTracker, ShareCard, SurpriseButton,
│       │   │                       # GroupModeModal, OnboardingModal, OutOfScopeMessage,
│       │   │                       # ChatSidebar, LocationDetector, and others
│       │   └── common/             # GlassButton, GlassCard, GlassInput, StatCard, and others
│       ├── contexts/               # AuthContext, ThemeContext
│       ├── hooks/                  # useAdventures, useChatHistory, useIsMobile,
│       │                           # useLocationDetection
│       ├── pages/                  # Home, Adventures, Analytics, Observability, Saved,
│       │                           # Shared, Social, Login, Register, About
│       ├── types/                  # adventure.ts, api.ts
│       └── utils/                  # formatters.ts
│
├── miniquest-mobile/
│   ├── app/
│   │   ├── (auth)/                 # login.tsx, register.tsx
│   │   ├── (tabs)/                 # home.tsx, saved.tsx, _layout.tsx (tab bar)
│   │   └── _layout.tsx             # Root layout with AuthProvider and route guards
│   ├── api/                        # client.ts (Axios, reads token from expo-secure-store)
│   ├── components/                 # AdventureCard.tsx
│   ├── constants/                  # theme.ts (Colors object)
│   ├── contexts/                   # AuthContext.tsx
│   └── assets/                     # App icons (iOS, Android adaptive, monochrome, splash)
│
├── deploy-backend.ps1
├── deploy-frontend.ps1
├── deploy-all.ps1
├── docker-compose.yml
└── .env.example
```

---

## API endpoints

**Auth** (`/api/auth`)
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

**Adventures** (`/api/adventures`)
```
POST   /api/adventures
GET    /api/adventures/history
```

**Saved Adventures** (`/api/saved-adventures`)
```
POST   /api/saved-adventures
GET    /api/saved-adventures
GET    /api/saved-adventures/{id}
PUT    /api/saved-adventures/{id}
DELETE /api/saved-adventures/{id}
GET    /api/saved-adventures/personalization/insights
```

**Chat** (`/api/chat`)
```
POST   /api/chat/conversations
GET    /api/chat/conversations
GET    /api/chat/conversations/{id}
DELETE /api/chat/conversations/{id}
```

**Share** (`/api/share`)
```
POST   /api/share
GET    /api/share/{share_id}
```

**Social** (`/api/social`)
```
GET    /api/social
POST   /api/social
POST   /api/social/{post_id}/like
POST   /api/social/{post_id}/comments
DELETE /api/social/{post_id}
```

**Analytics and system**
```
GET    /api/analytics/summary
GET    /api/performance/cache/stats
GET    /api/performance/info
GET    /health
GET    /api/status
GET    /docs
```

---

## Local development

**Prerequisites:** Python 3.11+, Node.js 18+, Docker Desktop, MongoDB Atlas account, OpenAI and Tavily API keys.

```bash
cp .env.example .env
# Fill in OPENAI_API_KEY, TAVILY_API_KEY, MONGODB_URL, JWT_SECRET_KEY

docker-compose up -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

**Backend only:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend only:**
```bash
cd frontend
npm install
npm run dev
```

**Mobile:**
```bash
cd miniquest-mobile
npm install
npx expo start
# Press 'a' for Android emulator, 'i' for iOS simulator, 'w' for web
```

---

## Deployment

Three PowerShell scripts in the project root handle all deployment. They require `gcloud` and `firebase` CLIs authenticated.

**Full stack:**
```powershell
.\deploy-all.ps1
```

**Backend only:**
```powershell
.\deploy-backend.ps1

# Force Cloud Build instead of local Docker push
.\deploy-backend.ps1 -ForceCloudBuild

# Skip build and push, redeploy existing image
.\deploy-backend.ps1 -SkipBuild -SkipPush

# Tail logs after deploy
.\deploy-backend.ps1 -WatchLogs
```

**Frontend only:**
```powershell
.\deploy-frontend.ps1

# Skip the npm build step
.\deploy-frontend.ps1 -SkipBuild
```

The backend script attempts a local Docker push to Artifact Registry and falls back to Cloud Build automatically on failure. The frontend script runs `npm run build` then `firebase deploy --only hosting`. Firebase must be initialized from inside the `frontend/` directory.

**Post-deployment checks:**
```powershell
gcloud run services logs tail miniquest-backend --region us-east1
gcloud run services describe miniquest-backend --region us-east1
```

---

## Environment variables

```bash
# Required
OPENAI_API_KEY=
TAVILY_API_KEY=
MONGODB_URL=
JWT_SECRET_KEY=

# Optional
GOOGLE_MAPS_KEY=
REDIS_URL=
MBTA_API_KEY=

# App settings
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
ACCESS_TOKEN_EXPIRE_MINUTES=30
CHROMADB_PATH=./chromadb
EMBEDDING_MODEL=text-embedding-3-small

# Frontend (Vite) — set in frontend/.env
VITE_API_URL=https://miniquest-backend-633153384860.us-east1.run.app
VITE_OBSERVABILITY_ENABLED=false   # set to true to enable /observability
```

All production values are stored in GCP Secret Manager and injected into Cloud Run at runtime via `--set-secrets`.

---

## Testing

```bash
cd backend

pytest
pytest --cov=app tests/

python tests/test_rag_personalization.py
python tests/test_optimized_system.py
python tests/tavily_diagnostic.py "Thinking Cup" "Boston"
python tests/check_auth.py
python tests/quick_test.py
```