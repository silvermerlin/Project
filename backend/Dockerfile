# Railway Deployment Dockerfile for AI Code Editor Backend
FROM node:18-alpine

# Install additional tools for terminal and file operations
RUN apk add --no-cache bash git openssh-client curl vim nano

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create workspace directory
RUN mkdir -p /workspace
RUN chmod 755 /workspace

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Start the server
CMD ["node", "server.js"] 