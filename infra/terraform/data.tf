data "aws_caller_identity" "current" {}

# Default VPC + its subnets. The current prod runs in the account's default VPC;
# reusing it keeps the stack portable to any region with zero networking setup.
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Latest Amazon Linux 2023 AMI, resolved per-region from the public SSM alias so
# a new region always boots the right image.
data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

# Root hosted zone (only looked up when managing DNS).
data "aws_route53_zone" "root" {
  count = var.manage_dns ? 1 : 0
  name  = "${var.root_domain}."
}
