# API security group: HTTP/HTTPS open to the world (Amplify/CloudFront origin),
# SSH only if an explicit CIDR is provided. With no SSH CIDR, shell access is via
# SSM Session Manager (the instance role below grants it) — nothing on port 22.
resource "aws_security_group" "api" {
  name        = "${local.name}-api"
  description = "FanFndr API: public HTTP/HTTPS, optional restricted SSH"
  vpc_id      = data.aws_vpc.default.id

  dynamic "ingress" {
    for_each = var.allowed_ssh_cidr == "" ? [] : [var.allowed_ssh_cidr]
    content {
      description = "SSH (restricted)"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-api"
  }
}
