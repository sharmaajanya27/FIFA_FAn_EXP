# EC2 instance role: pulls its secrets from SSM Parameter Store at boot and is
# reachable via SSM (Session Manager + Run Command deploys) with no SSH key.
data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api_instance" {
  name               = "${local.name}-api-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# Read only this region's project parameters, and decrypt them via the default
# SSM-managed KMS key.
data "aws_iam_policy_document" "instance_ssm_read" {
  statement {
    sid    = "ReadProjectParameters"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    # GetParametersByPath authorizes against the path node itself
    # (parameter/<prefix>), while GetParameter(s) authorize against each child
    # (parameter/<prefix>/*). Grant both or the boot-time fetch is denied.
    resources = [
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}",
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/*",
    ]
  }

  statement {
    sid       = "DecryptSecureStrings"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "instance_ssm_read" {
  name   = "ssm-read"
  role   = aws_iam_role.api_instance.id
  policy = data.aws_iam_policy_document.instance_ssm_read.json
}

# Enables Session Manager shell + Run Command (keyless CI deploys).
resource "aws_iam_role_policy_attachment" "instance_ssm_core" {
  role       = aws_iam_role.api_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "api" {
  name = "${local.name}-api"
  role = aws_iam_role.api_instance.name
}
