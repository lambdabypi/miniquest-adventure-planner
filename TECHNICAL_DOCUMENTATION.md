# MiniQuest Technical Documentation

**Version:** 2.0
**Last Updated:** March 2026
**Architecture:** Multi-Agent LangGraph System with Real-Time Research

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Backend](#3-backend)
4. [Frontend](#4-frontend)
5. [Mobile](#5-mobile)
6. [Database Schema](#6-database-schema)
7. [API Reference](#7-api-reference)
8. [Authentication](#8-authentication)
9. [Deployment](#9-deployment)
10. [Local Development](#10-local-development)

---

## 1. System Overview

### 1.1 What MiniQuest does

MiniQuest generates personalized single-day adventure itineraries for Boston, MA and New York City, NY. A user submits a natural language request and the system produces three complete, research-backed itineraries with real venue data, travel routes, and transit directions. It learns from a user's history over time using a RAG-based personalization layer built on ChromaDB.

### 1.2 Key capabilities

- Natural language intent parsing with meal, time-of-day, group-size, and vibe-word awareness
- Three-path venue discovery: Google Places (primary), Tavily (fallback), GPT-4o knowledge (last resort)
- Real-time venue research via Tavily, run across up to 18 venues in parallel
- RAG-based personalization using ChromaDB and OpenAI embeddings
- Google Maps route optimization with per-step transit directions
- Live MBTA transit integration for Boston itineraries
- Redis research caching with 90%+ hit rate on warm cache
- Configurable generation: stops per adventure (1-6) and diversity mode (standard, high, fresh)
- Progressive streaming: each adventure is emitted to the frontend as soon as it is ready
- Full user auth, saved adventures, sharing, social feed, and analytics

### 1.3 Technology stack

| Layer | Technologies |
|---|---|
| Backend | Python 3.11, FastAPI, LangGraph |
| LLM | OpenAI GPT-4o, GPT-4o-mini |
| Research | Tavily API (search and extract) |
| Database | MongoDB Atlas, Redis, ChromaDB |
| Routing | Google Maps API, MBTA V3 API |
| Frontend | React 18, TypeScript, Vite |
| Mobile | React Native 0.83, Expo SDK 55 |
| Infra | GCP Cloud Run, Firebase Hosting, GCP Secret Manager |

---

## 2. Architecture

### 2.1 High-level overview

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

### 2.2 Agent pipeline

The workflow is built as a LangGraph `StateGraph`. Each node receives the full accumulated `AdventureState` and returns a partial update that is merged in. After IntentParser, a conditional edge checks for clarification-needed or out-of-scope errors and short-circuits the pipeline to `END` if found.

| Step | Node name | Agent | Progress |
|---|---|---|---|
| 1 | `parse_location` | LocationParser | 14% |
| 1.5 | `get_personalization` | RAG System | 29% |
| 2 | `parse_intent` | IntentParser | 28% |
| 3 | `scout_venues` | VenueScout | 43% |
| 4 | `research_venues` | TavilyResearch | 71% |
| 5 | `enhance_routing` | RoutingAgent | 85% |
| 6 | `create_adventures` | AdventureCreator | 100% |

The `get_personalization` node runs between LocationParser and IntentParser. It queries ChromaDB for the user's history and injects preferred themes, favorite locations, and past ratings into the state before venue scouting begins.

The ResearchSummary agent (`discovery/research_summary_agent.py`) still exists on disk but its node was removed from the active graph. Its function is absorbed by TavilyResearch and AdventureCreator directly, saving 3-15 seconds per generation.

Edge map:
```
parse_location → get_personalization → parse_intent
parse_intent → scout_venues (if in scope) | END (if out of scope)
scout_venues → research_venues → enhance_routing → create_adventures → END
```

### 2.3 Workflow state

Defined in `workflow_state.py` as `AdventureState(TypedDict, total=False)`:

```python
user_input: str
user_address: Optional[str]
user_id: Optional[str]
generation_options: Optional[Dict]      # stops_per_adventure, diversity_mode, exclude_venues

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
performance_metrics: Optional[Dict]
progress_updates: List[Dict]
current_step: Optional[str]
current_agent: Optional[str]
step_progress: Optional[Dict]
```

### 2.4 Performance

| Scenario | Time |
|---|---|
| Cold cache, full pipeline | ~20s |
| Warm cache (90%+ hit rate) | ~4s |
| Fully cached | ~1.5s |

TavilyResearch accounts for most cold-cache time. It runs up to 18 parallel searches using `asyncio.TaskGroup`. AdventureCreator creates all three itineraries concurrently using `asyncio.as_completed`, streaming each one to the frontend as it finishes.

---

## 3. Backend

### 3.1 Directory structure

```
backend/
├── app/
│   ├── main.py                         # FastAPI app, router registration, lifespan
│   ├── agents/
│   │   ├── base/
│   │   │   └── base_agent.py           # BaseAgent with logging, validation, response helpers
│   │   ├── coordination/
│   │   │   ├── langgraph_coordinator.py
│   │   │   └── workflow_state.py       # AdventureState TypedDict
│   │   ├── creation/
│   │   │   └── adventure_creator.py    # GPT-4o itinerary generation with progressive streaming
│   │   ├── discovery/
│   │   │   ├── discovery_agent.py      # Parallel Tavily research (up to 18 venues)
│   │   │   ├── query_strategy.py       # Tavily search query construction
│   │   │   ├── research_cache.py       # Redis cache wrapper (24h TTL)
│   │   │   └── research_summary_agent.py  # Inactive - kept on disk, not in workflow
│   │   ├── intent/
│   │   │   └── intent_parser.py        # NL parsing, city guardrails, vibe-to-venue mapping
│   │   ├── location/
│   │   │   └── location_parser.py      # Location resolution, Boston/NYC enforcement
│   │   ├── routing/
│   │   │   └── enhanced_routing_agent.py  # Address resolution, Maps links, transit directions
│   │   └── scouting/
│   │       ├── venue_scout.py          # 3-path discovery: Google Places / Tavily / GPT-4o
│   │       └── tavily_scout.py         # Tavily-based venue discovery with diversity modes
│   ├── api/
│   │   ├── dependencies.py
│   │   └── routes/
│   │       ├── adventures.py
│   │       ├── analytics.py
│   │       ├── auth.py
│   │       ├── chat.py
│   │       ├── saved_adventures.py
│   │       ├── share.py
│   │       ├── social.py
│   │       ├── system.py
│   │       └── testing.py
│   ├── core/
│   │   ├── config.py
│   │   ├── progress_tracker.py
│   │   ├── telemetry.py                # OpenTelemetry setup
│   │   └── auth/
│   │       ├── auth_handler.py
│   │       ├── jwt_manager.py
│   │       └── password_manager.py
│   │   └── rag/
│   │       ├── chroma_manager.py
│   │       ├── rag_system.py
│   │       ├── tavily_discovery.py
│   │       └── tip_processor.py
│   ├── database/
│   │   ├── connection.py
│   │   ├── mongodb_client.py
│   │   └── repositories/
│   │       ├── analytics_repository.py
│   │       ├── chat_repository.py
│   │       ├── query_repository.py
│   │       └── user_repository.py
│   ├── models/
│   │   ├── adventure_models.py
│   │   ├── api_models.py               # GenerationOptions, AdventureRequest, AdventureResponse
│   │   ├── auth_models.py
│   │   ├── chat_models.py
│   │   ├── share_models.py
│   │   └── social_models.py
│   ├── services/
│   │   └── analytics_service.py
│   └── utils/
│       ├── logger.py
│       └── validators.py
├── tests/
│   ├── check_auth.py
│   ├── quick_test.py
│   ├── tavily_diagnostic.py
│   ├── test_optimized_system.py
│   └── test_rag_personalization.py
├── Dockerfile / Dockerfile.dev / Dockerfile.prod
├── cloudbuild.yaml
└── requirements.txt
```

### 3.2 LangGraph coordinator

`langgraph_coordinator.py` owns the full workflow. It initializes all six agents, builds the `StateGraph`, and exposes two entry points: `generate_adventures` (fire-and-forget) and `generate_adventures_with_progress` (SSE streaming with a progress callback). Both wrap execution in an OTel span named `miniquest.generate_adventures`.

Each agent node is also wrapped in its own span (`miniquest.agent.<key>`), making per-agent latency visible in the Observability dashboard.

The coordinator also handles:
- Typo-tolerant venue name matching with `SequenceMatcher` (similarity threshold 0.6) to prevent wrong-business address substitution
- Parallel Google Places branch lookups using `asyncio.gather` in `_enhance_routing_node`
- Google Maps URL construction for routes with up to 9 waypoints

### 3.3 LocationParser

`location_parser.py` uses pattern matching to extract explicit location names from the query first. It then normalizes via GPT-4o-mini to handle cities, landmarks, parks, and neighborhoods. The `user_address` field is preserved in state for use as the routing origin but does not override a location name found in the query text.

If parsing fails entirely, it defaults to `Boston, MA`.

### 3.4 IntentParser

`intent_parser.py` enforces the Boston/NYC city constraint before parsing. Out-of-scope queries (unsupported cities, international destinations, multi-day trips, accommodation planning, trip budgets) are caught here and short-circuit the workflow via the conditional edge after `parse_intent`.

A `VIBE_TO_VENUES` dict maps casual language to concrete venue categories before the GPT-4o-mini call:

```
"chill"       → coffee shops, parks, bookstores, cafes
"party"       → bars, nightlife, cocktail bars, rooftop bars, dance clubs
"date night"  → wine bars, restaurants, cocktail bars, romantic venues
"birthday"    → bars, rooftop bars, nightlife, cocktail bars
```

Extracted fields: `preferences`, `activities`, `themes`, `meal_context`, `time_of_day`, `group_size`, `special_occasion`.

### 3.5 VenueScout

`venue_scout.py` uses three discovery paths in priority order:

**Path 1: Google Places** (used when `GOOGLE_MAPS_KEY` is set)
- Geocodes the city/address to get a lat/lng origin
- Runs parallel nearby searches per preference using `asyncio.gather` (up to 6 preferences)
- Uses `PREF_TO_PLACE_TYPE` for nearby type searches and `PREF_TO_SEARCH_QUERY` for text searches on specific categories like "brunch spots" or "rooftop bars"
- Deduplicates and selects a diverse set of up to 12 venues
- Batch-fetches official websites for all venues via `_fetch_websites_for_venues`

**Path 2: Tavily** (`tavily_scout.py`, used when Google Maps is unavailable)
- `TavilyVenueScout` builds search queries per preference and runs up to 6 concurrent Tavily searches
- `diversity_mode` controls query variation: `standard` is deterministic, `high` appends random modifiers, `fresh` also rotates source domains

**Path 3: GPT-4o knowledge base** (last resort fallback)

### 3.6 TavilyResearch

`discovery_agent.py` researches the scouted venues. It caps the venue pool at `min(stops * 3, 18)` to avoid over-researching. For each venue it calls Tavily Search followed by Tavily Extract, pulling current hours, prices, reviews, and notable details.

Before each Tavily call it checks Redis via `research_cache.py`. Cache keys follow `venue:{name}:{location}:{date}` with a 24-hour TTL.

Research runs with 8-way concurrency using `asyncio.TaskGroup`.

### 3.7 RoutingAgent

`enhanced_routing_agent.py` and `google_maps_enhancer.py` work together. The routing node resolves each researched venue to a street-level address using parallel Google Places lookups (`asyncio.gather`). Closed businesses detected during lookup are rejected. A name-similarity guard (SequenceMatcher, threshold 0.6) prevents swapping an address from a different business.

Google Maps URLs are built with origin, waypoints (up to 9), and destination. Walking is the default travel mode.

For Boston itineraries, per-step MBTA transit directions are injected. Static transit hints cover NYC and other cities.

### 3.8 AdventureCreator

`adventure_creator.py` receives the full accumulated state. It builds venue profiles from `researched_venues` and `enhanced_locations`, then creates 3 adventures concurrently:

```python
tasks = [self._create_single_adventure(i, ...) for i in range(3)]
for coro in asyncio.as_completed(tasks):
    adventure = await coro
    # emitted immediately via on_adventure_ready callback (SSE)
```

The prompt honors `stops_per_adventure` (1-6), `diversity_mode`, and `exclude_venues` from `generation_options`. Each adventure uses a different subset of the venue pool and themes are kept distinct across the three.

### 3.9 Generation options

`GenerationOptions` (defined in `api_models.py`) is passed through the full stack from the frontend request to AdventureCreator and TavilyVenueScout:

```python
class GenerationOptions(BaseModel):
    stops_per_adventure: int = Field(default=3, ge=1, le=6)
    diversity_mode: str = "standard"   # standard | high | fresh
    exclude_venues: List[str] = []
```

The frontend exposes these as a collapsible options panel in AdventuresPage with a stops slider and three diversity mode buttons.

### 3.10 RAG personalization

`core/rag/rag_system.py` uses ChromaDB with `text-embedding-3-small` embeddings. Two collections:

- `user_adventure_history` - one document per saved adventure per user. Queried at the `get_personalization` node to surface preferred themes, locations, and ratings.
- `dynamic_location_tips` - Tavily-sourced local tips with an `authenticity_score` used for ranking.

When a user saves an adventure via `/api/saved-adventures`, it is also written to ChromaDB. The more adventures a user saves and rates, the more personalized subsequent generations become.

### 3.11 Telemetry

`core/telemetry.py` initializes OpenTelemetry at FastAPI startup. Spans are exported via OTLP HTTP (default endpoint `http://host.docker.internal:4318/v1/traces`).

Span names:
- `miniquest.generate_adventures` - full workflow
- `miniquest.agent.location_parser`
- `miniquest.agent.venue_scout`
- `miniquest.agent.tavily_research`
- `miniquest.agent.routing`
- `miniquest.agent.adventure_creator`

Set `OBSERVABILITY_ENABLED=false` to disable cleanly (substitutes a no-op tracer).

---

## 4. Frontend

### 4.1 Directory structure

```
frontend/src/
├── api/
│   ├── client.ts               # Axios instance with JWT interceptor
│   ├── adventures.ts
│   ├── analytics.ts
│   ├── auth.ts
│   ├── chat.ts
│   └── savedAdventures.ts
├── components/
│   ├── AdventureForm.tsx
│   ├── ChatSidebar.tsx         # Slide-in conversation history panel
│   ├── EnhancedAdventureCard.tsx
│   ├── GroupModeModal.tsx      # Multi-person preference input
│   ├── LoadingState.tsx
│   ├── LocationDetector.tsx
│   ├── NavigationBar.tsx
│   ├── OnboardingModal.tsx     # First-login 3-step preference survey
│   ├── OutOfScopeMessage.tsx   # Typed scope rejection UI
│   ├── ProgressTracker.tsx
│   ├── ShareCard.tsx
│   ├── SurpriseButton.tsx      # One-click random itinerary
│   └── common/
│       ├── BackgroundOrbs.tsx
│       ├── EmptyState.tsx
│       ├── FeatureCard.tsx
│       ├── GlassButton.tsx
│       ├── GlassCard.tsx
│       ├── GlassInput.tsx
│       ├── LoadingState.tsx
│       ├── PasswordInput.tsx
│       ├── PasswordStrengthIndicator.tsx
│       ├── StatBadge.tsx
│       ├── StatCard.tsx
│       ├── TechBadge.tsx
│       └── ThemeCard.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── hooks/
│   ├── useAdventures.ts        # Generation state, SSE streaming, GenerationOptions
│   ├── useChatHistory.ts
│   ├── useIsMobile.ts          # matchMedia listener, 768px breakpoint
│   └── useLocationDetection.ts
├── pages/
│   ├── AboutPage.tsx
│   ├── AdventuresPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── ObservabilityPage.tsx   # Feature-flagged OTel dashboard
│   ├── RegisterPage.tsx
│   ├── SavedAdventuresPage.tsx
│   ├── SharedAdventurePage.tsx
│   └── SocialPage.tsx
├── types/
│   ├── adventure.ts            # Adventure, AdventureStep, VenueWithResearch, RoutingInfo
│   └── api.ts                  # AdventureRequest, AdventureResponse, ProgressUpdate, etc.
└── utils/
    └── formatters.ts
```

### 4.2 Routing

```
/                   HomePage              (public)
/login              LoginPage             (public only)
/register           RegisterPage          (public only)
/about              AboutPage             (public)
/app                AdventuresPage        (protected)
/analytics          AnalyticsPage         (protected)
/saved-adventures   SavedAdventuresPage   (protected)
/social             SocialPage            (protected)
/shared/:shareId    SharedAdventurePage   (public)
/observability      ObservabilityPage     (feature-flagged: VITE_OBSERVABILITY_ENABLED=true)
```

### 4.3 Theme system

`ThemeContext.tsx` persists `dark` or `light` to `localStorage` under `miniquest_theme` and sets a `data-theme` attribute on `documentElement`. The `t(isDark)` helper function returns a flat object of named color tokens covering every surface in the app. All components use this instead of hardcoded values:

```typescript
import { useTheme, t } from '../contexts/ThemeContext';

const { isDark } = useTheme();
const tk = t(isDark);

// Usage:
<div style={{ background: tk.cardBg, color: tk.textPrimary }}>
```

Token categories: page backgrounds, card surfaces, borders, nav, input fields, sidebar, progress track, step cards, conversation items, research highlights, buttons (logout, secondary), text (primary, secondary, muted, accent, green), links, blobs.

### 4.4 Mobile responsiveness

`useIsMobile.ts` uses a `matchMedia` listener at 768px. On small screens:

- `AdventuresPage` switches to a tab bar layout (Chat tab / Adventures tab)
- `NavigationBar` renders a hamburger button with a slide-down dropdown containing user info, nav links, and auth buttons
- Vibe chips collapse to 4 visible (desktop shows 6) with an expand toggle

### 4.5 AdventuresPage

The main generation interface. Key sub-components rendered inline:

**Chat input area:**
- `VibeChipPanel` - 12 quick-select mood chips (Party, Date Night, Drinks, Foodie, Brunch, Chill, Artsy, Active, Birthday, Hidden Gems, Rainy Day, Shopping). Each fires a preset query string.
- `SurpriseButton` (🎲) - picks randomly from 8 preset prompts and fires immediately
- Group mode button (👥) - opens `GroupModeModal`
- `GenerationOptionsPanel` - collapsible, shows stops slider (1-6) and diversity mode selector (Standard / High / Fresh)
- Send button

**Chat panel:**
- `ChatSidebar` - slide-in from left or right (follows layout mode), shows conversation list with load and delete. Opened via a button in the chat header.
- `ProgressTracker` - per-agent progress during generation
- `OutOfScopeMessage` - rendered for 5 scope rejection types: `unsupported_city`, `multi_day_trip`, `international_travel`, `accommodation_planning`, `trip_budget_detected`

**Layout:**
- Toggle button to swap chat and adventures panels left/right. Mode persisted to `localStorage` as `miniquest_layout_mode`.
- On mobile: `MobileTabBar` at the bottom switches between Chat and Adventures. Automatically switches to Adventures tab when results arrive.

**Modals:**
- `OnboardingModal` - shown on first login (checks `localStorage` for `miniquest_onboarded`). 3-step survey asking about time of day preference, vibe, and companion. Fires an initial generation from the collected answers.
- `GroupModeModal` - up to 6 people, each with a name and preference string. Builds a combined query and fires generation.

**Address validation** enforces Boston and NYC only. Detected city auto-updates the default location string as the user types their query.

### 4.6 AnalyticsPage

Three tabs: overview (theme counts, top locations, average rating, favorite themes), performance (timing breakdown per pipeline stage from `metadata.performance.timing_breakdown`), and cache (hit rate, time saved, cache size from `/api/performance/cache/stats`).

### 4.7 SocialPage

Community feed capped at 30 posts. Compose box supports up to 500 characters, Cmd+Enter to submit. Each post renders clickable URLs and preserved newlines. Users can like/unlike, comment (last 5 shown inline), and delete their own posts with a confirm step.

### 4.8 SharedAdventurePage

Public, no auth required. Fetches by `shareId` from `/api/share/:shareId`. Handles 404 (not found) and 410 (expired link) with distinct error states.

### 4.9 ObservabilityPage

Gated behind `VITE_OBSERVABILITY_ENABLED=true`. Queries a Prometheus-compatible API backed by VictoriaMetrics, proxied through Vite. Shows:
- Total workflow runs (all-time)
- Average end-to-end latency
- Error count
- Per-agent latency bars - toggleable between all-time average and last 2-hour average
- Throughput sparkline (5-minute rolling rate over the past hour)
- Per-agent call counts

Data is retained for 12 months. Page is not linked in navigation unless the flag is set.

### 4.10 AboutPage

Scroll-triggered fade/slide animations via `IntersectionObserver` with 0.15 threshold. Parallax blobs move at different rates with `scrollY`. Sections: hero, how it works (4 steps), 6 agents with descriptions, features grid (Surprise, Group Mode, Save and Rate, Share Links, Community Feed, Analytics), use cases, stats row, CTA.

### 4.11 API client

`api/client.ts` is an Axios instance reading `VITE_API_URL`. A request interceptor attaches the JWT token from `localStorage`. A response interceptor on 401 clears the token and redirects to `/login`.

### 4.12 GenerationOptions (frontend)

Defined in `useAdventures.ts`, mirrors the backend Pydantic model:

```typescript
interface GenerationOptions {
    stops_per_adventure: number;     // 1-6, default 3
    diversity_mode: 'standard' | 'high' | 'fresh';
    exclude_venues: string[];
}
```

Last-generated adventures are cached in `localStorage` under `miniquest_last_adventures` so they survive a page refresh.

---

## 5. Mobile

### 5.1 Directory structure

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
│   └── client.ts               # Axios client pointing to Cloud Run backend
├── components/
│   └── AdventureCard.tsx       # Native card with LinearGradient and BlurView
├── constants/
│   └── theme.ts                # Colors object
├── contexts/
│   └── AuthContext.tsx         # login, logout, isAuthenticated, isLoading
└── assets/
    ├── icon.png
    ├── splash-icon.png
    ├── android-icon-foreground.png
    ├── android-icon-background.png
    └── android-icon-monochrome.png
```

### 5.2 Navigation

Expo Router with two route groups:

- `(auth)` - login and register screens for unauthenticated users
- `(tabs)` - tab bar with Home and Saved for authenticated users

`app/_layout.tsx` wraps everything in `AuthProvider` and runs the route guard:

```typescript
useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuth) router.replace('/(auth)/login');
    if (isAuthenticated && inAuth) router.replace('/(tabs)/home');
}, [isAuthenticated, isLoading, segments]);
```

### 5.3 Authentication

`contexts/AuthContext.tsx` manages auth state. Tokens are stored in `expo-secure-store` (device secure enclave), not AsyncStorage. Context exposes `login`, `logout`, `isAuthenticated`, and `isLoading`.

### 5.4 UI

Screen and card backgrounds use `expo-linear-gradient`. Card surfaces use `expo-blur` for the frosted glass effect that mirrors the web frontend. Colors are centralized in `constants/theme.ts` as a `Colors` object.

`AdventureCard.tsx` renders a full itinerary card with title, theme, steps, duration, and cost using native RN primitives, `LinearGradient`, and `BlurView`.

`saved.tsx` loads saved adventures from the API on mount and supports deletion with an `Alert.alert` confirmation dialog.

### 5.5 API client

`api/client.ts` is an Axios instance configured to hit the Cloud Run backend. Token is read from `expo-secure-store` and attached as a Bearer header on each request.

### 5.6 Dependencies

```json
{
    "expo": "~55.0.4",
    "react-native": "0.83.2",
    "expo-router": "~55.0.3",
    "expo-blur": "~55.0.8",
    "expo-linear-gradient": "~55.0.8",
    "expo-secure-store": "~55.0.8",
    "expo-status-bar": "~55.0.4",
    "react-native-gesture-handler": "~2.30.0",
    "react-native-safe-area-context": "~5.6.2",
    "react-native-screens": "~4.23.0",
    "axios": "^1.13.6"
}
```

---

## 6. Database Schema

### 6.1 MongoDB collections

**users**
```json
{
    "_id": "ObjectId",
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe",
    "hashed_password": "$2b$12$...",
    "is_active": true,
    "created_at": "ISODate",
    "updated_at": "ISODate",
    "total_queries": 15,
    "preferences": { "default_location": "Boston, MA" }
}
```
Indexes: unique on `email`, index on `username`.

**user_queries** (lightweight metadata only - no full adventure data)
```json
{
    "_id": "ObjectId",
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
Full adventure data is excluded here. It is only stored when the user explicitly saves, reducing storage by ~97%.

**saved_adventures**
```json
{
    "_id": "ObjectId",
    "user_id": "ObjectId",
    "adventure_data": {},
    "rating": 5,
    "notes": "Great afternoon",
    "tags": ["coffee", "art"],
    "completed": false,
    "completed_at": null,
    "saved_at": "ISODate",
    "updated_at": "ISODate"
}
```
Indexes: primary on `(user_id, saved_at)`, plus completed status, rating, location, tags, and full-text search on title and notes.

**chat_conversations**
```json
{
    "_id": "ObjectId",
    "user_id": "ObjectId",
    "title": "Coffee tour in Boston",
    "messages": [],
    "location": "Boston, MA",
    "created_at": "ISODate",
    "updated_at": "ISODate"
}
```

**social_posts** and **shared_itineraries** are also active. `shared_itineraries` has a TTL index on `expires_at` so share links expire automatically after 30 days.

### 6.2 ChromaDB collections

**user_adventure_history** - one document per saved adventure per user. Embedded with `text-embedding-3-small`. Queried at generation time to personalize venue selection.

**dynamic_location_tips** - Tavily-sourced local tips with an `authenticity_score` metadata field used for ranking.

### 6.3 Redis cache

```
Key:   venue:{name}:{location}:{date}
Value: JSON research result
TTL:   86400 seconds (24 hours)
```

Cache stats are available at `/api/performance/cache/stats`.

---

## 7. API Reference

All protected endpoints require `Authorization: Bearer <token>`.

### 7.1 Auth

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

**GET /api/auth/me** (protected) - returns current user object.

### 7.2 Adventures

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
    "adventures": [ { "title": "...", "theme": "...", "steps": [...], "map_url": "..." } ],
    "metadata": {
        "total_time_seconds": 4.1,
        "cache_hit_rate": "87.5%",
        "personalization_applied": true,
        "timing_breakdown": { "parse_location": 0.3, "research_venues": 2.1, ... }
    }
}
```

When `enable_progress` is true, the endpoint emits SSE progress updates:
```json
{ "step": "scout_venues", "agent": "VenueScout", "status": "in_progress", "progress": 0.43, "message": "Found 14 venues via Google Places" }
```

Progress statuses: `in_progress`, `complete`, `error`, `clarification_needed`, `adventure_ready`.

**GET /api/adventures/history** (protected) - paginated query history.

### 7.3 Saved Adventures

All protected.

| Method | Path | Description |
|---|---|---|
| POST | /api/saved-adventures | Save an adventure |
| GET | /api/saved-adventures | List saved (`limit`, `completed` params) |
| GET | /api/saved-adventures/{id} | Get one |
| PUT | /api/saved-adventures/{id} | Update rating, notes, tags, completed |
| DELETE | /api/saved-adventures/{id} | Delete |
| GET | /api/saved-adventures/personalization/insights | Personalization insights |

### 7.4 Chat

| Method | Path | Description |
|---|---|---|
| POST | /api/chat/conversations | Create |
| GET | /api/chat/conversations | List |
| GET | /api/chat/conversations/{id} | Get one |
| DELETE | /api/chat/conversations/{id} | Delete |

### 7.5 Share

**POST /api/share** - creates a link expiring in 30 days
```json
// Request: { "adventure_data": { ... } }
// Response: { "share_id": "abc123", "share_url": "https://...web.app/shared/abc123" }
```

**GET /api/share/{share_id}** - public. Returns 404 if not found, 410 if expired.

### 7.6 Social

| Method | Path | Description |
|---|---|---|
| GET | /api/social | Feed (limit/offset params, max 50) |
| POST | /api/social | Create post (max 500 chars) |
| POST | /api/social/{post_id}/like | Toggle like |
| POST | /api/social/{post_id}/comments | Add comment |
| DELETE | /api/social/{post_id} | Delete own post |

### 7.7 Analytics and system

| Method | Path | Description |
|---|---|---|
| GET | /api/analytics/summary | User analytics |
| GET | /api/performance/cache/stats | Redis cache stats |
| GET | /api/performance/info | System performance info |
| GET | /health | Health check (no auth) |
| GET | /api/status | Component status |
| GET | /docs | Swagger UI |

---

## 8. Authentication

### 8.1 Flow

Passwords are hashed with bcrypt (cost factor 12). On login, `jwt_manager.py` signs a JWT using HS256 with a 256-bit secret from GCP Secret Manager. Tokens expire after 30 minutes.

Token payload:
```json
{ "sub": "user@example.com", "user_id": "507f...", "exp": 1640995200 }
```

### 8.2 Request authentication

The frontend attaches tokens via Axios request interceptor. The backend validates via the `get_current_user` FastAPI dependency injected into all protected routes.

### 8.3 Notes

- CORS is configured for the Firebase Hosting origin. An explicit middleware layer runs before `CORSMiddleware` to handle OPTIONS preflight correctly.
- All secrets are in GCP Secret Manager and never in the codebase.
- Input validation is handled by Pydantic on all request bodies.
- `testing.py` exposes diagnostic routes that should be restricted or removed in a public-facing production deployment.

---

## 9. Deployment

### 9.1 Infrastructure

| Component | Service | Detail |
|---|---|---|
| Backend | GCP Cloud Run | us-east1, 1 vCPU, 2 GB, 1-4 instances |
| Frontend | Firebase Hosting | Global CDN |
| Container images | GCP Artifact Registry | us-east1 |
| CI/CD | GCP Cloud Build | `cloudbuild.yaml` |
| Secrets | GCP Secret Manager | us-east1 |
| Database | MongoDB Atlas Cluster0 | Cloud |
| Cache | Redis | Cloud |

GCP project: `project-572cd754-7f2b-465c-b68`
Account: `tech.vivytech@gmail.com`

### 9.2 Deployment scripts

All three scripts live in the project root and require PowerShell with `gcloud` and `firebase` CLIs authenticated.

```powershell
# Full stack
.\deploy-all.ps1

# Backend flags
.\deploy-backend.ps1 -ForceCloudBuild     # skip local push, use Cloud Build
.\deploy-backend.ps1 -SkipBuild -SkipPush # redeploy existing image
.\deploy-backend.ps1 -WatchLogs           # tail logs after deploy

# Frontend flags
.\deploy-frontend.ps1 -SkipBuild          # skip npm run build
```

The backend script tries a local Docker push first and falls back to Cloud Build automatically on failure. The frontend script runs `npm run build` from `frontend/` then `firebase deploy --only hosting`. Firebase init must have been run from inside `frontend/`, not the project root.

### 9.3 Manual Cloud Run deploy

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

### 9.4 Post-deployment checks

```powershell
Invoke-WebRequest https://miniquest-backend-633153384860.us-east1.run.app/health
gcloud run services logs tail miniquest-backend --region us-east1
gcloud run services describe miniquest-backend --region us-east1
Invoke-WebRequest https://miniquest-backend-633153384860.us-east1.run.app/api/status
```

### 9.5 Secrets management

Use `System.IO.File::WriteAllText` with `UTF8Encoding $false` when writing secrets on Windows. PowerShell's `Set-Content` introduces a BOM that Secret Manager includes in the secret value.

```powershell
$value = "your-secret-value"
[System.IO.File]::WriteAllText("secret.txt", $value, [System.Text.UTF8Encoding]::new($false))
gcloud secrets versions add SECRET_NAME --data-file="secret.txt" --project $PROJECT
Remove-Item secret.txt
```

---

## 10. Local Development

### 10.1 Quick start with Docker

```bash
cp .env.example .env
# Fill in OPENAI_API_KEY, TAVILY_API_KEY, MONGODB_URL, JWT_SECRET_KEY

docker-compose up -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

### 10.2 Manual setup

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
# 'a' = Android emulator, 'i' = iOS simulator, 'w' = web
```

### 10.3 Environment variables

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

# Frontend (in frontend/.env)
VITE_API_URL=http://localhost:8000
VITE_OBSERVABILITY_ENABLED=false
```

### 10.4 Common issues

**CORS error** - verify `frontend/.env` has the correct `VITE_API_URL` and the backend's CORS config includes `http://localhost:3000`.

**JWT invalid** - clear `localStorage` in the browser and log in again.

**Tavily rate limit** - check `/api/performance/cache/stats`. A cold machine will make more Tavily calls than usual.

**MongoDB connection failed** - verify `MONGODB_URL` and check that your IP is whitelisted in MongoDB Atlas Network Access.

**Firebase deploy fails** - confirm you ran `firebase init` from inside `frontend/`, not the project root.

**Secret Manager BOM on Windows** - use `System.IO.File::WriteAllText` with `UTF8Encoding $false`. See section 9.5.

### 10.5 Testing

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