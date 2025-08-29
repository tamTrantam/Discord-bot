# 🚀 Deployment Guide

This Discord music bot is optimized for deployment on various cloud platforms. All native dependencies have been replaced with pure JavaScript alternatives to prevent compilation issues.

## ⚡ Quick Deploy Options

### Render.com (Recommended - Free Tier Available)
1. Fork this repository to your GitHub account
2. Connect your GitHub to Render.com
3. Create a new Web Service from your repository
4. Set environment variables:
   - `DISCORD_TOKEN`: Your bot token
   - `NODE_ENV`: production
5. The bot will automatically bind to the provided PORT and install yt-dlp
6. Health check endpoint available at `/`

### Railway
1. Connect your GitHub repository to Railway
2. Set `DISCORD_TOKEN` environment variable
3. Deploy will automatically install dependencies and yt-dlp

### Heroku
1. Create a new Heroku app
2. Add the following buildpacks in order:
   - `heroku/python` (for yt-dlp)
   - `heroku/nodejs`
3. Set environment variables:
   - `DISCORD_TOKEN`: Your bot token
   - `NODE_ENV`: production
4. Deploy from GitHub or use Heroku CLI

### DigitalOcean App Platform
1. Create new app from GitHub repository
2. Set environment variables in app settings
3. Automatic deployment with health checks enabled

## 🐳 Docker Deployment

### Using Docker Compose
```yaml
version: '3.8'
services:
  discord-bot:
    build: .
    environment:
      - DISCORD_TOKEN=your_bot_token_here
      - NODE_ENV=production
      - PORT=3000
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

### Manual Docker Commands
```bash
# Build the image
docker build -t discord-music-bot .

# Run the container
docker run -d \
  --name discord-bot \
  -e DISCORD_TOKEN=your_bot_token_here \
  -e NODE_ENV=production \
  -p 3000:3000 \
  --restart unless-stopped \
  discord-music-bot
```

## 🔧 Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DISCORD_TOKEN` | ✅ | Your Discord bot token | None |
| `NODE_ENV` | ❌ | Environment mode | development |
| `PORT` | ❌ | HTTP server port for health checks | 3000 |

## ⚙️ Dependencies & Requirements

- **Node.js**: 18+ required
- **Python 3**: Required for yt-dlp installation
- **FFmpeg**: For audio processing
- **yt-dlp**: YouTube video/audio extraction

## 🏥 Health Monitoring

The bot includes an HTTP health check endpoint at `/` that returns:
```json
{
  "status": "online",
  "bot": "Discord Music Bot v2.0",
  "uptime": 1234.567,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "servers": 5
}
```

## 🚨 Troubleshooting

### Common Issues

**"No open ports detected" on Render.com**
- ✅ Fixed: Bot now includes HTTP server on PORT for health checks

**"yt-dlp: not found"**
- ✅ Fixed: Dockerfile and render.yaml install yt-dlp automatically

**Native dependency compilation errors**
- ✅ Fixed: Replaced `node-opus` with `prism-media`, `sodium-native` with `tweetnacl`

**Bot not responding to commands**
- Check `DISCORD_TOKEN` is set correctly
- Verify bot has proper permissions in Discord server
- Check bot is online in Discord Developer Portal

**Memory/CPU issues**
- Bot includes automatic cleanup systems
- Periodic message cleanup to prevent memory leaks
- Optimized for minimal resource usage

## 📊 Platform-Specific Notes

### Render.com
- Free tier: 750 hours/month
- Automatic SSL certificates
- Built-in health checks
- Zero-downtime deployments

### Railway
- $5/month for continuous operation
- Automatic HTTPS
- Built-in metrics and logging

### Heroku
- Free tier discontinued, paid plans start at $7/month
- Requires credit card even for hobby plans
- Excellent add-on ecosystem

### DigitalOcean
- $5/month minimum
- Full control over deployment
- Integrated monitoring

## 🔄 Auto-Deploy Setup

For automatic deployments on code changes:
1. Connect your repository to your chosen platform
2. Enable auto-deploy from main branch
3. Set up environment variables
4. Platform will automatically redeploy on git push

## 📈 Scaling Considerations

- Single instance handles multiple Discord servers
- Stateless design allows horizontal scaling
- Consider Redis for queue persistence in multi-instance setups
- Monitor memory usage with large queues

---

**Need help?** Check the [README.md](README.md) for basic setup or [DOCUMENTATION.md](DOCUMENTATION.md) for detailed features.
