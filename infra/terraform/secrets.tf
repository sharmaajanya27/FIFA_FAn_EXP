# API secrets live in SSM Parameter Store (SecureString). The instance role reads
# them at boot and writes api/.env. This replaces the hand-maintained .env on the
# box (SECURITY.md M3) and makes a fresh region fully declarative. Empty optional
# values are excluded upstream in locals.api_env (SSM rejects zero-length values).
resource "aws_ssm_parameter" "api_env" {
  # api_env carries sensitive values, so the whole map is sensitive and can't
  # drive for_each directly. Iterate the (non-secret) keys and look values up by
  # key — instance addresses stay `[...KEY...]` and each value keeps its own
  # sensitivity, so secrets are never rendered in the plan.
  for_each = toset(nonsensitive(keys(local.api_env)))

  name  = "${local.ssm_prefix}/${each.key}"
  type  = "SecureString"
  value = local.api_env[each.key]

  tags = {
    Name = "${local.name}-${lower(each.key)}"
  }
}
