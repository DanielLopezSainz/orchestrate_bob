# Deployment Troubleshooting Guide

## Issue: UI Changes Not Visible After Code Updates

### Root Cause Analysis

The application uses a **multi-stage Docker build** where:
1. Frontend is built in Stage 1 (`build-stage`)
2. Built files are copied to `backend/public` 
3. Backend serves the static files from `backend/public`

**When you see old UI after pushing code changes, it means:**
- Your local/deployed Docker container is still running the OLD build
- The container needs to be rebuilt and redeployed with the new code

### Architecture Overview

```
Source Code (GitHub)
    ↓
GitHub Actions (builds Docker image)
    ↓
Docker Registry (stores image)
    ↓
Deployment Platform (pulls and runs image)
    ↓
Running Container (serves old build until redeployed)
```

### Diagnostic Steps

#### 1. Check Browser Console Logs

Open browser DevTools (F12) → Console tab. You should see:

```
🚀 App: Application initialized
🚀 App: Config loaded: [Your App Title]
🎨 ChatHeader: Component mounted with TimeFilled icon
🎨 ChatHeader: Frontend Build: v3.1-ICON-FIX
🎨 ChatHeader: Backend version: [version]
```

**If you see:**
- `v3.0-TEMPLATE` → Old build is still running
- `v3.1-ICON-FIX` → New build is loaded ✅

#### 2. Check UI Version Tag

Look at the header bar in the application. You should see two tags:
- **UI: v3.1-ICON-FIX** (Frontend version)
- **API: [version]** (Backend version)

#### 3. Check Icon in Header

The chat history button in the header should show:
- ✅ **TimeFilled** icon (filled clock) - NEW
- ❌ **History** icon (outline clock) - OLD

### Solution Paths

#### Option A: Wait for Automatic Deployment (Recommended)

If using GitHub Actions + automatic deployment:

1. **Check GitHub Actions**
   - Go to: `https://github.com/[your-repo]/actions`
   - Verify the latest workflow run completed successfully
   - Check that Docker image was built and pushed

2. **Check Deployment Platform**
   - Verify the platform pulled the new image
   - Check deployment logs for any errors
   - Confirm the new container is running

3. **Force Browser Refresh**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache

#### Option B: Manual Local Build & Test

To test changes locally before deployment:

```bash
# Navigate to project root
cd Orchestrate_Demo_Documentation/Project_vG

# Build frontend
cd frontend
npm install
npm run build

# The build output goes to: ../backend/public

# Start backend (which serves the frontend)
cd ../backend
npm install
npm start

# Open browser to: http://localhost:8080
```

#### Option C: Rebuild Docker Image Locally

```bash
# Navigate to project root
cd Orchestrate_Demo_Documentation/Project_vG

# Build Docker image
docker build -t ibm-orchestrate-bob:local .

# Run container
docker run -p 8080:8080 \
  -e SESSION_SECRET=your-secret \
  -e WATSONX_API_KEY=your-key \
  -e WATSONX_PROJECT_ID=your-project \
  ibm-orchestrate-bob:local

# Open browser to: http://localhost:8080
```

#### Option D: Force Deployment Platform to Pull New Image

Depending on your platform:

**IBM Code Engine:**
```bash
ibmcloud ce application update [app-name] --image [registry]/ibm-orchestrate-bob:latest
```

**Kubernetes:**
```bash
kubectl rollout restart deployment/[deployment-name]
```

**Docker Compose:**
```bash
docker-compose pull
docker-compose up -d
```

### Verification Checklist

After deployment, verify:

- [ ] Browser console shows `v3.1-ICON-FIX`
- [ ] UI tag in header shows `v3.1-ICON-FIX`
- [ ] Chat history icon is TimeFilled (filled clock)
- [ ] No console errors related to icon imports
- [ ] Application functions normally

### Common Issues

#### Issue: "Module not found" errors in console

**Cause:** Icon imports are incorrect
**Solution:** Verify all icon imports use named imports:
```javascript
import { IconName } from '@carbon/icons-react';
```

#### Issue: Build succeeds but changes not visible

**Cause:** Browser cache or CDN cache
**Solution:** 
1. Hard refresh browser
2. Clear browser cache
3. Try incognito/private window
4. Check if CDN needs cache invalidation

#### Issue: Docker build fails with icon errors

**Cause:** Icon doesn't exist in @carbon/icons-react
**Solution:** 
1. Check available icons: `ls node_modules/@carbon/icons-react/lib/`
2. Use correct icon name (case-sensitive)
3. Verify icon is exported in package

### Files Modified in This Fix

1. **ChatHeader.jsx** - Changed History → TimeFilled icon
2. **ChatHistoryPanel.jsx** - Fixed icon imports, changed History → TimeFilled
3. **ChatInput.jsx** - Fixed Send icon import
4. **MessageList.jsx** - Fixed User and Bot icon imports
5. **App.jsx** - Added diagnostic logging

### Next Steps

1. Monitor GitHub Actions for successful build
2. Wait for deployment platform to pull new image
3. Check browser console for version confirmation
4. Verify icon changes are visible
5. Remove diagnostic console.log statements once confirmed working

### Contact

If issues persist after following this guide:
1. Check GitHub Actions logs for build errors
2. Check deployment platform logs for runtime errors
3. Verify environment variables are set correctly
4. Ensure Docker registry credentials are valid