author: Shreyas
summary: MiniQuest - AI-Powered Local Adventure Planner, Complete Technical Documentation
id: miniquest-technical-complete
categories: AI, Multi-Agent Systems, LangGraph, Tavily API, GCP
environments: Web
status: Published
analytics account: 0

# MiniQuest: Complete Technical Documentation

## Overview
Duration: 5

### What is MiniQuest?

MiniQuest is a production-ready AI-powered local adventure planner. You describe what you are in the mood for, and it generates three complete single-day itineraries backed by real-time research. It currently operates **across the United States**.

It is not a recommendation list. Each itinerary includes ordered venues, travel routes, live hours and prices, per-step transit directions, and a narrative connecting the stops. Results improve over time through RAG-based personalization built on your history.

### Key Capabilities

- Natural language intent parsing with meal, time-of-day, group-size, and vibe-word awareness
- Three-path venue discovery: Google Places (primary), Tavily (fallback), GPT-4o knowledge (last resort)
- Real-time venue research across up to 18 venues in parallel
- RAG-based personalization using ChromaDB and OpenAI embeddings
- Google Maps route optimization with per-step transit directions
- Live MBTA transit integration for Boston itineraries
- Redis research caching with 90%+ hit rate on warm cache
- Configurable generation: stops per adventure (1–6) and diversity mode (standard / high / fresh)
- Progressive streaming: each adventure emitted to the frontend as soon as it is ready
- Full user auth, saved adventures, sharing, social feed, and analytics

### Technology Stack

**Backend:**
- Python 3.11, FastAPI, LangGraph
- OpenAI GPT-4o and GPT-4o-mini
- Tavily API (search and extract)
- MongoDB Atlas, ChromaDB, Redis
- Google Maps API, MBTA V3 API

**Frontend:**
- React 18 with TypeScript, Vite
- Glassmorphism design, dark/light theme system
- React Native 0.83, Expo SDK 55 (mobile)

**Infrastructure:**
- GCP Cloud Run (backend, us-east1)
- Firebase Hosting (frontend)
- GCP Artifact Registry, Cloud Build, Secret Manager
- MongoDB Atlas, Redis

## System Architecture
Duration: 8

### High-Level Overview

```
Browser / Mobile App
        |
        | HTTPS
        v
  Firebase Hosting          GCP Cloud Run (us-east1)
  (React SPA)    ---------> FastAPI Backend
                                |
                         LangGraph Coordinator
                                |
                    +-----------+-----------+
                    |           |           |
               6 Agents      Redis       MongoDB
               (sequential   (cache)      Atlas
                pipeline)
                    |
               ChromaDB      Tavily API    OpenAI API
               (RAG)         (research)    (LLM)
```

### The 6-Agent Pipeline

The workflow is a LangGraph `StateGraph`. Each node receives the full accumulated `AdventureState` and returns a partial update. After IntentParser, a conditional edge short-circuits the pipeline to `END` for out-of-scope or clarification-needed errors.

| Step | Node | Agent | Progress |
|---|---|---|---|
| 1 | `parse_location` | LocationParser | 14% |
| 1.5 | `get_personalization` | RAG System | 29% |
| 2 | `parse_intent` | IntentParser | 28% |
| 3 | `scout_venues` | VenueScout | 43% |
| 4 | `research_venues` | TavilyResearch | 71% |
| 5 | `enhance_routing` | RoutingAgent | 85% |
| 6 | `create_adventures` | AdventureCreator | 100% |

Positive
: `research_summary_agent.py` still exists on disk but its node was removed from the active graph, saving 3–15 seconds per generation. Its work is absorbed by TavilyResearch and AdventureCreator directly.

### Edge Map

```
parse_location → get_personalization → parse_intent
parse_intent → scout_venues  (in scope)
parse_intent → END           (out of scope / clarification needed)
scout_venues → research_venues → enhance_routing → create_adventures → END
```

### Workflow State

Defined in `workflow_state.py` as `AdventureState(TypedDict, total=False)`:

