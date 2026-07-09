# FanFndr Infrastructure as Code

Terraform + GitHub Actions that create **every AWS resource** the app runs on
today, and let you stand up an identical stack in **another region** by changing
one value.

> Scope: AWS only. Supabase (Postgres) is an external service — you create the
> project in its dashboard and pass its connection string in as a secret. See
> [Database](#database-supabase).

## What gets created

| Resource | Terraform | Matches today |
|----------|-----------|---------------|
| Amplify app + `main` branch + env vars | `amplify.tf` | Frontend (Next.js SSR), auto-build on push |
| Amplify custom domain (apex + www, or a subdomain) | `amplify.tf` | `fanfndr.com` / `www` |
| EC2 (Amazon Linux 2023, t2.micro, gp3, IMDSv2) | `compute.tf` | API host |
| Elastic IP | `compute.tf` | Stable API address |
| Security group (80/443 public, SSH optional) | `network.tf` | `sg-…` inbound rules |
| EC2 setup: Node 20, nginx, PM2, certbot, `.env` | `user_data.sh.tftpl` | The hand-run box setup |
| IAM instance role (SSM read + Session Manager) | `iam.tf` | — (replaces manual `.env`) |
| SSM Parameter Store secrets | `secrets.tf` | Replaces the hand-written `.env` |
| Route 53 `api.<domain>` A record | `dns.tf` | `api.fanfndr.com` → EIP |
| GitHub OIDC provider + CI role | `bootstrap/` | — (new, enables keyless CI) |
| S3 + DynamoDB remote state | `bootstrap/` | — (new) |

The imperative box setup from [DEPLOYMENT.md](../knowledge-base/DEPLOYMENT.md)
is now [`user_data.sh.tftpl`](terraform/user_data.sh.tftpl): a fresh instance
installs everything, pulls secrets from SSM into `api/.env`, writes the nginx
proxy, starts PM2, and requests a Let's Encrypt cert — all on first boot.

## Layout

```
infra/terraform/
  bootstrap/           # run ONCE: state bucket, lock table, GitHub OIDC + CI role
  *.tf                 # the main stack (one workspace per region)
  user_data.sh.tftpl   # EC2 cloud-init (codifies the manual box setup)
  envs/<region>.tfvars # non-secret, per-region topology (committed)
```

---

## One-time setup

### 1. Bootstrap the backend + CI role (admin, local)

```bash
cd infra/terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars   # set a globally-unique bucket name
terraform init && terraform apply
```

Note the outputs — you'll add them as GitHub secrets next.

### 2. Add GitHub Actions secrets

Repo → Settings → Secrets and variables → Actions:

| Secret | From | Notes |
|--------|------|-------|
| `AWS_ROLE_ARN` | bootstrap output `ci_role_arn` | Keyless OIDC role |
| `TF_STATE_BUCKET` | bootstrap output `state_bucket` | |
| `TF_LOCK_TABLE` | bootstrap output `lock_table` | |
| `DATABASE_URL` | Supabase | Postgres pooler URI (port 6543) |
| `SUPABASE_ANON_KEY` | Supabase | Publishable/anon key |
| `SERVER_AUTH_SECRET` | `openssl rand -hex 24` | Same value used on API + frontend |
| `AMPLIFY_ACCESS_TOKEN` | GitHub PAT (repo scope) | Lets Amplify connect the repo |
| `ANTHROPIC_API_KEY` | Anthropic _(optional)_ | Empty → heuristic fallback |
| `SSH_PUBLIC_KEY` | your key _(optional)_ | Empty → SSH disabled, use SSM |
| `ALLOWED_SSH_CIDR` | your IP/32 _(optional)_ | Empty → no port 22 |

Non-secret, region-specific values (domain, region, instance type, LE email,
`supabase_url`) live in `envs/<region>.tfvars` — edit those in the repo.

### 3. Fill in the primary region

Edit [`envs/us-east-1.tfvars`](terraform/envs/us-east-1.tfvars): set
`letsencrypt_email` and `supabase_url` (and `admin_emails` if used).

---

## Deploy

### Primary region

Push to `main` (or run the **infra** workflow → `apply`, region `us-east-1`).
The **infra** workflow applies Terraform; afterwards Amplify builds the frontend
from its webhook and the EC2 instance self-configures on first boot.

API code changes: push to `main` touching `api/**` → the **deploy-api** workflow
does `git pull + npm install + pm2 restart` on the box via SSM.

### Deploy to another region (the whole point)

1. Create `envs/<region>.tfvars` (copy [`envs/us-west-2.tfvars`](terraform/envs/us-west-2.tfvars)).
   Give it a **distinct** `api_subdomain` and `frontend_subdomain` so it doesn't
   collide with the apex the primary region owns.
2. Run the **infra** workflow (Actions → infra → Run workflow):
   `region = <region>`, `action = apply`.
3. (If deploying API code) run **deploy-api** with the same region.

That's it — same code, new workspace, new region. Everything (EC2, EIP, SG, IAM,
SSM secrets, Amplify app, DNS) is recreated there.

> Different regions can use per-region secrets via GitHub **Environments**
> (name one per region) instead of repo-wide secrets — the `apply` job already
> runs in the `production` environment; point it at `${{ env.REGION }}` if you
> split secrets per region.

---

## Local usage (optional)

```bash
cd infra/terraform
terraform init \
  -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="key=fanfndr/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=$TF_LOCK_TABLE" \
  -backend-config="encrypt=true"
terraform workspace select -or-create us-east-1
export TF_VAR_database_url=... TF_VAR_server_auth_secret=... TF_VAR_supabase_anon_key=... TF_VAR_amplify_access_token=...
terraform plan -var="region=us-east-1" -var-file="envs/us-east-1.tfvars"
```

---

## Notes & caveats

- **Database (Supabase).** Not AWS, so not created here. Create the project, run
  `ingestion` migrations against it, and set `DATABASE_URL` / `supabase_url`. For
  a new region you may create a separate Supabase project (recommended for
  latency) or reuse the primary's.
- **Amplify domain association** can take several minutes to validate ACM. Apply
  doesn't block on it (`wait_for_verification = false`); the site is reachable at
  the Amplify default URL meanwhile.
- **Origin TLS.** certbot runs on first boot and needs `api.<domain>` to resolve
  to the EIP. Terraform creates that record, but DNS propagation can lag boot —
  user-data retries 5×. If it misses, re-run once propagated (or re-apply to
  replace user-data). The app still serves over `:80` until then.
- **SSH is off by default.** Shell access is via SSM Session Manager
  (`aws ssm start-session --target <id>`). Set `SSH_PUBLIC_KEY` + `ALLOWED_SSH_CIDR`
  to open port 22.
- **Importing today's resources.** This creates a *parallel* stack. To bring the
  existing hand-built resources under Terraform instead, `terraform import` them
  into the `us-east-1` workspace before applying (ask if you want an import map).
