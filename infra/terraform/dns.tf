# api.<domain> -> the API's Elastic IP. The frontend's apex/www records are
# managed by Amplify's domain association (see amplify.tf).
resource "aws_route53_record" "api" {
  count   = var.manage_dns ? 1 : 0
  zone_id = data.aws_route53_zone.root[0].zone_id
  name    = local.api_fqdn
  type    = "A"
  ttl     = 300
  records = [aws_eip.api.public_ip]
}