```python
user_input: str
user_address: Optional[str]
user_id: Optional[str]
generation_options: Optional[Dict]   # stops_per_adventure, diversity_mode, exclude_venues

target_location: Optional[str]
location_parsing_info: Optional[Dict]
parsed_preferences: Optional[Dict]
user_personalization: Optional[Dict]

scouted_venues: List[Dict]
researched_venues: List[Dict]
enhanced_locations: List[Dict]
final_adventures: List[Dict]

metadata: Dict
error: Optional[Dict]
progress_updates: List[Dict]
```

### Performance

| Scenario | Time |
|---|---|
| Cold cache, full pipeline | ~20s |
| Warm cache (90%+ hit rate) | ~4s |
| Fully cached | ~1.5s |

TavilyResearch accounts for most cold-cache time. It runs up to 18 parallel searches using `asyncio.TaskGroup`. AdventureCreator creates all three itineraries concurrently using `asyncio.as_completed`, streaming each one to the frontend as it finishes.

## Backend - Agents
Duration: 15

### LocationParser

`location_parser.py` uses pattern matching to extract explicit location names from the query first, then normalizes via GPT-4o-mini to handle cities, landmarks, parks, and neighborhoods. The `user_address` field is preserved in state as the routing origin but does not override a location name found in the query text. Defaults to `Boston, MA` if nothing is found.

### IntentParser

`intent_parser.py` enforces the Boston/NYC city constraint before any parsing. Out-of-scope queries (unsupported cities, international travel, multi-day trips, accommodation, trip budgets) are caught here and short-circuit the pipeline.

A `VIBE_TO_VENUES` mapping translates casual language to concrete venue categories before the GPT-4o-mini call:

```
"chill"       → coffee shops, parks, bookstores, cafes
"party"       → bars, nightlife, cocktail bars, rooftop bars, dance clubs
"date night"  → wine bars, restaurants, cocktail bars, romantic venues
"birthday"    → bars, rooftop bars, nightlife, cocktail bars
```

Extracted fields: `preferences`, `activities`, `themes`, `meal_context`, `time_of_day`, `group_size`, `special_occasion`.

### VenueScout

`venue_scout.py` uses three discovery paths in priority order:

**Path 1 - Google Places** (when `GOOGLE_MAPS_KEY` is set)
- Geocodes the city/address to lat/lng
- Runs parallel nearby searches per preference using `asyncio.gather` (up to 6 preferences)
- Uses `PREF_TO_PLACE_TYPE` for type searches and `PREF_TO_SEARCH_QUERY` for text searches on specific categories like "rooftop bars" or "brunch spots"
- Deduplicates, selects a diverse set of up to 12 venues
- Batch-fetches official websites for all venues via `_fetch_websites_for_venues`

**Path 2 - Tavily** (`tavily_scout.py`, when Google Maps is unavailable)
- `TavilyVenueScout` builds search queries per preference and runs up to 6 concurrent Tavily searches
- `diversity_mode` controls query variation: `standard` = deterministic, `high` = random modifiers appended, `fresh` = also rotates source domains

**Path 3 - GPT-4o knowledge base** (last resort fallback)

### TavilyResearch

`discovery_agent.py` caps the venue pool at `min(stops * 3, 18)`. For each venue it calls Tavily Search then Tavily Extract, pulling current hours, prices, reviews, and notable details. Runs with 8-way concurrency via `asyncio.TaskGroup`.

Before each call it checks Redis via `research_cache.py`:

```
Key:   venue:{name}:{location}:{date}
Value: JSON research result
TTL:   86400 seconds (24 hours)
```

### RoutingAgent

`enhanced_routing_agent.py` and `google_maps_enhancer.py` resolve each venue to a street-level address using parallel Google Places lookups. Closed businesses detected during lookup are rejected. A name-similarity guard (SequenceMatcher, threshold 0.6) prevents swapping an address from the wrong business.

Google Maps URLs are built with origin, waypoints (up to 9), and destination. For Boston itineraries, live MBTA transit directions are injected per step.

### AdventureCreator

`adventure_creator.py` creates 3 adventures concurrently using `asyncio.as_completed` and streams each one to the frontend as it finishes via an `on_adventure_ready` callback:

