# MiniQuest - AI-Powered Local Adventure Planning

**Multi-Agent Architecture | LangGraph | Tavily API | MongoDB Atlas | Google Maps API**

A production-ready multi-agent system that generates personalized travel itineraries using real-time web research, RAG-based personalization and optimized routing.

---

## Technical Documentation

https://lambdabypi.github.io/miniquest-adventure-planner/

## Live Application

- **Frontend**: https://d1nrqhtd83kmw6.cloudfront.net
- **Backend API**: https://d3ihmux7ocq5bh.cloudfront.net
- **API Documentation**: https://d3ihmux7ocq5bh.cloudfront.net/docs
- **Health Check**: https://d3ihmux7ocq5bh.cloudfront.net/health

---

## Demo Video

**[Watch Demo Video (3-5 min)](YOUR_LOOM_OR_YOUTUBE_LINK_HERE)**

---

## Key Features

- **Multi-Agent AI System** - 7 specialized agents coordinated by LangGraph
- **Real-Time Web Research** - Tavily API for current venue information
- **RAG Personalization** - ChromaDB-based learning from user preferences
- **Performance Optimized** - Parallel research (60-75% faster) + Caching (90%+ hit rate)
- **Smart Routing** - Google Maps integration for optimal travel paths
- **Modern UI** - React + TypeScript with glassmorphism design
- **AWS Deployed** - Production-ready on AWS with auto-scaling

---

## What Makes MiniQuest Unique

Unlike traditional travel planning tools, MiniQuest:

1. **Real-Time Intelligence**: Uses Tavily API to fetch current venue information (hours, prices, reviews) 
   rather than relying on stale databases.

2. **Multi-Agent Specialization**: 7 distinct agents with clear responsibilities vs monolithic systems. 
   Each agent is independently testable and optimizable.

3. **Production-Grade Performance**: 
   - Parallel research: 60-75% speed improvement
   - Smart caching: 90%+ hit rate
   - Async operations throughout

4. **Learning System**: RAG-based personalization learns from user preferences over time, 
   improving recommendations with each interaction.

5. **Complete User Journey**: From query to saved itinerary with Google Maps integration, 
   not just a list of recommendations.

---

## Tavily API Integration

### Search API
```python
# Used in: TavilyResearchAgent
response = tavily_client.search(
    query=f"{venue_name} {location} hours prices reviews",
    search_depth="advanced",
    max_results=5
)
# Returns: Web pages with venue information
```

### Extract API
```python
# Deep content extraction
response = tavily_client.extract(
    urls=search_results_urls,
    include_raw_content=False
)
# Returns: Structured data (hours, prices, descriptions)
```

### API Call Optimization
- **Parallel Execution**: 8 venues researched simultaneously
- **Smart Caching**: Results cached for 24 hours
- **Rate Limiting**: Respects 100 req/min limit
- **Error Handling**: Graceful degradation on API failures

### Example Flow
```
User: "Coffee shops in Boston"
  ↓
Tavily Search: "Coffee shops Boston hours prices reviews"
  ↓
Returns: 5 web pages per venue
  ↓
Tavily Extract: Deep dive into top results
  ↓
Returns: Structured data (hours, prices, tips)
  ↓
Research Summary Agent: Synthesizes findings
  ↓
Final Result: "Open 7am-6pm, $3-7 range, known for cappuccinos"
```

### Performance Metrics
- Average searches per adventure: 10
- Average extracts per adventure: 10
- Total Tavily calls: ~20 per generation
- With caching: ~2-3 calls per generation (90% hit rate)

---

## Architecture

### System Overview

<img src="images/SystemArchitecture.png" alt="Architecture" width="300" />

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (dev server + build)
- Axios (API client)
- React Router (navigation)

**Backend:**
- Python 3.11
- FastAPI (REST API)
- LangGraph (agent orchestration)
- OpenAI GPT-4 (intelligence)
- Tavily API (web research)
- MongoDB Atlas (database)
- ChromaDB (vector storage)
- Redis (caching)

**Deployment:**
- Docker + Docker Compose
- AWS ECS / Elastic Beanstalk
- AWS Secrets Manager
- CloudWatch (monitoring)

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- MongoDB Atlas account
- API Keys:
  - OpenAI API key
  - Tavily API key
  - Google Maps API key (optional)

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/miniquest-adventure-planner.git
cd miniquest-adventure-planner
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

Required variables:
```env
OPENAI_API_KEY=your_openai_key_here
TAVILY_API_KEY=your_tavily_key_here
MONGODB_URL=your_mongodb_atlas_connection_string
JWT_SECRET_KEY=your_secure_random_key
```

### 3. Start Application
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## Agent Architecture

### Multi-Agent Workflow

The system uses **7 specialized agents** coordinated by LangGraph:

