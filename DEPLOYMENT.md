# FanWatch — AWS Deployment Guide (Minimum Cost)

> **Target cost:** $0/mo (AWS Free Tier + Supabase Free)  
> **Architecture:** EC2 (API) + Amplify (Frontend) + Supabase (Postgres)  
> **Time to deploy:** ~1-2 hours from account creation to live app

---

## Architecture

```
┌─────────────┐      ┌──────────────────────────┐      ┌───────────────────┐
│   Browser   │─────▶│  AWS Amplify (CDN + SSR)  │─────▶│  EC2 t2.micro     │
│             │      │  Next.js 16 frontend      │      │  Node.js API      │
└─────────────┘      └──────────────────────────┘      │  nginx + PM2      │
                                                        └─────────┬─────────┘
                                                                  │
                                                        ┌─────────▼─────────┐
                                                        │  Supabase Postgres │
                                                        │  (external, free)  │
                                                        └───────────────────┘
```

---

## Why EC2 Instead of Lambda?

| Factor | EC2 | Lambda |
|--------|-----|--------|
| **Code changes needed** | Zero — Node HTTP server runs as-is | Requires a Lambda adapter (e.g. `@vendia/serverless-express`) |
| **Cold starts** | None — always running | 5-15s on first request after idle |
| **WebSocket/long-poll ready** | Yes | No (API Gateway has 29s timeout) |
| **Debugging** | SSH in, check logs, restart | CloudWatch only, harder to debug |
| **Free tier** | 750 hrs/mo for 12 months (enough for 24/7) | 1M requests free but adapter work needed |
| **Complexity** | Simple: one server, one process | API Gateway + Lambda + IAM roles + layers |
| **For this project** | Ship today, no rewrites | Ship next week after writing adapter |

**Bottom line:** Lambda is better long-term for scale-to-zero, but EC2 deploys your existing `server.ts` with zero changes. Lambda requires writing an adapter and testing it — not worth the risk for a tomorrow deadline.

**Migration path:** When traffic grows, wrap handlers in a Lambda adapter (`@vendia/serverless-express`) + API Gateway. The transport-agnostic handler pattern already supports this (see `server.ts` header comment).

---

## External Services Required

| # | Service | URL | Purpose | Cost |
|---|---------|-----|---------|------|
| 1 | **AWS** (new account) | https://aws.amazon.com/free | EC2 + Amplify hosting | $0 (12-mo free tier) |
| 2 | **Supabase** | https://supabase.com | Postgres database | $0 (free: 500MB, pauses after 7d idle) |
| 3 | **GitHub** | (existing) | Source code, Amplify auto-deploy | $0 |
| 4 | **Anthropic** _(optional)_ | https://console.anthropic.com | AI recommendations | $0 (skip → heuristic fallback) |

---

## Pre-Deployment Steps (Do Before Touching AWS)

### Step 0: Decide on Email

Create a **new email address** (Gmail/Outlook) dedicated to AWS. This ensures:
- Clean 12-month free tier (no prior usage)
- Separate billing alerts
- Can be handed off to another team member later

### Step 1: Create AWS Account

