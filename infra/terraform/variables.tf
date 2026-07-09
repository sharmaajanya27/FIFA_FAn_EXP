# ---------------------------------------------------------------------------
# Region / naming
# ---------------------------------------------------------------------------
variable "region" {
  description = "AWS region to deploy this stack into. Drives every regional resource."
  type        = string
}

variable "project" {
  description = "Name prefix for all resources."
  type        = string
  default     = "fanfndr"
}

variable "github_repo_url" {
  description = "HTTPS URL of the source repo (used by Amplify and the EC2 clone)."
  type        = string
  default     = "https://github.com/sharmaajanya27/FIFA_FAn_EXP"
}

variable "deploy_branch" {
  description = "Git branch Amplify builds and the API deploys from."
  type        = string
  default     = "main"
}

# ---------------------------------------------------------------------------
# DNS / domains
# ---------------------------------------------------------------------------
variable "root_domain" {
  description = "Apex domain with a Route 53 hosted zone in this account (e.g. fanfndr.com)."
  type        = string
}

variable "manage_dns" {
  description = "Create the api.<domain> A record in Route 53. Disable if DNS lives elsewhere."
  type        = bool
  default     = true
}

variable "manage_frontend_domain" {
  description = "Attach a custom domain to Amplify. Enable per region; use frontend_subdomain to avoid apex collisions across regions."
  type        = bool
  default     = true
}

variable "frontend_subdomain" {
  description = "Subdomain label for the frontend custom domain. Empty => apex + www (primary region). Non-empty (e.g. 'west') => that single subdomain (secondary regions)."
  type        = string
  default     = ""
}

variable "frontend_domain" {
  description = "Override the canonical frontend origin (canonical/OG/sitemap). Empty => derived from root_domain + frontend_subdomain."
  type        = string
  default     = ""
}

variable "api_subdomain" {
  description = "Subdomain label for the API host. Combined with root_domain -> api.<root_domain>. Use a region-suffixed label (api-west) in secondary regions."
  type        = string
  default     = "api"
}

# ---------------------------------------------------------------------------
# API compute (EC2)
# ---------------------------------------------------------------------------
variable "instance_type" {
  description = "EC2 instance type for the API."
  type        = string
  default     = "t2.micro"
}

variable "root_volume_gb" {
  description = "Root EBS volume size (GiB)."
  type        = number
  default     = 8
}

variable "ssh_public_key" {
  description = "SSH public key for break-glass access. Leave empty to disable SSH entirely (use SSM Session Manager instead)."
  type        = string
  default     = ""
}

variable "allowed_ssh_cidr" {
  description = "Single CIDR allowed to reach port 22. Empty string => no SSH ingress at all (recommended; use SSM Session Manager)."
  type        = string
  default     = ""
}

variable "enable_origin_tls" {
  description = "Have the instance obtain a Let's Encrypt cert for the API host (TLS at origin)."
  type        = bool
  default     = true
}

variable "letsencrypt_email" {
  description = "Contact email for Let's Encrypt registration + expiry notices. Required when enable_origin_tls = true."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# Secrets (never commit real values — supply via TF_VAR_* / GitHub secrets)
# ---------------------------------------------------------------------------
variable "database_url" {
  description = "Supabase Postgres connection string (transaction pooler, port 6543)."
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "Supabase project URL (https://<ref>.supabase.co). Enables request-level JWT auth on the API and Supabase auth on the frontend."
  type        = string
}

variable "supabase_anon_key" {
  description = "Supabase publishable/anon key for the frontend."
  type        = string
  sensitive   = true
}

variable "server_auth_secret" {
  description = "Shared secret for server-to-server (SSG/SSR -> API) calls. Must be identical on API and frontend. Generate with `openssl rand -hex 24`."
  type        = string
  sensitive   = true
}

variable "admin_emails" {
  description = "Comma-separated, lowercased admin emails for the analytics dashboard."
  type        = string
  default     = ""
}

variable "allowed_origins" {
  description = "Override CORS allowed origins. Empty => derived from frontend_domain (+ www of root_domain)."
  type        = list(string)
  default     = []
}

variable "anthropic_api_key" {
  description = "Optional Anthropic key for AI recommendations. Empty => heuristic fallback."
  type        = string
  sensitive   = true
  default     = ""
}

variable "amplify_access_token" {
  description = "GitHub personal access token (repo scope) letting Amplify connect to the repository and register the auto-build webhook."
  type        = string
  sensitive   = true
}
