author: Shreyas
summary: MiniQuest Multi-Agent Adventure Planning System - Complete Technical Documentation
id: miniquest-technical-complete
categories: AI, Multi-Agent Systems, LangGraph, Tavily API, AWS
environments: Web
status: Published
analytics account: 0

# MiniQuest: Complete Technical Documentation

## Overview
Duration: 5

### What is MiniQuest?

MiniQuest is a **production-ready multi-agent system** that generates personalized travel itineraries using real-time web research and RAG-based personalization. It combines **7 specialized AI agents** coordinated by LangGraph to create complete, research-backed adventure plans.

### Key Capabilities

- ⚡ **Real-time venue research** using Tavily API
- 🤖 **Multi-agent workflow** orchestration with LangGraph
- 🧠 **RAG-based personalization** using ChromaDB
- 🗺️ **Google Maps route** optimization
- 🚀 **Parallel processing** with intelligent caching
- 🔐 **User authentication** and history tracking
- 📊 **Real-time progress** tracking

### Technology Stack

**Backend:**
- Python 3.11, FastAPI, LangGraph
- AsyncOpenAI, Tavily API
- MongoDB Atlas, ChromaDB, Redis
- Google Maps API

**Frontend:**
- React 18 with TypeScript
- Vite, Axios, React Router

**Infrastructure:**
- Docker & Docker Compose
- AWS (CloudFront, ECS)
- MongoDB Atlas, Redis

## System Architecture
Duration: 10

### High-Level Architecture

![System Architecture](images/SystemArchitecture.png)

The system uses a **multi-layer architecture** with clear separation of concerns:

```
Frontend (React)
    ↓ REST API
FastAPI Backend
    ↓ Orchestration
LangGraph Coordinator
    ↓ Sequential Workflow
7 Specialized Agents
    ↓ Data Layer
MongoDB + Redis + ChromaDB
```

### The 7 Specialized Agents

Each agent has a **single, well-defined responsibility**:

1. **IntentParser** - Extract user preferences from natural language
2. **LocationParser** - Resolve location to coordinates
3. **VenueScout** - Generate 15-20 diverse venue candidates (GPT-4)
4. **TavilyResearch** - Real-time web research (parallel, 8 concurrent)
5. **ResearchSummary** - Synthesize findings into structured data
6. **RoutingAgent** - Calculate optimal routes (Google Maps)
7. **AdventureCreator** - Generate 3 themed adventures (async)

Negative
: **Key Design Principle:** Each agent is independently testable and can be optimized separately for maximum modularity

### Data Flow

![Adventure Generation Flow](images/AdventureGenerationDataFlow.png)

**Complete Generation Pipeline:**

```
User Query
  → IntentParser (extract themes)
  → LocationParser (get coordinates)
  → RAG System (apply personalization)
  → VenueScout (generate venues)
  → TavilyResearch (research in parallel)
  → ResearchSummary (synthesize data)
  → RoutingAgent (calculate routes)
  → AdventureCreator (create 3 adventures)
  → Save metadata to MongoDB
  → Return to user
```

**Average Processing Time:** ~4.2 seconds (with optimizations)

### System Components Overview

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Server | FastAPI | REST endpoints |
| Coordinator | LangGraph | Agent orchestration |
| Agents | OpenAI, Tavily | Specialized processing |
| RAG System | ChromaDB | Personalization |
| Auth System | JWT, bcrypt | Authentication |
| Database | MongoDB, Redis | Persistence, caching |
| Frontend | React, TypeScript | User interface |

## LangGraph Workflow
Duration: 12

### State Machine Design

![LangGraph Workflow](images/LangGraphWorkflowStateMachine.png)

LangGraph orchestrates the workflow as a **state graph** with 8 sequential nodes:

**Workflow Progression:**
- Node 1: `parse_location` (14% progress)
- Node 2: `get_personalization` (29% progress)
- Node 3: `parse_intent` (29% progress)
- Node 4: `scout_venues` (43% progress)
- Node 5: `research_venues` (57% progress) ⚡ **Parallel**
- Node 6: `summarize_research` (71% progress)
- Node 7: `route_adventures` (86% progress)
- Node 8: `create_adventures` (100% progress) ⚡ **Async**

