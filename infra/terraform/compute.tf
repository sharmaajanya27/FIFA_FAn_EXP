# Optional break-glass SSH key. When ssh_public_key is empty, no key pair is
# created and access is SSM-only.
resource "aws_key_pair" "api" {
  count      = var.ssh_public_key == "" ? 0 : 1
  key_name   = "${local.name}-key"
  public_key = var.ssh_public_key
}

locals {
  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    region            = var.region
    ssm_prefix        = local.ssm_prefix
    repo_url          = var.github_repo_url
    branch            = var.deploy_branch
    api_fqdn          = local.api_fqdn
    pm2_app_name      = "fanfndr-api"
    letsencrypt_email = var.letsencrypt_email
    enable_tls        = var.enable_origin_tls
  })
}

resource "aws_instance" "api" {
  ami                    = data.aws_ssm_parameter.al2023_ami.value
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.api.id]
  iam_instance_profile   = aws_iam_instance_profile.api.name
  key_name               = var.ssh_public_key == "" ? null : aws_key_pair.api[0].key_name

  user_data                   = local.user_data
  user_data_replace_on_change = true

  root_block_device {
    volume_size = var.root_volume_gb
    volume_type = "gp3"
    encrypted   = true
  }

  # IMDSv2 only.
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name = "${local.name}-api"
  }

  # This box is long-lived and the API deploys out-of-band (a GitHub Action does
  # git-pull + pm2 restart, matching on the Name tag), so first-boot inputs must
  # not trigger unattended rebuilds once `main` auto-applies:
  #   - user_data: lets us edit the provisioning template (e.g. letsencrypt_email)
  #     without destroying the running instance.
  #   - ami: the "latest AL2023" alias floats as AWS republishes it (~monthly);
  #     ignoring it keeps AWS's cadence from replacing prod behind our backs.
  # Roll a new box deliberately with `terraform apply -replace=aws_instance.api`.
  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

# Stable public address for the API DNS record.
resource "aws_eip" "api" {
  domain   = "vpc"
  instance = aws_instance.api.id

  tags = {
    Name = "${local.name}-api"
  }
}