```python
tasks = [self._create_single_adventure(i, ...) for i in range(3)]
for coro in asyncio.as_completed(tasks):
    adventure = await coro
    if on_adventure_ready:
        await on_adventure_ready(adventure, len(adventures))
```

The prompt honours `stops_per_adventure` (1–6), `diversity_mode`, and `exclude_venues` from `generation_options`. Each adventure uses a different subset of the venue pool with distinct themes.

### Generation Options

`GenerationOptions` is defined in `api_models.py` and flows through the full stack:

```python
class GenerationOptions(BaseModel):
    stops_per_adventure: int = Field(default=3, ge=1, le=6)
    diversity_mode: str = "standard"   # standard | high | fresh
    exclude_venues: List[str] = []
```

The frontend exposes this as a collapsible options panel with a stops slider and three diversity mode buttons.

### RAG Personalization

`core/rag/rag_system.py` uses ChromaDB with `text-embedding-3-small`. Two collections:

- `user_adventure_history` - one document per saved adventure per user, queried at `get_personalization` to surface preferred themes, locations, and ratings
- `dynamic_location_tips` - Tavily-sourced local tips with an `authenticity_score` for ranking

When a user saves an adventure via `/api/saved-adventures`, it is also written to ChromaDB.

### Telemetry

`core/telemetry.py` initializes OpenTelemetry at FastAPI startup. Span names:

- `miniquest.generate_adventures` - full workflow
- `miniquest.agent.location_parser`
- `miniquest.agent.venue_scout`
- `miniquest.agent.tavily_research`
- `miniquest.agent.routing`
- `miniquest.agent.adventure_creator`

Set `OBSERVABILITY_ENABLED=false` to disable cleanly (substitutes a no-op tracer).

## Backend - API Routes
Duration: 7

### Authentication `/api/auth`

**POST /api/auth/register**
```json
// Request
{ "email": "...", "username": "...", "full_name": "...", "password": "..." }

// Response
{ "access_token": "eyJ...", "token_type": "bearer", "user": { "id": "...", "email": "...", "username": "..." } }
```

**POST /api/auth/login**
```json
// Request
{ "email": "...", "password": "..." }

// Response
{ "access_token": "eyJ...", "token_type": "bearer", "user": { ... } }
```

**GET /api/auth/me** - protected, returns current user.

### Adventures `/api/adventures`

**POST /api/adventures** (protected)
```json
// Request
{
  "user_input": "coffee shops and museums in Boston",
  "user_address": "123 Newbury St, Boston, MA",
  "enable_progress": true,
  "generation_options": {
    "stops_per_adventure": 3,
    "diversity_mode": "standard",
    "exclude_venues": []
  }
}

// Response
{
  "success": true,
  "adventures": [{ "title": "...", "theme": "...", "steps": [...], "map_url": "..." }],
  "metadata": {
    "total_time_seconds": 4.1,
    "cache_hit_rate": "87.5%",
    "personalization_applied": true,
    "timing_breakdown": { "parse_location": 0.3, "research_venues": 2.1 }
  }
}
```

When `enable_progress` is true, SSE progress updates are emitted:
```json
{ "step": "scout_venues", "agent": "VenueScout", "status": "in_progress", "progress": 0.43, "message": "Found 14 venues via Google Places" }
```

Progress statuses: `in_progress`, `complete`, `error`, `clarification_needed`, `adventure_ready`.

### Saved Adventures `/api/saved-adventures`

All protected.

| Method | Path | Description |
|---|---|---|
| POST | /api/saved-adventures | Save an adventure |
| GET | /api/saved-adventures | List saved (`limit`, `completed` params) |
| GET | /api/saved-adventures/{id} | Get one |
| PUT | /api/saved-adventures/{id} | Update rating, notes, tags, completed |
| DELETE | /api/saved-adventures/{id} | Delete |
| GET | /api/saved-adventures/personalization/insights | Personalization insights |

### Chat, Share, Social

**Chat** (`/api/chat`): create, list, get, delete conversations.

**Share** (`/api/share`):
- `POST /api/share` - creates a public link expiring in 30 days
- `GET /api/share/{share_id}` - public, no auth. Returns 404 if not found, 410 if expired.