### State Management

The workflow maintains **shared state** across all agents:

```python
class AdventureState(TypedDict):
    # Input
    user_input: str
    user_address: Optional[str]
    user_id: Optional[str]
    
    # Processing
    target_location: str
    coordinates: Dict
    parsed_preferences: Dict
    scouted_venues: List[Dict]
    researched_venues: List[Dict]
    
    # Output
    final_adventures: List[Dict]
    performance: Dict
```

### Real-Time Progress Tracking

Progress updates are **streamed** to the frontend:

```json
{
  "step": "research_venues",
  "agent": "TavilyResearch",
  "status": "in_progress",
  "message": "Researching 8 venues...",
  "progress": 0.57,
  "details": {...}
}
```

### Agent Implementations

**IntentParser Agent:**
- Extracts preferences, themes, activities from natural language
- Returns structured JSON with user interests

**LocationParser Agent:**
- Resolves location strings to coordinates
- Uses OpenAI function calling for geocoding
- Validates and returns structured location data

**VenueScout Agent:**
- Generates 15-20 diverse venue candidates
- Enforces category diversity
- Includes exact addresses
- Uses GPT-4 for generation

**TavilyResearch Agent:**
- Researches venues in parallel (8 concurrent)
- Multi-step: Search API → Extract API
- Caches results in Redis (24hr TTL)
- Graceful error recovery

**ResearchSummary Agent:**
- Synthesizes raw research into structured summaries
- Extracts hours, prices, tips, descriptions
- Calculates confidence scores

**RoutingAgent:**
- Generates optimal Google Maps routes
- Multiple travel modes (walk, drive, transit)
- Waypoint optimization
- Shareable route URLs

**AdventureCreator Agent:**
- Creates 3 themed adventures asynchronously
- Integrates all research data
- Weaves compelling narratives
- Adds route information

## Tavily Research Integration
Duration: 10

### Why Tavily?

Tavily provides **real-time web data** that traditional databases can't offer:

- 🕐 Current venue hours (changes daily)
- 💰 Live prices and deals
- ⭐ Recent reviews and ratings
- 📅 Up-to-date event information

### Multi-Step Research Strategy

**Step 1: Tavily Search API**
```python
search_results = tavily.search(
    query=f"{venue_name} {location} hours prices reviews",
    search_depth="advanced",
    max_results=5
)
```

Returns top 5 web pages with relevant venue information.

**Step 2: Tavily Extract API**
```python
extract_results = tavily.extract(
    urls=[result['url'] for result in search_results],
    include_raw_content=False
)
```

Deep dive into content for detailed information.

**Step 3: Synthesize & Cache**
```python
research_data = synthesize(search_results, extract_results)
await redis.set(cache_key, research_data, ex=86400)  # 24hr TTL
```

Structure data and cache for 24 hours.

### Research Output Structure

Each venue receives **comprehensive research data**:

```json
{
  "venue_name": "Thinking Cup",
  "current_info": "Open today until 6 PM",
  "hours_info": "Mon-Fri: 7 AM - 6 PM",
  "visitor_tips": [
    "Try the cappuccino",
    "Arrive before 11 AM to avoid crowds",
    "Free WiFi available"
  ],
  "venue_summary": "Popular artisan coffee shop...",
  "research_confidence": 0.89,
  "total_insights": 12,
  "top_source": "thinkingcup.com"
}
```

### API Call Optimization

**Per Adventure Generation:**
- Tavily Search calls: ~10
- Tavily Extract calls: ~10
- **Total API calls: ~20**

**With 90% cache hit rate:**
- Actual API calls: ~2-3
- **Cost savings: 85-90%**

Positive
: Smart caching reduces Tavily API costs by up to 90% while maintaining data freshness with 24-hour TTL

## Performance Optimizations
Duration: 10

### Benchmark Results

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| **Research** | 20.0s | 2.5s | ⚡ 87.5% |
| **Caching** | 2.5s/venue | 0.1s/venue | 🚀 96% |
| **Adventures** | 9.0s | 3.0s | ✨ 67% |
| **Total Pipeline** | **33.3s** | **4.2s** | **🎯 87% faster** |

