# Use Node.js 18 LTS Alpine for smaller image size
FROM node:18-alpine

# Install system dependencies required for audio processing (single layer)
RUN apk add --no-cache python3 py3-pip ffmpeg wget \
    && pip3 install --no-cache-dir yt-dlp \
    && rm -rf /var/cache/apk/* /tmp/*

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies in a single layer
RUN npm ci --only=production --no-audit --no-fund \
    && npm cache clean --force \
    && rm -rf /root/.npm

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Optimized health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=2 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the bot
CMD ["node", "index.js"]