**Social** (`/api/social`): feed (limit/offset), create post (max 500 chars), toggle like, add comment, delete own post.

### Analytics and System

| Path | Description |
|---|---|
| GET /api/analytics/summary | User analytics |
| GET /api/performance/cache/stats | Redis cache stats |
| GET /api/performance/info | System performance info |
| GET /health | Health check (no auth) |
| GET /api/status | Component status |
| GET /docs | Swagger UI |

## Database Schema
Duration: 6

### MongoDB Collections

**users**
```json
{
  "_id": "ObjectId",
  "email": "user@example.com",
  "username": "johndoe",
  "hashed_password": "$2b$12$...",
  "is_active": true,
  "created_at": "ISODate",
  "total_queries": 15,
  "preferences": { "default_location": "Boston, MA" }
}
```

**user_queries** (lightweight metadata only)
```json
{
  "user_id": "ObjectId",
  "user_input": "coffee shops and bookstores in Boston",
  "adventures_count": 3,
  "adventure_metadata": [{ "title": "...", "theme": "..." }],
  "metadata": {
    "target_location": "Boston, MA",
    "performance": { "total_time_seconds": 4.1 },
    "research_stats": { "cache_hit_rate": "87.5%" }
  },
  "created_at": "ISODate"
}
```

Positive
: Full adventure data is excluded from `user_queries`. It is only stored when the user explicitly saves, reducing storage by ~97%.

**saved_adventures**
```json
{
  "user_id": "ObjectId",
  "adventure_data": {},
  "rating": 5,
  "notes": "Great afternoon",
  "tags": ["coffee", "art"],
  "completed": false,
  "saved_at": "ISODate"
}
```

**chat_conversations**
```json
{
  "user_id": "ObjectId",
  "title": "Coffee tour in Boston",
  "messages": [],
  "location": "Boston, MA",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

`social_posts` and `shared_itineraries` are also active. `shared_itineraries` has a TTL index on `expires_at` so links expire automatically.

### ChromaDB Collections

**user_adventure_history** - one document per saved adventure per user. Embedded with `text-embedding-3-small`. Queried at generation time to personalize venue selection.

**dynamic_location_tips** - Tavily-sourced local tips with an `authenticity_score` field used for ranking.

### Redis Cache

```
Key:   venue:{name}:{location}:{date}
Value: JSON research result
TTL:   86400 seconds (24 hours)
```

Stats available at `/api/performance/cache/stats`.

## Frontend
Duration: 10

### Routing

```
/                   HomePage              public
/login              LoginPage             public only
/register           RegisterPage          public only
/about              AboutPage             public
/app                AdventuresPage        protected
/analytics          AnalyticsPage         protected
/saved-adventures   SavedAdventuresPage   protected
/social             SocialPage            protected
/shared/:shareId    SharedAdventurePage   public
/observability      ObservabilityPage     VITE_OBSERVABILITY_ENABLED=true only
```

### Theme System

`ThemeContext.tsx` persists `dark` or `light` to `localStorage` and sets a `data-theme` attribute on `documentElement`. The `t(isDark)` helper returns a flat object of named color tokens used by every component instead of hardcoded values:

```typescript
import { useTheme, t } from '../contexts/ThemeContext';

const { isDark } = useTheme();
const tk = t(isDark);