### Optimization #1: Parallel Research

![Parallel Research](images/ParallelResearchProcessing.png)

**Sequential Processing (❌ Slow):**
```
Venue 1: 2.5s
Venue 2: 2.5s
...
Venue 8: 2.5s
Total: 20 seconds
```

**Parallel Processing (✅ Fast):**
```python
async with asyncio.TaskGroup() as tg:
    tasks = [tg.create_task(research_venue(v)) 
             for v in venues]

# All 8 venues complete in 2.5s
```

**Result:** 87.5% faster research phase

### Optimization #2: Redis Caching

![Research Caching](images/ResearchCachingStrategy.png)

**Cache Strategy:**
- **Key format:** `venue:{name}:{location}:{date}`
- **TTL:** 24 hours
- **Hit rate:** 91%

**Performance Impact:**
- Without cache: 2.5s per venue
- With cache (90% hit): 0.1s per venue
- **Time saved:** 84%

**Cache Statistics:**
```python
{
    "total_requests": 1000,
    "cache_hits": 910,
    "cache_misses": 90,
    "hit_rate": "91.0%",
    "time_saved_seconds": 2273
}
```

### Optimization #3: Async Adventure Creation

**Sequential Creation (❌ Slow):**
```
Adventure 1: 3.0s
Adventure 2: 3.0s
Adventure 3: 3.0s
Total: 9.0 seconds
```

**Async Creation (✅ Fast):**
```python
adventures = await asyncio.gather(*[
    create_single(theme) for theme in themes
])
# All 3 complete in 3.0s
```

**Result:** 67% faster adventure generation

### Overall Performance Summary

Positive
: Combined optimizations result in **87% faster generation** with zero quality loss - from 33.3s to 4.2s average

## RAG Personalization
Duration: 10

### How RAG Works

![RAG Architecture](images/RAGArchitecture.png)

The RAG system **learns from user behavior**:

**Workflow:**
1. User saves adventure → Stored in ChromaDB with embeddings
2. Next query → Retrieve similar past adventures
3. Extract patterns → Favorite themes, venues, locations
4. Enhance search → Weight recommendations toward preferences

![RAG Personalization Flow](images/RAGPersonalizationFlow.png)

### ChromaDB Collections

**Collection 1: user_adventure_history**
- Stores saved adventures with ratings
- OpenAI embeddings for semantic search
- Metadata: user_id, location, rating, timestamp

**Collection 2: dynamic_location_tips**
- Cached insider tips from Tavily
- Categorized by location and type
- Authenticity scoring

### Implementation Details

**Storing Adventures:**
```python
def store_user_adventure(user_id, adventure_data, rating):
    adventure_doc = f"""
    Title: {adventure_data['title']}
    Theme: {adventure_data['theme']}
    Venues: {', '.join([v['name'] for v in venues])}
    Rating: {rating}/5
    """
    
    self.user_history_collection.add(
        ids=[f"user_{user_id}_adventure_{timestamp}"],
        documents=[adventure_doc],
        metadatas=[{
            "user_id": user_id,
            "rating": rating,
            "location": location
        }]
    )
```

**Retrieving Personalization:**
```python
def get_user_personalization(user_id, location):
    results = self.user_history_collection.query(
        query_texts=[f"adventures in {location}"],
        where={"user_id": user_id},
        n_results=20
    )
    
    return {
        "favorite_themes": extract_themes(results),
        "avg_rating": calculate_avg_rating(results),
        "total_adventures": len(results)
    }
```

### Example Personalization

**Scenario:**
- User has 5 saved adventures
- All rated 5★
- Common themes: coffee, art, culture

**Result:**
- Query: "places to visit in Cambridge"
- System prioritizes: cafes, galleries, art spaces
- Avoids: generic tourist attractions

**Personalization Data:**
```json
{
  "has_history": true,
  "favorite_themes": ["coffee", "art", "culture"],
  "avg_rating": 4.8,
  "total_adventures": 5,
  "favorite_locations": ["Boston", "Cambridge"]
}
```

