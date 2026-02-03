# Railway Deployment Guide for Kinetix Backend

## Issues Fixed

The "operation timed out" error was caused by:
1. ✅ **Hardcoded port** - Changed to use Railway's dynamic `$PORT` variable
2. ✅ **Missing Railway config** - Added `railway.toml` and `nixpacks.toml`
3. ✅ **No service linked** - Need to link or create service first

## Files Created

- `railway.toml` - Railway deployment configuration
- `nixpacks.toml` - Build system configuration
- `.railwayignore` - Files to exclude from deployment
- Updated `main.py` - Now reads PORT from environment variable

## Deployment Steps

### Option 1: Deploy via Railway CLI (Recommended)

```bash
# 1. Make sure you're in the backend directory
cd /Users/mac/Desktop/career/code/kinetix/backend

# 2. Check you're logged in
railway whoami

# 3. Link to your Railway project
railway link

# 4. Set your environment variable (REQUIRED!)
railway variables --set GEMINI_API_KEY=your_actual_api_key_here

# 5. Deploy
railway up

# 6. Check deployment status
railway status

# 7. View logs
railway logs

# 8. Get your deployment URL
railway domain
```

### Option 2: Deploy via Railway Dashboard

1. Go to https://railway.app/dashboard
2. Click your `kinetix` project
3. Click "New Service" → "GitHub Repo" or "Empty Service"
4. If using Empty Service:
   - Click "Deploy from GitHub repo" or use Railway CLI
5. Set environment variables in the dashboard:
   - `GEMINI_API_KEY` = your API key
6. Railway will auto-detect Python and deploy

### Option 3: Create New Service via CLI

```bash
# Create a new service in your existing project
railway service create backend

# Link to it
railway link --service backend

# Set variables
railway variables --set GEMINI_API_KEY=your_api_key

# Deploy
railway up
```

## Environment Variables Required

You **MUST** set these in Railway:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

**To set via CLI:**
```bash
railway variables --set GEMINI_API_KEY=your_key_here
```

**To set via Dashboard:**
1. Go to your service
2. Click "Variables" tab
3. Add `GEMINI_API_KEY`
4. Click "Save"

## Verify Deployment

After deployment, test your endpoint:

```bash
# Get your deployment URL
railway domain

# Test the health endpoint (should return JSON)
curl https://your-railway-url.up.railway.app/

# Should see: {"status":"Kinetix AI Backend is running"}
```

## Common Issues & Solutions

### 1. "operation timed out"
- **Cause**: App not binding to Railway's PORT
- **Solution**: ✅ Already fixed - main.py now uses `os.getenv("PORT", 8080)`

### 2. "No service could be found"
- **Cause**: Not linked to a Railway service
- **Solution**: Run `railway link` or `railway service create backend`

### 3. "Failed to start"
- **Cause**: Missing GEMINI_API_KEY
- **Solution**: `railway variables --set GEMINI_API_KEY=your_key`

### 4. "Build failed"
- **Cause**: Missing dependencies or Python version mismatch
- **Solution**: Check `railway logs` and ensure `requirements.txt` is correct

### 5. "WebSocket connection failed"
- **Cause**: Railway's default timeout is 60 seconds
- **Solution**: Already configured in `railway.toml` with extended timeout

## WebSocket Support

Railway supports WebSockets by default. Your `/ws/session` endpoint will work correctly.

**Important**: Make sure your frontend connects to:
```
wss://your-backend.up.railway.app/ws/session
```
(Use `wss://` not `ws://` for secure WebSocket)

## Monitoring

```bash
# View logs in real-time
railway logs

# Check service status
railway status

# View environment variables
railway variables
```

## Cost Management

Railway offers:
- **$5/month free credit** for Hobby plan
- **$5/month** for 100k requests (approx)
- **Automatic sleep** after 30 mins of inactivity (Hobby plan)

### Estimate for Your App:
- Video frame analysis: ~1 request per 3.5 seconds
- AI processing: ~$0.00001 per analysis
- TTS audio: ~$0.00002 per speech
- **Cost per session (10 mins)**: ~$0.004
- **~1250 sessions** per month on free tier

## Troubleshooting

If deployment still fails:

1. **Check logs immediately:**
   ```bash
   railway logs
   ```

2. **Verify environment:**
   ```bash
   railway variables
   ```

3. **Test locally first:**
   ```bash
   PORT=8080 GEMINI_API_KEY=your_key python main.py
   # Should start on http://0.0.0.0:8080
   ```

4. **Check Railway service:**
   ```bash
   railway status
   ```

5. **Try redeploying:**
   ```bash
   railway up --detach
   ```

## Next Steps: Update Frontend

Once deployed, update your frontend WebSocket URL:

**In `frontend/src/pages/LiveSessionPage.tsx`:**

```typescript
// Change from:
const ws = new WebSocket('ws://localhost:8080/ws/session');

// To:
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'wss://your-backend.up.railway.app';
const ws = new WebSocket(`${BACKEND_URL}/ws/session`);
```

Create `.env.production` in frontend:
```
VITE_BACKEND_URL=wss://your-backend.up.railway.app
```

## Success Checklist

- [ ] Railway CLI authenticated (`railway whoami`)
- [ ] Service linked (`railway link`)
- [ ] GEMINI_API_KEY set in Railway (`railway variables`)
- [ ] Deployed successfully (`railway up`)
- [ ] Health endpoint working (visit your-url.up.railway.app/)
- [ ] WebSocket connection working (test with frontend)
- [ ] Logs show no errors (`railway logs`)

## Support

If still having issues:
1. Check Railway logs: `railway logs`
2. Check Railway status page: https://status.railway.app/
3. Join Railway Discord: https://discord.gg/railway

---

**Your backend is now configured for Railway deployment!** 🚀