<div style={{ background: tk.cardBg, color: tk.textPrimary }}>
```

Token categories: page backgrounds, card surfaces, borders, nav, input fields, sidebar, progress track, step cards, conversation items, buttons, text (primary / secondary / muted / accent), links, blobs.

### AdventuresPage

The main generation interface. Chat panel and adventures panel are side by side on desktop. On mobile, `MobileTabBar` switches between them, and the adventures tab is activated automatically when results arrive.

**Chat input controls:**

- **VibeChipPanel** - 12 quick-select mood chips (Party, Date Night, Drinks, Foodie, Brunch, Chill, Artsy, Active, Birthday, Hidden Gems, Rainy Day, Shopping). Desktop shows 6, mobile shows 4, with an expand toggle for the rest.
- **SurpriseButton** (🎲) - picks randomly from 8 preset prompts and fires immediately.
- **Group mode button** (👥) - opens `GroupModeModal` for up to 6 people with individual preference strings.
- **GenerationOptionsPanel** - collapsible, stops slider (1–6) and diversity mode selector (Standard / High / Fresh).

**Chat panel extras:**

- **ChatSidebar** - slide-in conversation history panel (follows layout mode: left or right). Load or delete any past conversation.
- **ProgressTracker** - per-agent progress during generation with agent-specific messages.
- **OutOfScopeMessage** - typed rejection UI for 5 scope issues: `unsupported_city`, `multi_day_trip`, `international_travel`, `accommodation_planning`, `trip_budget_detected`.

**Modals:**

- **OnboardingModal** - shown on first login (checks `localStorage` for `miniquest_onboarded`). 3-step preference survey (time of day, vibe, companion). Fires an initial generation from the result.
- **GroupModeModal** - up to 6 people with name and preference string. Builds a combined query and fires generation.

**Layout:** a toggle button swaps the chat and adventures panels left/right. Mode is persisted to `localStorage` as `miniquest_layout_mode`.

### AnalyticsPage

Three tabs: overview (theme counts, top locations, ratings), performance (per-agent timing from `metadata.performance.timing_breakdown`), cache (hit rate, time saved, cache size).

### SocialPage

Community feed, max 30 posts. Compose box with 500-char limit and Cmd+Enter to submit. Clickable URLs and preserved newlines in post content. Like/unlike, inline comments (last 5), delete own post with confirm step.

### SharedAdventurePage

Public, no auth required. Fetches by `shareId`. Handles 404 (not found) and 410 (expired) with distinct error UI.

### ObservabilityPage

Gated behind `VITE_OBSERVABILITY_ENABLED=true`. Queries Prometheus-compatible API backed by VictoriaMetrics, proxied through Vite. Shows:

- Total workflow runs (all-time)
- Average end-to-end latency and error count
- Per-agent latency bars - toggle between all-time average and last 2-hour average
- Throughput sparkline (5-minute rolling rate over the past hour)
- Per-agent call counts

Data retained for 12 months. Not linked in navigation unless the flag is set.

### AboutPage

Scroll-triggered fade/slide animations via `IntersectionObserver` (threshold 0.15). Parallax blobs move at different rates with `scrollY`. Sections: hero, 4-step how-it-works, 6-agent list, features grid (Surprise, Group Mode, Save and Rate, Share Links, Community Feed, Analytics), use cases, stats (6 agents, ~4s warm cache, 90%+ cache hit rate, 2 cities), CTA.

### GenerationOptions (frontend)

Defined in `useAdventures.ts`, mirrors the backend Pydantic model:

```typescript
interface GenerationOptions {
  stops_per_adventure: number;        // 1–6, default 3
  diversity_mode: 'standard' | 'high' | 'fresh';
  exclude_venues: string[];
}
```

Last-generated adventures are cached in `localStorage` under `miniquest_last_adventures` and survive a page refresh.

## Mobile App
Duration: 8

### Structure

```
miniquest-mobile/
├── app/
│   ├── _layout.tsx             # Root: AuthProvider + route guard
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (tabs)/
│       ├── _layout.tsx         # Tab bar (Home, Saved)
│       ├── home.tsx            # Adventure generation screen
│       └── saved.tsx           # Saved adventures with delete
├── api/
│   └── client.ts               # Axios, reads token from expo-secure-store
├── components/
│   └── AdventureCard.tsx       # LinearGradient + BlurView native card
├── constants/
│   └── theme.ts                # Colors object
└── contexts/
    └── AuthContext.tsx         # login, logout, isAuthenticated, isLoading