Negative
: Personalization requires at least 3 saved adventures for meaningful patterns to emerge

## Authentication & Security
Duration: 8

### System Architecture

![Authentication Architecture](images/AuthenticationArchitecture.png)

The authentication system uses **JWT tokens** with **bcrypt** password hashing.

### JWT Token Flow

![Authentication Flow](images/AuthenticationFlow.png)

**Registration/Login Process:**

1. User provides credentials
2. Password hashed with bcrypt (cost factor: 12)
3. JWT token generated (HS256 algorithm)
4. Token expires after 30 minutes

**Token Structure:**
```json
{
  "sub": "user@example.com",
  "user_id": "507f1f77bcf86cd799439011",
  "exp": 1640995200
}
```

### Security Features

**Password Security:**
- Algorithm: bcrypt
- Cost factor: 12 (4096 rounds)
- Automatic salt generation
- Timing attack protection

**JWT Security:**
- Algorithm: HS256
- Secret key: 256-bit random
- Signature verification on every request
- Expiration checking

**API Security:**
- CORS: Configured for specific origins
- Rate limiting: 100 req/min (production)
- Input validation: Pydantic models
- XSS protection: React escapes by default

### Implementation

**Password Manager:**
```python
from passlib.context import CryptContext

class PasswordManager:
    def __init__(self):
        self.pwd_context = CryptContext(
            schemes=["bcrypt"],
            deprecated="auto"
        )
    
    def hash_password(self, password: str) -> str:
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain: str, hashed: str) -> bool:
        return self.pwd_context.verify(plain, hashed)
```

**JWT Manager:**
```python
from jose import jwt, JWTError

class JWTManager:
    def create_access_token(self, data: Dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=30)
        to_encode["exp"] = expire
        
        return jwt.encode(
            to_encode,
            self.secret_key,
            algorithm=self.algorithm
        )
```

### Protected Routes

**Frontend:**
```typescript
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};
```

**Backend:**
```python
@router.get("/protected")
async def protected(current_user = Depends(get_current_user)):
    return {"message": "Authenticated"}
```

## Database Schema
Duration: 8

### MongoDB Collections

![Database Schema](images/DatabaseSchema(EntityRelationship).png)

**users Collection:**
```json
{
  "_id": ObjectId,
  "email": "user@example.com",
  "username": "johndoe",
  "hashed_password": "$2b$12$...",
  "total_queries": 15
}
```

**user_queries Collection (Lightweight):**
```json
{
  "user_input": "coffee shops in Boston",
  "adventures_count": 3,
  "adventure_metadata": [
    {"title": "...", "theme": "..."}
  ],
  "metadata": {
    "performance": {"total_time_seconds": 4.2},
    "research_stats": {...}
  }
}
```

Positive
: **Storage Philosophy:** Only store full adventures when user explicitly saves - results in 97% storage reduction

**saved_adventures Collection (Full Details):**
```json
{
  "adventure_data": {/* complete adventure */},
  "rating": 5,
  "notes": "Loved it!",
  "tags": ["coffee", "art"]
}
```

### ChromaDB Collections

**user_adventure_history:**
```python
{
  "id": "user_123_adventure_1640995200",
  "document": "Title: Coffee Tour...",
  "metadata": {"user_id": "user_123", "rating": 5},
  "embedding": [0.123, -0.456, ...]  # OpenAI
}
```

**dynamic_location_tips:**
```python
{
  "id": "boston_coffee_tip_1",
  "document": "Local tip: Visit before 11 AM",
  "metadata": {
    "location": "Boston",
    "authenticity_score": 0.92
  }
}
```

### Redis Cache

**Structure:**
```
Key: venue:{name}:{location}:{date}
Value: {research_data JSON}
TTL: 86400 seconds (24 hours)
```

**Example:**
```
venue:Thinking Cup:Boston:2025-01-15
```

## API Endpoints
Duration: 7

### Authentication Endpoints

