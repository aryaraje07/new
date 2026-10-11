# SkillifyAI - Frontend

A modern, AI-powered educational platform built with Next.js, React, and Tailwind CSS.

## 🚀 Deployment Guide

### Vercel Deployment (Frontend)

#### Prerequisites
- Vercel account
- GitHub repository
- Node.js 18+

#### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```

#### Step 3: Deploy to Vercel
```bash
# From the frontend directory
vercel --prod
```

#### Step 4: Configure Environment Variables in Vercel Dashboard
Go to your Vercel project dashboard → Settings → Environment Variables and add:

```
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NEXT_PUBLIC_API_URL=https://your-api-name.onrender.com
NODE_ENV=production
```

#### Step 5: Custom Domain (Optional)
In Vercel dashboard → Settings → Domains, add your custom domain.

---

### Render Deployment (Backend)

#### Prerequisites
- Render account
- GitHub repository
- Node.js 18+

#### Step 1: Prepare Backend
In your backend directory, create `package.json` with:
```json
{
  "name": "skillifyai-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### Step 2: Create `render.yaml` in Backend Root
```yaml
services:
  - type: web
    name: skillifyai-backend
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: MONGODB_URI
        value: your-mongodb-connection-string
      - key: JWT_SECRET
        value: your-jwt-secret
      - key: CORS_ORIGIN
        value: https://your-app-name.vercel.app
```

#### Step 3: Deploy to Render
1. Push your backend to GitHub
2. Go to Render Dashboard → New → Web Service
3. Connect your GitHub repository
4. Configure build and start commands
5. Add environment variables
6. Deploy!

---

## 🛠️ Local Development Setup

### Frontend
```bash
# Clone the repository
git clone <repository-url>
cd Logic_Legends/frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Backend
```bash
# Navigate to backend directory
cd ../backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

---

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js app router
│   ├── (auth)/            # Authentication pages
│   ├── student/           # Student pages
│   ├── faculty/           # Faculty pages
│   ├── parent/            # Parent pages
│   └── admin/             # Admin pages
├── components/            # Reusable components
│   ├── ui/               # UI components
│   ├── auth/             # Authentication components
│   └── student/          # Student-specific components
├── lib/                  # Utility functions
│   └── api-config.js     # API configuration
├── hooks/                 # Custom React hooks
│   └── use-api.js        # API hook
├── contexts/              # React contexts
├── public/               # Static assets
├── scripts/               # Build scripts
│   └── build.js          # Pre-build script
├── .env.example          # Environment variables template
├── vercel.json           # Vercel configuration
├── next.config.js        # Next.js configuration
└── package.json          # Dependencies and scripts
```

---

## 🔧 Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000
NODE_ENV=development
```

### Production (Set in Vercel/Render)
```env
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NEXT_PUBLIC_API_URL=https://your-api-name.onrender.com
NODE_ENV=production
```

---

## 🚀 Build Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Clean build artifacts
npm run clean

# Preview build
npm run preview
```

---

## 🌐 CORS Configuration

The frontend is configured to handle CORS automatically. In production, make sure:

1. Backend CORS origin is set to your Vercel domain
2. Environment variables are properly configured
3. API URLs are accessible from the frontend

---

## 📊 Monitoring & Analytics

### Vercel Analytics
- Automatically enabled for Vercel deployments
- View in Vercel dashboard → Analytics

### Error Tracking
- Errors are logged in Vercel dashboard → Logs
- Monitor 404s and API errors

---

## 🔄 CI/CD Pipeline

### Vercel (Automatic)
- Push to main branch → Automatic deployment
- Preview deployments for pull requests
- Custom domains auto-configure

### Render (Manual/Auto)
- GitHub integration available
- Auto-deploy on push to main
- Rollback support

---

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check API URL in environment variables
   - Verify backend CORS configuration

2. **Build Failures**
   - Run `npm run type-check` locally
   - Check for missing dependencies

3. **Environment Variables**
   - Verify all required variables are set
   - Check for typos in variable names

4. **API Connection Issues**
   - Verify backend is running and accessible
   - Check network connectivity

### Debug Commands
```bash
# Check build
npm run build

# Type check
npm run type-check

# Clean and rebuild
npm run clean && npm run build

# Preview production build
npm run preview
```

---

## 📝 Notes

- Remove Docker files before Vercel deployment
- Always test locally before deploying
- Monitor build logs for errors
- Keep dependencies updated
- Use environment-specific configurations
