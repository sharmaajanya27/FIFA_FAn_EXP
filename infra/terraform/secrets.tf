# API secrets live in SSM Parameter Store (SecureString). The instance role reads
# them at boot and writes api/.env. This replaces the hand-maintained .env on the
# box (SECURITY.md M3) and makes a fresh region fully declarative. Empty optional
# values are excluded upstream in locals.api_env (SSM rejects zero-length values).
resource "aws_ssm_parameter" "api_env" {
  for_each = local.api_env

  name  = "${local.ssm_prefix}/${each.key}"
  type  = "SecureString"
  value = each.value

  tags = {
    Name = "${local.name}-${lower(each.key)}"
  }
}