```

### Navigation

Expo Router with two route groups: `(auth)` for unauthenticated screens, `(tabs)` for the main tab bar. Root `_layout.tsx` runs the route guard:

```typescript
useEffect(() => {
  if (isLoading) return;
  const inAuth = segments[0] === '(auth)';
  if (!isAuthenticated && !inAuth) router.replace('/(auth)/login');
  if (isAuthenticated && inAuth) router.replace('/(tabs)/home');
}, [isAuthenticated, isLoading, segments]);
```

### Authentication

Tokens are stored in `expo-secure-store` (device secure enclave). `AuthContext` exposes `login`, `logout`, `isAuthenticated`, `isLoading`.

### UI

`expo-linear-gradient` for screen and card backgrounds. `expo-blur` for frosted glass card surfaces. `AdventureCard.tsx` renders title, theme, steps, duration, and cost. `saved.tsx` supports deletion via `Alert.alert` confirm dialog.

### Dependencies

```json
{
  "expo": "~55.0.4",
  "react-native": "0.83.2",
  "expo-router": "~55.0.3",
  "expo-blur": "~55.0.8",
  "expo-linear-gradient": "~55.0.8",
  "expo-secure-store": "~55.0.8",
  "react-native-gesture-handler": "~2.30.0",
  "react-native-safe-area-context": "~5.6.2",
  "react-native-screens": "~4.23.0",
  "axios": "^1.13.6"
}
```

## Authentication
Duration: 4

### Flow

Passwords are hashed with bcrypt (cost factor 12). On login, `jwt_manager.py` signs a JWT using HS256 with a 256-bit secret from GCP Secret Manager. Tokens expire after 30 minutes.

```
Token payload:
{ "sub": "user@example.com", "user_id": "507f...", "exp": 1640995200 }
```

The frontend attaches tokens via an Axios request interceptor. A response interceptor on 401 clears the token and redirects to `/login`. The backend validates via the `get_current_user` FastAPI dependency injected into all protected routes.

### Security Notes

- CORS: an explicit middleware layer runs before `CORSMiddleware` to handle OPTIONS preflight correctly. Allowed origins are configured per environment.
- All secrets are in GCP Secret Manager, never in the codebase.
- Input validation via Pydantic on all request bodies.
- `testing.py` diagnostic routes should be restricted or removed in a public-facing deployment.

## Deployment
Duration: 10

### Infrastructure

| Component | Service | Detail |
|---|---|---|
| Backend | GCP Cloud Run | us-east1, 1 vCPU, 2 GB, 1–4 instances |
| Frontend | Firebase Hosting | Global CDN |
| Container images | GCP Artifact Registry | us-east1 |
| CI/CD | GCP Cloud Build | `cloudbuild.yaml` |
| Secrets | GCP Secret Manager | us-east1 |
| Database | MongoDB Atlas Cluster0 | Cloud |
| Cache | Redis | Cloud |

GCP project: `project-572cd754-7f2b-465c-b68`

### Deployment Scripts

Three PowerShell scripts in the project root. Require `gcloud` and `firebase` CLIs authenticated.

```powershell
# Full stack
.\deploy-all.ps1

# Backend flags
.\deploy-backend.ps1 -ForceCloudBuild     # use Cloud Build instead of local push
.\deploy-backend.ps1 -SkipBuild -SkipPush # redeploy existing image
.\deploy-backend.ps1 -WatchLogs           # tail logs after deploy

# Frontend flags
.\deploy-frontend.ps1 -SkipBuild          # skip npm run build
```

The backend script tries a local Docker push first and falls back to Cloud Build automatically. The frontend script runs `npm run build` from `frontend/` then `firebase deploy --only hosting`. Firebase init must be run from inside `frontend/`, not the project root.

### Manual Cloud Run Deploy

```powershell
$PROJECT = "project-572cd754-7f2b-465c-b68"
$IMAGE   = "us-east1-docker.pkg.dev/$PROJECT/miniquest/backend:latest"

docker build -t miniquest-backend .
gcloud auth configure-docker us-east1-docker.pkg.dev
docker tag miniquest-backend:latest $IMAGE
docker push $IMAGE

gcloud run deploy miniquest-backend `
    --image $IMAGE `
    --region us-east1 `
    --platform managed `
    --allow-unauthenticated `
    --port 8000 `
    --memory 2Gi `
    --cpu 1 `
    --min-instances 1 `
    --max-instances 4 `
    --set-secrets "OPENAI_API_KEY=OPENAI_API_KEY:latest,TAVILY_API_KEY=TAVILY_API_KEY:latest,MONGODB_URL=MONGODB_URL:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GOOGLE_MAPS_KEY=GOOGLE_MAPS_KEY:latest,REDIS_URL=REDIS_URL:latest" `
    --set-env-vars "ENVIRONMENT=production,DEBUG=false" `
    --project $PROJECT
