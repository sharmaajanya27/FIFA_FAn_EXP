output "region" {
  description = "Region this stack is deployed in."
  value       = var.region
}

output "api_public_ip" {
  description = "Elastic IP of the API instance (point api.<domain> here / DNS record target)."
  value       = aws_eip.api.public_ip
}

output "api_instance_id" {
  description = "EC2 instance ID (used by the deploy-api workflow via SSM Run Command)."
  value       = aws_instance.api.id
}

output "api_url" {
  description = "Public API base URL."
  value       = "https://${local.api_fqdn}"
}

output "amplify_app_id" {
  description = "Amplify app ID."
  value       = aws_amplify_app.frontend.id
}

output "amplify_default_domain" {
  description = "Amplify-provided default domain (fallback URL, esp. for secondary regions)."
  value       = aws_amplify_app.frontend.default_domain
}

output "frontend_url" {
  description = "Public frontend origin."
  value       = "https://${local.frontend_domain}"
}

output "ssm_prefix" {
  description = "SSM Parameter Store path holding this region's API secrets."
  value       = local.ssm_prefix
}
