# Frontend hosting on Amplify (Next.js SSR / WEB_COMPUTE), connected to GitHub so
# pushes to the deploy branch auto-build — same behavior as the console-created
# app today. Build steps come from the repo's amplify.yml (appRoot: frontend).
resource "aws_amplify_app" "frontend" {
  name       = "${local.name}-frontend"
  repository = var.github_repo_url
  # Empty => null (attribute unmanaged) rather than "": the provider validates
  # access_token length (1-255) at plan time, before lifecycle.ignore_changes
  # applies, so an empty string would fail CI where the token secret is unset.
  # null skips that validation and, with the ignore below, leaves the adopted
  # app's GitHub connection untouched. A fresh region passes a real PAT here.
  access_token = var.amplify_access_token != "" ? var.amplify_access_token : null
  platform     = "WEB_COMPUTE"

  environment_variables = {
    BACKEND_URL                   = "https://${local.api_fqdn}"
    SERVER_AUTH_SECRET            = var.server_auth_secret
    NEXT_PUBLIC_SITE_URL          = "https://${local.frontend_domain}"
    NEXT_PUBLIC_SUPABASE_URL      = var.supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY = var.supabase_anon_key
    AMPLIFY_MONOREPO_APP_ROOT     = "frontend"
  }

  # When the primary region adopts an existing, hand-connected app via
  # `terraform import`, two attributes are managed outside this config and must
  # not be disturbed: the GitHub connection token (write-only — re-sending it is
  # unnecessary and risks breaking the auto-build webhook) and the Amplify-created
  # SSR service role. These ignores only affect updates; a fresh region still
  # sets access_token on create.
  lifecycle {
    ignore_changes = [access_token, iam_service_role_arn]
  }
}

resource "aws_amplify_branch" "main" {
  app_id            = aws_amplify_app.frontend.id
  branch_name       = var.deploy_branch
  framework         = "Next.js - SSR"
  stage             = "PRODUCTION"
  enable_auto_build = true
}

# Custom domain. Enable per region. Empty frontend_subdomain => apex + www
# (primary region); a non-empty label => that single subdomain (secondary
# regions), which avoids two regions fighting over the apex. When the zone is in
# Route 53 in this account, Amplify auto-creates the DNS records and manages ACM.
resource "aws_amplify_domain_association" "frontend" {
  count       = var.manage_frontend_domain ? 1 : 0
  app_id      = aws_amplify_app.frontend.id
  domain_name = var.root_domain

  # Don't block apply on ACM validation (can take several minutes).
  wait_for_verification = false

  dynamic "sub_domain" {
    for_each = var.frontend_subdomain == "" ? ["", "www"] : [var.frontend_subdomain]
    content {
      branch_name = aws_amplify_branch.main.branch_name
      prefix      = sub_domain.value
    }
  }
}