```

### Secrets Management on Windows

Use `System.IO.File::WriteAllText` with `UTF8Encoding $false`. PowerShell's `Set-Content` introduces a BOM that Secret Manager includes in the secret value.

```powershell
$value = "your-secret-value"
[System.IO.File]::WriteAllText("secret.txt", $value, [System.Text.UTF8Encoding]::new($false))
gcloud secrets versions add SECRET_NAME --data-file="secret.txt" --project $PROJECT
Remove-Item secret.txt
```

### Post-Deployment Checks

```powershell
Invoke-WebRequest https://miniquest-backend-633153384860.us-east1.run.app/health
gcloud run services logs tail miniquest-backend --region us-east1
gcloud run services describe miniquest-backend --region us-east1
```

## Local Development
Duration: 8

### Quick Start with Docker

```bash
cp .env.example .env
# Fill in OPENAI_API_KEY, TAVILY_API_KEY, MONGODB_URL, JWT_SECRET_KEY

docker-compose up -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
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
# 'a' = Android emulator  'i' = iOS simulator  'w' = web
```

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
MONGODB_URL=mongodb+srv://...
JWT_SECRET_KEY=...

# Optional
GOOGLE_MAPS_KEY=...
REDIS_URL=redis://localhost:6379
MBTA_API_KEY=...

# App settings
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
ACCESS_TOKEN_EXPIRE_MINUTES=30
CHROMADB_PATH=./chromadb
EMBEDDING_MODEL=text-embedding-3-small

# Frontend (frontend/.env)
VITE_API_URL=http://localhost:8000
VITE_OBSERVABILITY_ENABLED=false
```

### Common Issues

Negative
: **CORS error** - verify `VITE_API_URL` in `frontend/.env` and confirm the backend CORS config includes `http://localhost:3000`.

Negative
: **JWT invalid** - clear `localStorage` in the browser and log in again.

Negative
: **MongoDB connection failed** - verify `MONGODB_URL` and check that your IP is whitelisted in MongoDB Atlas Network Access.

Negative
: **Firebase deploy fails** - confirm `firebase init` was run from inside `frontend/`, not the project root.

Negative
: **Secret Manager BOM on Windows** - use `System.IO.File::WriteAllText` with `UTF8Encoding $false`. See the Deployment section.

### Running Tests

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

## Key Takeaways
Duration: 2

Positive
: **6-agent pipeline** - LocationParser, IntentParser, VenueScout, TavilyResearch, RoutingAgent, AdventureCreator. Each is independently testable and optimizable.

Positive
: **Three-path venue discovery** - Google Places is the primary path with proximity-ranked, geocoded results. Tavily and GPT-4o are progressively cheaper fallbacks.

Positive
: **Progressive streaming** - adventures are emitted one by one via SSE as each finishes, so the user sees results immediately rather than waiting for all three.

Positive
: **Fully deployed on GCP** - Cloud Run backend, Firebase Hosting frontend, all secrets in Secret Manager. Deployment is a single PowerShell command.

Positive
: **RAG personalization** - ChromaDB embeddings learn from every saved and rated adventure, improving recommendations over time.

### By the Numbers

- **6 active agents** in the pipeline
- **~4 seconds** on a warm cache
- **90%+ cache hit rate** reducing Tavily API calls
- **~97% storage reduction** from lightweight query schema
- **2 cities** supported: Boston and New York City

## Resources
Duration: 1

### Live Deployment

- **Web app:** https://project-572cd754-7f2b-465c-b68.web.app
- **Backend API:** https://miniquest-backend-633153384860.us-east1.run.app
- **API docs:** https://miniquest-backend-633153384860.us-east1.run.app/docs
- **Health check:** https://miniquest-backend-633153384860.us-east1.run.app/health

### References

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Tavily API Docs](https://docs.tavily.com)
- [FastAPI](https://fastapi.tiangolo.com)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [ChromaDB](https://docs.trychroma.com)
- [GCP Cloud Run](https://cloud.google.com/run/docs)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)