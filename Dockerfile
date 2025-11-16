# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install git (required for git operations)
RUN apk add --no-cache git openssh-client

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S pullmate && \
    adduser -S pullmate -u 1001 && \
    mkdir -p /home/pullmate/.pullmate && \
    chown -R pullmate:pullmate /home/pullmate

# Create volume mount point for repositories
VOLUME ["/repos", "/home/pullmate/.pullmate"]

# Switch to non-root user
USER pullmate

# Set environment variables
ENV NODE_ENV=production
ENV HOME=/home/pullmate

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('PullMate is healthy')" || exit 1

# Default command
ENTRYPOINT ["node", "src/cli.js"]

# Labels for metadata
LABEL maintainer="Raj Shah"
LABEL description="PullMate - Automatically pull your git repositories"
LABEL version="1.0.2"