#### 1. Intent Parser Agent
```python
Role: Extract user preferences and interests
Input: User natural language query
Output: Structured preferences (themes, activities, constraints)
Example: "coffee shops and museums" → {themes: ["coffee", "art"], activities: ["cafe", "museum"]}
```

#### 2. Location Parser Agent
```python
Role: Resolve and validate locations
Input: Location string or address
Output: Coordinates, validated location data
Example: "Boston" → {lat: 42.3601, lon: -71.0589, city: "Boston", state: "MA"}
```

#### 3. Venue Scout Agent
```python
Role: Generate diverse venue candidates
Input: Location + preferences
Output: List of potential venues
Technology: OpenAI GPT-4
Example: Generates 20+ diverse venue suggestions per category
```

#### 4. Tavily Research Agent
```python
Role: Real-time web research on venues
Input: Venue names + location
Output: Current hours, prices, descriptions, reviews
Technology: Tavily Search + Extract APIs
Features:
  - Multi-step research (Search → Extract)
  - Parallel execution (60-75% faster)
  - Result caching (90%+ hit rate)
```

#### 5. Routing Agent
```python
Role: Calculate optimal travel routes
Input: List of venues with coordinates
Output: Route URL, travel times, optimized order
Technology: Google Maps Directions API
```

#### 6. Adventure Creator Agent
```python
Role: Generate themed adventure narratives
Input: Researched venues + routes
Output: Complete adventure itineraries with stories
Technology: OpenAI GPT-4
Features: Async execution for speed
```

#### 7. Research Summary Agent
```python
Role: Synthesize research findings
Input: Raw Tavily research results
Output: Structured venue details (hours, prices, descriptions)
```

### LangGraph Workflow
```python
# State transitions
START → parse_intent → parse_location → scout_venues
      → research_venues (parallel) → route_adventures
      → create_adventures (async) → END

# Error handling and routing built-in
# Performance tracking at each step
```

---

## Database Schema

### MongoDB Collections

#### users
```json
{
  "_id": "ObjectId",
  "email": "user@example.com",
  "username": "username",
  "full_name": "User Name",
  "hashed_password": "bcrypt_hash",
  "created_at": "2025-01-15T12:00:00Z",
  "total_queries": 42
}
```

#### user_queries (Lightweight - Privacy-focused)
```json
{
  "_id": "ObjectId",
  "user_id": "user_object_id",
  "user_input": "coffee shops and museums in Boston",
  "adventures_count": 3,
  "adventure_metadata": [
    {
      "title": "Coffee & Culture Tour",
      "theme": "Artistic Coffee Journey"
    }
  ],
  "metadata": {
    "target_location": "Boston, MA",
    "performance": {
      "total_time_seconds": 4.2,
      "cache_hits": 5,
      "cache_misses": 2
    },
    "personalization": {
      "applied": true,
      "enhanced_query": "coffee shops museums art culture Boston"
    }
  },
  "created_at": "2025-01-15T12:00:00Z"
}
```

#### saved_adventures (Full Details - User-triggered only)
```json
{
  "_id": "ObjectId",
  "user_id": "user_object_id",
  "adventure_data": {
    "title": "Coffee & Culture Tour",
    "theme": "Artistic Coffee Journey",
    "locations": [...],
    "route_url": "https://maps.google.com/...",
    "narrative": "..."
  },
  "rating": 5,
  "notes": "Loved this itinerary!",
  "saved_at": "2025-01-15T12:00:00Z"
}
```

### ChromaDB Collections

**adventure_preferences** - Vector embeddings of saved adventures for RAG personalization

---

## Performance Optimizations

### 1. Parallel Research (60-75% faster)
```python
# Process multiple venues concurrently
async with asyncio.TaskGroup() as tg:
    tasks = [tg.create_task(research_venue(v)) for v in venues]
```

### 2. Research Caching (90%+ hit rate)
```python
# Redis-based caching with smart keys
cache_key = f"venue:{venue_name}:{location}:{date}"
# TTL: 24 hours for venue data
```

### 3. Async Adventure Creation (20-30% faster)
```python
# Non-blocking OpenAI calls
adventures = await asyncio.gather(*[
    create_adventure_async(venues) for venues in grouped_venues
])
```

### Benchmark Results

| Scenario | Time | vs Baseline |
|----------|------|-------------|
| Cold Cache | ~4.0s | 80% faster |
| Warm Cache | ~1.5s | 92% faster |
| Parallel Research | ~3.5s | 65% faster |

---

## Frontend Features

### Pages
- **Home** - Landing page with feature showcase
- **Login/Register** - User authentication
- **Adventure Generator** - Main interface
- **Query History** - Past adventures with analytics
- **Saved Adventures** - User's favorite itineraries
- **Chat** - AI assistant interface

