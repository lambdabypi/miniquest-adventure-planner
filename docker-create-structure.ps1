# MiniQuest Directory Structure Creator - Docker Development (Clean Version)
Write-Host "Creating MiniQuest structure for Docker development..." -ForegroundColor Green

# Create directories
$dirs = @(
    "backend\app\agents",
    "backend\app\services",
    "backend\app\models", 
    "backend\app\database\repositories",
    "backend\app\database\migrations",
    "backend\app\api",
    "backend\app\core",
    "backend\app\utils",
    "backend\tests\unit",
    "backend\tests\integration",
    "backend\tests\e2e", 
    "backend\scripts",
    "backend\logs",
    "frontend\public",
    "frontend\src\components",
    "frontend\src\hooks",
    "frontend\src\services",
    "frontend\src\utils",
    "frontend\src\styles",
    "frontend\src\types",
    "frontend\src\contexts",
    "frontend\src\pages",
    "infrastructure\nginx\conf.d",
    "infrastructure\nginx\ssl",
    "infrastructure\terraform",
    "infrastructure\cloudformation",
    "infrastructure\kubernetes",
    "infrastructure\docker",
    "docs",
    "scripts"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Write-Host "Created: $dir" -ForegroundColor Gray
}

# Create Python __init__.py files
$initFiles = @(
    "backend\app\__init__.py",
    "backend\app\agents\__init__.py", 
    "backend\app\services\__init__.py",
    "backend\app\models\__init__.py",
    "backend\app\database\__init__.py",
    "backend\app\database\repositories\__init__.py",
    "backend\app\api\__init__.py",
    "backend\app\core\__init__.py",
    "backend\app\utils\__init__.py"
)

foreach ($file in $initFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
    Write-Host "Created: $file" -ForegroundColor Gray
}

# Create .gitignore for Docker development
@"
# Python
__pycache__/
*.py[cod]
*.pyc
*.pyo
*.pyd
.Python
*.so

# Environment files
.env

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*

# Build outputs
dist/
build/

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Database
*.db
*.sqlite3

# Docker
.dockerignore
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8

# Create main.py
@"
from fastapi import FastAPI

app = FastAPI(title="MiniQuest API")

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
"@ | Out-File -FilePath "backend\app\main.py" -Encoding UTF8

# Create config.py
@"
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    TAVILY_API_KEY: str = ""
    GOOGLE_MAPS_KEY: str = ""
    MONGODB_URL: str = "mongodb://admin:password123@mongodb:27017/miniquest?authSource=admin"
    REDIS_URL: str = "redis://redis:6379"
    
    class Config:
        env_file = ".env"

settings = Settings()
"@ | Out-File -FilePath "backend\app\core\config.py" -Encoding UTF8

# Create requirements.txt
@"
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic-settings==2.1.0
pymongo==4.6.0
openai==1.3.7
anthropic==0.5.0
tavily-python==0.3.3
langchain==0.0.340
langgraph==0.0.20
structlog==23.2.0
requests==2.31.0
"@ | Out-File -FilePath "backend\requirements.txt" -Encoding UTF8

# Create Backend Dockerfile
@"
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
"@ | Out-File -FilePath "backend\Dockerfile" -Encoding UTF8

# Create package.json
$packageContent = @"
{
  "name": "miniquest-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@vitejs/plugin-react": "^4.1.0",
    "typescript": "^5.2.2",
    "vite": "^4.5.0"
  }
}
"@
$packageContent | Out-File -FilePath "frontend\package.json" -Encoding UTF8

# Create Frontend Dockerfile
@"
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
"@ | Out-File -FilePath "frontend\Dockerfile" -Encoding UTF8

# Create React App
@"
import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>MiniQuest</h1>
      <p>AI-Powered Adventure Planning System</p>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
      <div style={{ marginTop: '20px', color: '#666' }}>
        Multi-agent system starting up...
      </div>
    </div>
  )
}

export default App
"@ | Out-File -FilePath "frontend\src\App.tsx" -Encoding UTF8

# Create index.html
@"
<!DOCTYPE html>
<html>
<head>
  <title>MiniQuest - AI Adventure Planning</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
"@ | Out-File -FilePath "frontend\index.html" -Encoding UTF8

# Create main.tsx
@"
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
"@ | Out-File -FilePath "frontend\src\main.tsx" -Encoding UTF8

# Create vite.config.ts
@"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    poll: true
  }
})
"@ | Out-File -FilePath "frontend\vite.config.ts" -Encoding UTF8

# Create docker-compose.yml
@"
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: miniquest_mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
      MONGO_INITDB_DATABASE: miniquest
    volumes:
      - mongodb_data:/data/db
    networks:
      - miniquest-network

  redis:
    image: redis:7.2-alpine
    container_name: miniquest_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - miniquest-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: miniquest_backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URL=mongodb://admin:password123@mongodb:27017/miniquest?authSource=admin
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - TAVILY_API_KEY=${TAVILY_API_KEY}
      - GOOGLE_MAPS_KEY=${GOOGLE_MAPS_KEY}
      - ENVIRONMENT=development
      - DEBUG=true
    volumes:
      - ./backend:/app:cached
      - backend_logs:/app/logs
    depends_on:
      - mongodb
      - redis
    networks:
      - miniquest-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: miniquest_frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
      - WATCHPACK_POLLING=true
      - CHOKIDAR_USEPOLLING=true
    volumes:
      - ./frontend:/app:cached
      - /app/node_modules
    depends_on:
      - backend
    networks:
      - miniquest-network

  nginx:
    image: nginx:1.25-alpine
    container_name: miniquest_nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
    networks:
      - miniquest-network

