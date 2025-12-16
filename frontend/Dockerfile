# frontend/Dockerfile - FIXED to prevent corruption
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl git

# Copy package files FIRST
COPY package.json package-lock.json* ./

# ✅ FIX: Clean install with specific flags to prevent corruption
RUN npm cache clean --force && \
	npm ci --prefer-offline --no-audit --legacy-peer-deps || \
	(rm -rf node_modules package-lock.json && npm install --legacy-peer-deps)

# Copy source code
COPY . .

# Create cache directories with proper permissions
RUN mkdir -p .vite dist node_modules/.cache && \
	chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Start dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]