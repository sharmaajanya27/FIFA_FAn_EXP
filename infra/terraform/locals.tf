locals {
  # Region-scoped name + SSM prefix so multiple regions coexist in one account.
  name       = "${var.project}-${var.region}"
  api_fqdn   = "${var.api_subdomain}.${var.root_domain}"
  ssm_prefix = "/${var.project}/${var.region}"

  # Canonical frontend origin: explicit override, else derived from the domain
  # and optional subdomain (apex in the primary region, a label in secondaries).
  frontend_domain = coalesce(
    var.frontend_domain != "" ? var.frontend_domain : null,
    var.frontend_subdomain != "" ? "${var.frontend_subdomain}.${var.root_domain}" : null,
    var.root_domain,
  )

  # CORS origins: explicit override, else derive from the domains.
  allowed_origins = length(var.allowed_origins) > 0 ? var.allowed_origins : distinct([
    "https://${local.frontend_domain}",
    "https://www.${var.root_domain}",
  ])

  # The key/value pairs written to SSM and materialized into the EC2 api/.env.
  # Keys MUST match what api/src/config/env.ts reads. Optional keys are omitted
  # when empty (SSM rejects zero-length values; an absent key reads as empty).
  api_env = merge(
    {
      DATABASE_URL       = var.database_url
      SUPABASE_URL       = var.supabase_url
      SERVER_AUTH_SECRET = var.server_auth_secret
      ALLOWED_ORIGINS    = join(",", local.allowed_origins)
    },
    var.admin_emails == "" ? {} : { ADMIN_EMAILS = var.admin_emails },
    var.anthropic_api_key == "" ? {} : { ANTHROPIC_API_KEY = var.anthropic_api_key },
  )
}