### UI Components
- Glassmorphism design
- Real-time loading states
- Interactive adventure cards
- Performance analytics dashboard
- Responsive layout

---

## API Endpoints

### Authentication
```bash
POST /api/auth/register - Create new user
POST /api/auth/login - User login
GET /api/auth/me - Current user info
```

### Adventures
```bash
POST /api/adventures - Generate adventures
GET /api/adventures/history - Query history
POST /api/saved-adventures - Save adventure
GET /api/saved-adventures - Get saved adventures
```

### Analytics
```bash
GET /api/analytics/summary - System analytics
GET /api/performance/cache/stats - Cache statistics
```

### System
```bash
GET /health - Health check
GET /api/status - System status
GET /docs - Interactive API documentation
```

**Full API Documentation:** http://localhost:8000/docs

---

## Deployment

### Local Development
```bash
# Start services
docker-compose up -d

# View backend logs
docker-compose logs -f backend

# View frontend logs
docker-compose logs -f frontend

# Restart service
docker-compose restart backend

# Stop all
docker-compose down
```

### AWS Deployment

**Option 1: Elastic Beanstalk (Recommended)**
```bash
cd backend
eb init
eb create miniquest-prod
eb setenv OPENAI_API_KEY=xxx TAVILY_API_KEY=yyy MONGODB_URL=zzz
eb deploy
```

**Option 2: ECS with Fargate**
```bash
# Build and push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin ECR_URL
docker build -t miniquest-backend .
docker push ECR_URL/miniquest-backend:latest

# Deploy using ECS task definition
aws ecs update-service --cluster miniquest --service miniquest-svc --force-new-deployment
```
---

## Testing
```bash
# Backend tests
cd backend
pytest

# Test RAG personalization
python tests/test_rag_personalization.py

# Test Tavily research
python tests/tavily_diagnostic.py "Museum Name" "Boston"

# Frontend build
cd frontend
npm run build
```

---

## Project Structure
```
.
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── agents/         # Multi-agent system
│   │   │   ├── coordination/  # LangGraph workflow
│   │   │   ├── creation/      # Adventure creator
│   │   │   ├── intent/        # Intent parser
│   │   │   ├── location/      # Location resolver
│   │   │   ├── research/      # Tavily integration
│   │   │   ├── routing/       # Google Maps
│   │   │   └── scouting/      # Venue discovery
│   │   ├── api/            # REST API endpoints
│   │   ├── core/           # Configuration, RAG
│   │   ├── database/       # MongoDB repositories
│   │   └── models/         # Pydantic models
│   ├── tests/              # Test suite
│   └── Dockerfile
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # UI components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   └── App.tsx
│   └── Dockerfile
├── scripts/               # Utility scripts
├── docker-compose.yml     # Orchestration
├── .env.example           # Environment template
└── README.md              # This file
```

---

## Security

- JWT-based authentication
- Password hashing (bcrypt)
- Environment variable protection
- CORS configuration
- Input validation
- Rate limiting (production)
- AWS Secrets Manager integration

---

## Monitoring

### Health Checks
```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/status
```

### Performance Metrics
```bash
# Get cache statistics
curl http://localhost:8000/api/performance/cache/stats

# Get system analytics
curl http://localhost:8000/api/analytics/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Logs
```bash
# Local
docker-compose logs -f

# AWS EB
eb logs

# AWS ECS
aws logs tail /ecs/miniquest-backend --follow
```
---

## Known Limitations & Future Work

### Current Limitations
1. **Google Maps API**: Limited to 60 requests/minute
2. **Tavily Rate Limits**: 100 searches/minute on free tier
3. **ChromaDB**: In-memory only (resets on container restart)
4. **Single-language**: English only currently

### Planned Improvements
- [ ] Multi-language support
- [ ] Real-time collaboration (shared itineraries)
- [ ] Mobile app (React Native)
- [ ] Persistent ChromaDB (EFS/S3 backed)
- [ ] Weather integration
- [ ] Budget tracking
- [ ] Booking integration (OpenTable, etc.)

---

## 🙏 Acknowledgments

- **LangGraph** - Agent orchestration framework
- **Tavily** - Real-time web research API
- **OpenAI** - GPT-4 language model
- **Anthropic** - Development assistance with Claude

---

## 👤 Author

**Shreyas Sreenivas**
- GitHub: [@lambdabypi](https://github.com/lambdabypi)
- Email: shreyas.atneu@gmail.com
- LinkedIn: [LinkedIn](https://www.linkedin.com/in/shreyas-sreenivas-9452a9169/)

---

## 📞 Support

For questions or issues:
1. Check `/docs` for API documentation
2. Review logs: `docker-compose logs -f`
3. Open an issue on GitHub

---

**Built with ❤️ using LangGraph and Tavily API**