**POST /api/auth/register** - Register new user
**POST /api/auth/login** - Authenticate user
**GET /api/auth/me** - Get current user (protected)

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": {
    "id": "507f...",
    "email": "user@example.com"
  }
}
```

### Adventure Generation

![API Request Flow](images/APIRequest_ResponseFlow.png)

**POST /api/adventures** - Generate adventures

**Request:**
```json
{
  "user_input": "coffee shops in Boston",
  "enable_progress": true
}
```

**Response:**
```json
{
  "success": true,
  "adventures": [{...}, {...}, {...}],
  "metadata": {
    "total_time_seconds": 4.2,
    "cache_hit_rate": "87.5%",
    "personalization_applied": true
  }
}
```

**Progress Updates (Streaming):**
```json
{"step": "parse_location", "progress": 0.14}
{"step": "research_venues", "progress": 0.57}
{"step": "create_adventures", "progress": 1.0}
```

### Other Endpoints

**Saved Adventures:**
- POST /api/saved-adventures - Save adventure
- GET /api/saved-adventures - List saved
- GET /api/saved-adventures/{id} - Get specific
- PUT /api/saved-adventures/{id} - Update
- DELETE /api/saved-adventures/{id} - Delete

**Analytics:**
- GET /api/analytics/summary - User statistics

**System:**
- GET /health - Health check
- GET /api/status - Component status

## AWS Deployment
Duration: 12

### Production Architecture

![AWS Deployment](images/AWSDeploymentArchitecture.png)

**CloudFront (Frontend):**
- URL: `d1nrqhtd83kmw6.cloudfront.net`
- Origin: S3 bucket (React build)
- Features: GZIP, HTTP/2, global CDN

**CloudFront (Backend):**
- URL: `d3ihmux7ocq5bh.cloudfront.net`
- Origin: Application Load Balancer
- Routes to: ECS Fargate containers

**ECS Fargate:**
- Auto-scaling: 1-4 tasks
- Task specs: 1 vCPU, 2 GB RAM
- Container: Python 3.11 + FastAPI

**Data Layer:**
- MongoDB Atlas (M10 cluster)
- ElastiCache Redis (Multi-AZ)
- AWS Secrets Manager (API keys)

### Traffic Flow

```
User Request
    ↓
CloudFront Distribution
    ├→ Frontend: Serves React SPA from S3
    └→ Backend: Proxies API to ALB
           ↓
       ALB distributes to ECS tasks
           ↓
       FastAPI processes request
           ├→ Checks Redis cache
           ├→ Queries MongoDB
           ├→ Calls external APIs
           └→ Returns JSON response
```

### Deployment Pipeline

![Deployment Pipeline](images/DeploymentPipeline.png)

**Frontend Deployment:**
```bash
# Build
npm run build

# Sync to S3
aws s3 sync dist/ s3://bucket --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E123 --paths "/*"
```

**Backend Deployment:**
```bash
# Build & push Docker image
docker build -t miniquest-backend .
docker push ECR_URL/miniquest-backend:latest

# Update ECS service
aws ecs update-service \
  --cluster miniquest-cluster \
  --service miniquest-backend \
  --force-new-deployment
```

### Environment Configuration

| Variable | Development | Production |
|----------|------------|------------|
| ENVIRONMENT | development | production |
| DEBUG | true | false |
| MONGODB_URL | localhost | Atlas M10 |
| REDIS_URL | localhost | ElastiCache |

### Monitoring

**CloudWatch Metrics:**
- API request count
- Response time (avg: ~4.2s)
- Error rate (target: <1%)
- Cache hit rate (target: >85%)

**CloudWatch Alarms:**
- High error rate (>5%)
- Slow response (>10s)
- High CPU (>80%)

## Local Development
Duration: 10

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop
- API Keys: OpenAI, Tavily
- MongoDB Atlas account (free tier OK)

### Quick Start with Docker

```bash
# 1. Clone repository
git clone https://github.com/yourusername/miniquest
cd miniquest

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start all services
docker-compose up -d

# 4. Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Setup

**Backend:**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
MONGODB_URL=mongodb+srv://...

# Optional
GOOGLE_MAPS_KEY=AIza...
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=random_secure_string
```

### Testing

**Backend Tests:**
```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Test specific agent
pytest tests/test_tavily_research.py
```

**Frontend Tests:**
```bash
cd frontend

# Run tests
npm test

