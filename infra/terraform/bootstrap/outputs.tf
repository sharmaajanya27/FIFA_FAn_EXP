output "state_bucket" {
  description = "S3 bucket for Terraform remote state (use in backend config)."
  value       = aws_s3_bucket.state.id
}

output "ci_role_arn" {
  description = "Set this as the AWS_ROLE_ARN GitHub Actions secret."
  value       = aws_iam_role.ci.arn
}

output "github_oidc_provider_arn" {
  value = aws_iam_openid_connect_provider.github.arn
}
