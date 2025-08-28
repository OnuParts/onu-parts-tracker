# ONU Parts Tracker - Complete Deployment Guide

This is the complete, full-featured deployment package for the ONU Parts Tracker with all functionality including database, authentication, email system, and complete backend.

## What's Included

✅ **Complete Backend** - Full Node.js/Express server with all API routes  
✅ **Database Schema** - Complete PostgreSQL database with all tables  
✅ **Authentication System** - Multi-role user authentication  
✅ **Email System** - Automated delivery receipt emails  
✅ **WebSocket Support** - Real-time updates  
✅ **File Uploads** - Complete file handling  
✅ **All Features** - Every feature from your Replit version  

## Deployment Options

### Option 1: Railway (Recommended - Easy PostgreSQL)

1. **Create Railway account** at https://railway.app
2. **Create new project** → "Deploy from GitHub repo"
3. **Connect your repository** with these files
4. **Add PostgreSQL database**:
   - Click "Add service" → "Database" → "PostgreSQL"
   - Railway automatically provides DATABASE_URL
5. **Set environment variables**:
   ```
   NODE_ENV=production
   SESSION_SECRET=your-random-secret-key-here
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASSWORD=your-app-password
   ```
6. **Deploy** - Railway auto-builds and deploys

### Option 2: Render

1. **Create Render account** at https://render.com
2. **Create PostgreSQL database**:
   - New → PostgreSQL → Create database
   - Copy the "External Database URL"
3. **Create web service**:
   - New → Web Service → Connect your repo
   - Build Command: `npm install`
   - Start Command: `node server.js`
4. **Set environment variables**:
   ```
   DATABASE_URL=your-postgresql-url-from-step-2
   NODE_ENV=production
   SESSION_SECRET=your-random-secret-key
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASSWORD=your-app-password
   ```
5. **Deploy**

### Option 3: DigitalOcean App Platform

1. **Create DigitalOcean account**
2. **Create Managed PostgreSQL database**:
   - Databases → Create → PostgreSQL
   - Copy connection string
3. **Create App**:
   - Apps → Create App → GitHub repo
   - Runtime: Node.js
4. **Configure environment**:
   - Add all environment variables from .env.example
   - Set DATABASE_URL to your PostgreSQL connection string
5. **Deploy**

### Option 4: Vercel + External Database

1. **Create Neon PostgreSQL database** (free):
   - Go to https://neon.tech → Create account
   - Create new project → Copy connection string
2. **Deploy to Vercel**:
   - Connect GitHub repo to Vercel
   - Set Build Command: `npm run build`
   - Set environment variables including DATABASE_URL
3. **Initialize database** using the schema file

## Setup Steps

### 1. Database Setup

Upload the provided `database-schema.sql` file to your PostgreSQL database:

```bash
# Method 1: Using psql command line
psql your-database-url -f database-schema.sql

# Method 2: Copy and paste into database admin panel
# Copy contents of database-schema.sql and run in your database console
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Required - Your PostgreSQL database
DATABASE_URL=postgresql://username:password@host:port/database

# Required - Session security
SESSION_SECRET=generate-a-random-string-here

# Required - Email configuration (choose one)
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-specific-password

# Production settings
NODE_ENV=production
PORT=3000
```

### 3. Email Configuration

**For Gmail (Recommended):**
1. Enable 2-factor authentication on your Gmail account
2. Generate an "App Password" (not your regular password)
3. Use the app password in GMAIL_PASSWORD

**For other SMTP:**
Use the SMTP_* variables instead of GMAIL_* variables.

### 4. Domain Setup

**For custom domain:**
1. Add your domain in your hosting platform
2. Update DNS records as instructed by your hosting provider
3. SSL certificates are usually automatic

## Default Login

- **Username:** `admin`
- **Password:** `password123`
- **⚠️ Change this immediately after first login!**

## Features Included

- ✅ Complete inventory management
- ✅ Parts delivery tracking with automated emails
- ✅ Multi-role authentication (Admin, Technician, Student, Controller)
- ✅ Real-time dashboard with WebSocket updates
- ✅ Barcode scanning and generation
- ✅ Excel import/export
- ✅ PDF reports
- ✅ Tool sign-out system
- ✅ Parts pickup tracking
- ✅ Usage analytics
- ✅ Mobile-responsive design

## Cost Estimate

**Railway:** $5/month (includes PostgreSQL)  
**Render:** $7/month (Web service) + $7/month (PostgreSQL) = $14/month  
**DigitalOcean:** $5/month (App) + $15/month (PostgreSQL) = $20/month  
**Vercel + Neon:** $0/month (both have generous free tiers)

## Support

This deployment package includes everything from your Replit version. All features work identically to what you've been using.

For deployment issues:
1. Check the logs in your hosting platform
2. Verify all environment variables are set
3. Ensure database schema was imported correctly
4. Test the /health endpoint to verify server is running

## Migration from Replit

Your data can be exported from Replit and imported to your new database using the Excel export/import functionality built into the system.

---

**🎉 You now have a complete, production-ready deployment with all the functionality you need!**