# Build for production
npm run build
```

### Common Issues

**CORS Error:**
- Check CORS configuration in backend
- Verify frontend URL in allowed origins

**JWT Token Invalid:**
- Check token expiration
- Clear localStorage and re-login

**Tavily Rate Limit:**
- Check cache hit rate
- Upgrade Tavily plan if needed

**MongoDB Connection Failed:**
- Verify MONGODB_URL
- Check IP whitelist in MongoDB Atlas

## Frontend Components
Duration: 8

### Application Structure

**Main Components:**

1. **AdventuresPage** - Main generation interface
   - Query input
   - Real-time progress tracking
   - Adventure cards display

2. **ProgressTracker** - Visual feedback
   - Animated progress bar
   - Agent-specific emojis
   - Step-by-step status

3. **EnhancedAdventureCard** - Display adventures
   - Header (title, theme, tagline)
   - Stats (duration, cost)
   - Researched venues
   - Itinerary timeline
   - Map integration
   - Save button

4. **AnalyticsPage** - User statistics
   - Total adventures
   - Favorite themes
   - Top locations
   - Average ratings

### Authentication Context

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email, password) => Promise<void>;
  logout: () => void;
}
```

### Generation Flow

```typescript
const handleGenerate = async () => {
  const response = await api.post('/adventures', {
    user_input: query,
    enable_progress: true
  });
  
  // Stream progress updates
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const progress = JSON.parse(
      new TextDecoder().decode(value)
    );
    setCurrentProgress(progress);
  }
  
  // Get final result
  const result = await response.json();
  setAdventures(result.adventures);
};
```

### Common Components

**Reusable UI Components:**
- BackgroundOrbs - Glassmorphism decoration
- GlassCard - Frosted glass container
- GlassInput - Styled input field
- GlassButton - Styled button
- LoadingState - Loading spinner
- StatBadge - Metric display
- ThemeCard - Theme ranking card

## Key Takeaways
Duration: 3

### What Makes MiniQuest Special

Positive
: **Multi-Agent Design** - 7 specialized agents with clear responsibilities and independent optimization

Positive
: **Real-Time Research** - Tavily API provides current, accurate venue data that traditional databases can't match

Positive
: **Production-Ready** - Fully deployed on AWS with CloudFront, ECS, monitoring, and auto-scaling

Positive
: **Performance Optimized** - 87% faster with parallel processing, caching, and async operations

Positive
: **RAG Personalization** - Learns from user preferences over time using ChromaDB embeddings

### Technical Highlights

- **LangGraph** orchestration for complex multi-agent workflows
- **Tavily API** integration for real-time web research
- **ChromaDB** for semantic search and personalization
- **Redis caching** for 91% hit rate performance
- **AWS CloudFront + ECS** for scalable deployment
- **MongoDB Atlas** for flexible data storage

### By the Numbers

- **7 agents** working in coordination
- **~4.2 seconds** average generation time
- **87% performance improvement** with optimizations
- **91% cache hit rate** reduces API costs
- **97% storage reduction** with lightweight schema

## Resources & Next Steps
Duration: 2

### Documentation

- [GitHub Repository](https://github.com/lambdabypi/miniquest-adventure-planner)
- [Full Technical Docs](TECHNICAL_DOCUMENTATION.md)
- [API Documentation](https://d3ihmux7ocq5bh.cloudfront.net/docs)

### Learn More

- [LangGraph Documentation](https://python.langchain.com/docs/langgraph)
- [Tavily API Docs](https://docs.tavily.com)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [FastAPI](https://fastapi.tiangolo.com)
- [ChromaDB](https://docs.trychroma.com)

### Try It Live

- **Frontend:** https://d1nrqhtd83kmw6.cloudfront.net
- **Backend API:** https://d3ihmux7ocq5bh.cloudfront.net/docs
- **Health Check:** https://d3ihmux7ocq5bh.cloudfront.net/health

### Contact & Feedback

- GitHub: @lambdabypi
- Email: shreyas.atneu@gmail.com

---

**Thank you for exploring MiniQuest!** 🚀

Built with ❤️ using LangGraph, Tavily API, and AWS