volumes:
  mongodb_data:
  redis_data:
  backend_logs:

networks:
  miniquest-network:
    driver: bridge
"@ | Out-File -FilePath "docker-compose.yml" -Encoding UTF8

# Create nginx.conf
@"
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }
    
    upstream frontend {
        server frontend:3000;
    }

    server {
        listen 80;
        
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
        }
        
        location /health {
            proxy_pass http://backend/health;
        }
        
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header Upgrade `$http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
"@ | Out-File -FilePath "infrastructure\nginx\nginx.conf" -Encoding UTF8

# Create .env.example
@"
# API Keys (Required for full functionality)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
TAVILY_API_KEY=tvly-your-tavily-key-here
GOOGLE_MAPS_KEY=your-google-maps-api-key-here

# Application Settings
ENVIRONMENT=development
DEBUG=true

# Database (Docker defaults)
MONGODB_URL=mongodb://admin:password123@mongodb:27017/miniquest?authSource=admin
REDIS_URL=redis://redis:6379
"@ | Out-File -FilePath ".env.example" -Encoding UTF8

# Create dev.bat helper script
@"
@echo off
if "%1"=="start" (
    echo Starting MiniQuest services...
    docker-compose up -d
    echo Services started! Check http://localhost
) else if "%1"=="stop" (
    echo Stopping services...
    docker-compose down
) else if "%1"=="logs" (
    docker-compose logs -f
) else if "%1"=="build" (
    echo Building services...
    docker-compose build --no-cache
) else if "%1"=="restart" (
    echo Restarting services...
    docker-compose restart
) else (
    echo MiniQuest Docker Helper
    echo.
    echo Usage: dev.bat [command]
    echo.
    echo Commands:
    echo   start   - Start all services
    echo   stop    - Stop all services  
    echo   logs    - View logs
    echo   build   - Rebuild containers
    echo   restart - Restart services
)
"@ | Out-File -FilePath "dev.bat" -Encoding UTF8

# Create README
@"
# MiniQuest - AI Adventure Planning System

Multi-agent system for personalized local adventure planning with Docker development.

## Quick Start (Docker)

1. Prerequisites
   - Docker Desktop for Windows
   - Git for Windows

2. Setup
   Copy environment template: copy .env.example .env
   Edit .env with your API keys: notepad .env
   Start all services: .\dev.bat start

3. Access Application
   - Main App: http://localhost (via Nginx)
   - Frontend: http://localhost:3000 (direct)
   - Backend API: http://localhost:8000 (direct) 
   - API Docs: http://localhost:8000/docs

## Development Commands

Start all services: .\dev.bat start
View logs: .\dev.bat logs
Rebuild containers: .\dev.bat build
Restart services: .\dev.bat restart
Stop everything: .\dev.bat stop

## Architecture

- Backend: FastAPI with Python 3.11 (Multi-agent system)
- Frontend: React TypeScript with Vite  
- Database: MongoDB 7.0
- Cache: Redis 7.2
- Proxy: Nginx
- AI APIs: OpenAI, Anthropic Claude, Tavily

## Services

- MongoDB: localhost:27017 (admin/password123)
- Redis: localhost:6379
- Backend: localhost:8000  
- Frontend: localhost:3000
- Nginx: localhost:80

## API Keys Required

Add these to your .env file:
- OPENAI_API_KEY - OpenAI GPT models
- ANTHROPIC_API_KEY - Anthropic Claude  
- TAVILY_API_KEY - Tavily web search API
- GOOGLE_MAPS_KEY - Google Maps integration

## Development Workflow

1. Make code changes - Files are live-reloaded via Docker volumes
2. View logs - .\dev.bat logs to debug issues
3. Restart services - .\dev.bat restart if needed
4. Rebuild - .\dev.bat build after dependency changes
"@ | Out-File -FilePath "README.md" -Encoding UTF8

Write-Host ""
Write-Host "Docker development structure created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "What was created:" -ForegroundColor Blue
Write-Host "- Complete directory structure (40+ folders)" -ForegroundColor Gray
Write-Host "- Docker setup (docker-compose.yml + Dockerfiles)" -ForegroundColor Gray
Write-Host "- FastAPI backend with health check" -ForegroundColor Gray
Write-Host "- React frontend with TypeScript" -ForegroundColor Gray
Write-Host "- MongoDB + Redis configuration" -ForegroundColor Gray
Write-Host "- Nginx reverse proxy" -ForegroundColor Gray
Write-Host "- Windows helper script (dev.bat)" -ForegroundColor Gray
Write-Host "- Environment template (.env.example)" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Copy .env.example to .env" -ForegroundColor White
Write-Host "2. Edit .env with your API keys" -ForegroundColor White
Write-Host "3. Run: .\dev.bat start" -ForegroundColor White  
Write-Host "4. Open: http://localhost" -ForegroundColor White
Write-Host ""
Write-Host "Created:" -ForegroundColor Blue
Write-Host "Files:" $((Get-ChildItem -Recurse -File).Count) -ForegroundColor White
Write-Host "Directories:" $((Get-ChildItem -Recurse -Directory).Count) -ForegroundColor White