1. https://aws.amazon.com/free → **Create a Free Account**
2. Enter new email + set a strong root password
3. Account type: **Personal**
4. Payment: credit/debit card (won't be charged in free tier)
5. Phone verification via SMS/call
6. Support plan: **Basic** (free)
7. Wait 5 minutes for activation
8. **Set region:** `us-east-1` (N. Virginia) — cheapest, most services

### Step 2: Secure the AWS Account

1. **Enable MFA on root:** IAM → Security credentials → Assign MFA device
2. **Create an IAM user** (optional but recommended):
   - IAM → Users → Create user → `fanwatch-admin`
   - Attach `AdministratorAccess` policy
   - Enable console access
   - Use this user for day-to-day (keep root for billing only)
3. **Set billing alarm:**
   - Billing → Budgets → Create budget → $1/mo threshold → email alert

### Step 3: Create Supabase Project

1. https://supabase.com → Sign in with GitHub
2. New Project:
   - Name: `fanwatch-prod`
   - Password: generate strong, **save it**
   - Region: **US East (N. Virginia)** (matches AWS region)
3. After provisioning, go to **Settings → Database → Connection string → URI**
4. Select **Transaction pooler** (port 6543)
5. Copy the URI — you'll use it as `DATABASE_URL`

### Step 4: Run Migrations + Seed Data (Local)

```bash
cd ingestion

# Set your Supabase connection string
export DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Create tables
npm run migrate

# Seed venues, matches, events
npm run ingest
```

Verify in Supabase dashboard: Table Editor → `venues` table has rows.

### Step 5: Launch EC2 Instance

1. **EC2 → Launch Instance:**
   - Name: `fanwatch-api`
   - AMI: **Amazon Linux 2023** (free tier eligible)
   - Type: **t2.micro** (free tier: 750 hrs/mo)
   - Key pair: Create new → `fanwatch-key` → Download `.pem`
   - Security group: Create new with these inbound rules:
     - SSH (22) — My IP only
     - HTTP (80) — Anywhere (0.0.0.0/0)
     - HTTPS (443) — Anywhere (0.0.0.0/0)
   - Storage: 8 GB gp3

2. **Allocate Elastic IP:**
   - EC2 → Elastic IPs → Allocate → Associate with instance
   - Note the IP: `<YOUR_EC2_IP>`

### Step 6: Configure EC2

```bash
# SSH in
chmod 400 fanwatch-key.pem
ssh -i fanwatch-key.pem ec2-user@<YOUR_EC2_IP>

# Install Node.js 20 + nginx + git
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git nginx

# Install PM2 globally
sudo npm install -g pm2

# Clone the repo
git clone https://github.com/sharmaajanya27/FIFA_FAn_EXP.git
cd FIFA_FAn_EXP/api

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
PORT=3001
ADMIN_EMAILS=your@email.com
NODE_ENV=production
ALLOWED_ORIGINS=https://main.xxxxx.amplifyapp.com
EOF

# Start with PM2
pm2 start npm --name "fanwatch-api" -- start
pm2 save
pm2 startup  # run the command it prints

# Verify
curl http://localhost:3001/health
```

Configure nginx:
```bash
sudo tee /etc/nginx/conf.d/fanwatch.conf << 'EOF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

    location / {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Request size limit (blocks oversized photo uploads at edge)
        client_max_body_size 12M;
    }
}
EOF

# Remove default config, start nginx
sudo rm -f /etc/nginx/conf.d/default.conf
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl start nginx
```

**Verify:** `curl http://<YOUR_EC2_IP>/health` → `{"ok":true}`

### Step 7: Deploy Frontend to Amplify

1. AWS Console → **Amplify** → **Create new app** → **Host web app**
2. Source: **GitHub** → Authorize → select `sharmaajanya27/FIFA_FAn_EXP`
3. Branch: `main`
4. App settings:
   - Monorepo: Yes → App root: `frontend`
   - Framework: Next.js (auto-detected)
5. Build settings: uses `amplify.yml` from repo root (already created)
6. Environment variables:
   ```
   NEXT_PUBLIC_API_BASE = http://<YOUR_EC2_IP>
   NEXT_PUBLIC_SITE_URL = https://main.<id>.amplifyapp.com
   NEXT_PUBLIC_SUPABASE_URL = https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = <your-supabase-anon-key>
   ```
7. Deploy → wait 3-5 minutes

### Step 8: Post-Deploy

1. Get Amplify URL (e.g., `https://main.d1a2b3c4.amplifyapp.com`)
2. Update EC2 `.env` → `ALLOWED_ORIGINS=https://main.d1a2b3c4.amplifyapp.com`
3. Restart: `pm2 restart fanwatch-api`
4. Update Amplify env var: `NEXT_PUBLIC_SITE_URL=https://main.d1a2b3c4.amplifyapp.com`
5. Trigger Amplify redeploy

---

## Updating After Deployment

**API (manual):**
```bash
ssh -i fanwatch-key.pem ec2-user@98.91.107.103
cd FIFA_FAn_EXP && git pull origin main
cd api && npm install && pm2 restart fanwatch-api
```

**Frontend (automatic):**
Push to `main` branch → Amplify auto-deploys via GitHub webhook.

**Database migrations:**
```bash
# From local machine
cd ingestion
DATABASE_URL="postgresql://postgres.lzhgbodmdsflasvashkp:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres" npm run migrate
```

---

## Actual Deployment Record (June 2026)

### What We Deployed

| Component | Details |
|-----------|---------|
| **EC2 Instance** | t2.micro, Amazon Linux 2023, us-east-1 |
| **Elastic IP** | `98.91.107.103` |
| **Instance Public IP** | `13.221.134.50` (replaced by Elastic IP) |
| **Supabase Project** | `fanwatch-prod` (ref: `lzhgbodmdsflasvashkp`) |
| **Supabase Pooler** | `aws-1-us-east-1.pooler.supabase.com:6543` |
| **GitHub Repo** | `sharmaajanya27/FIFA_FAn_EXP` (branch: `main`) |
| **SSH Key** | `fanwatch-key.pem` (stored at `~/Documents/Fanwatch-aws/`) |

### SSH Access

```bash
ssh -i ~/Documents/Fanwatch-aws/fanwatch-key.pem ec2-user@98.91.107.103
```

### EC2 Setup Commands (What We Actually Ran)

```bash
# 1. Install Node.js 20, nginx, git, PM2
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git nginx
sudo npm install -g pm2

# 2. Clone repo
git clone https://github.com/sharmaajanya27/FIFA_FAn_EXP.git
cd FIFA_FAn_EXP/api

# 3. Install dependencies
npm install

# 4. Create production .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres.lzhgbodmdsflasvashkp:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://lzhgbodmdsflasvashkp.supabase.co
PORT=3001
NODE_ENV=production
ADMIN_EMAILS=
ALLOWED_ORIGINS=
EOF

# 5. Start API with PM2
pm2 start npm --name "fanwatch-api" -- start
pm2 save
pm2 startup  # then run the command it outputs with sudo
```

### Nginx Configuration (What Actually Works)

The default nginx.conf had a conflicting server block on port 80. We had to replace the entire nginx.conf:

```bash
# Replace nginx.conf entirely (removes default server block conflict)
sudo tee /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    include /etc/nginx/conf.d/*.conf;
}
EOF

# Create the proxy config
sudo tee /etc/nginx/conf.d/fanwatch.conf << 'EOF'
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

server {
    listen 80;
    server_name _;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 12M;
    }
}
EOF

# Test and start nginx
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl restart nginx
```

### PM2 Auto-Start on Reboot

```bash
pm2 startup  # prints a sudo command — run it
pm2 save     # saves current process list
```

### Data Ingestion (Run From Local Machine)

```bash
cd ingestion

# Create .env with DATABASE_URL
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres.lzhgbodmdsflasvashkp:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres
EOF

# Run migrations (creates tables)
npm run migrate

# Ingest all cities (scrapes venues, geocodes, scores, publishes to Supabase)
npm run ingest
```

**Result:** 29 cities ingested, ~45,000+ venues, 12 matches, events loaded.  
**Failed:** Phoenix (Overpass API rate-limited 406) — retry later with `npm run ingest -- phoenix`.

### Deploy Code Updates to EC2

```bash
# From local machine: commit, push
git add -A && git commit -m "feat: description" && git push origin main

# Then update EC2
ssh -i ~/Documents/Fanwatch-aws/fanwatch-key.pem ec2-user@98.91.107.103 \
  "cd FIFA_FAn_EXP && git pull origin main && cd api && npm install && pm2 restart fanwatch-api"
```

### Verify Deployment

```bash
curl http://98.91.107.103/health          # → {"ok":true}
curl http://98.91.107.103/cities           # → 29 cities
curl http://98.91.107.103/venues/miami     # → venues in Miami
```

### Issues We Hit & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| nginx 80 conflict | Default nginx.conf has its own server block | Replace entire `nginx.conf` with minimal config |
| `ECONNRESET` on /cities | Stale DB pool after Elastic IP reassignment | `pm2 restart fanwatch-api` |
| SSH host key mismatch | Elastic IP changed from original IP | `ssh-keygen -R 98.91.107.103` then reconnect |
| Phoenix ingestion 406 | Overpass API rate limit | Retry later; 29/30 cities loaded fine |
| ingestion .env not found | `loadDotenv()` reads from CWD | Created `.env` in `ingestion/` directory |

### Remaining TODO

- [ ] Deploy frontend to AWS Amplify (connect GitHub repo)
- [ ] Set `ALLOWED_ORIGINS` on EC2 after getting Amplify URL
- [ ] Set `NEXT_PUBLIC_API_BASE=http://98.91.107.103` in Amplify env vars
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Amplify env vars
- [ ] Enable Anonymous Sign-Ins in Supabase dashboard (Authentication → Providers → Anonymous)
- [ ] Rotate SSH key (was exposed during deployment session)
- [ ] Retry Phoenix city ingestion
- [ ] Add HTTPS via Let's Encrypt + certbot (before sharing publicly)
- [ ] Configure `ADMIN_EMAILS` for admin dashboard access

---

## Cost Breakdown

| Service | Free Tier Limit | What Happens After |
|---------|----------------|-------------------|
| EC2 t2.micro | 750 hrs/mo × 12 months | ~$8.50/mo |
| Elastic IP | Free when attached to running EC2 | $3.65/mo if detached |
| Amplify Hosting | 1000 build min, 15 GB served, 500K req | Pay-as-you-go |
| Supabase Free | 500 MB, pauses after 7d idle | Upgrade to Pro $25/mo |
| **Year 1 Total** | | **$0/mo** |
| **Year 2+** | | **~$12-35/mo** |

---

## Future Upgrades (When Needed)

| Upgrade | When | Cost |
|---------|------|------|
| HTTPS for API | Before sharing publicly | Free (Let's Encrypt via certbot) |
| Custom domain | When you have a brand name | ~$12/yr (Route 53) |
| Auto-deploy API | When manual SSH gets tedious | Free (GitHub Actions + CodeDeploy) |
| User accounts | Before real users sign up | Free (Supabase Auth user sessions) |
| Scale API | >100 concurrent users | Upgrade to t3.small ($15/mo) |
