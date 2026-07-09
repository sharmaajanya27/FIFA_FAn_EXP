# Remote state in S3 with native S3 locking (bucket created by ./bootstrap).
#
# Config is PARTIAL on purpose so the same code serves every region. The bucket,
# key, and region are supplied at `init` time. Locking uses S3 conditional
# writes (use_lockfile), so no DynamoDB table is needed (Terraform >= 1.10).
# Each region gets its own Terraform workspace, so state files never collide:
#
#   terraform init \
#     -backend-config="bucket=$TF_STATE_BUCKET" \
#     -backend-config="key=fanfndr/terraform.tfstate" \
#     -backend-config="region=$TF_STATE_REGION" \
#     -backend-config="encrypt=true"
#   terraform workspace select -or-create us-east-1
#
# The S3 backend stores each workspace under env:/<workspace>/<key>.
terraform {
  backend "s3" {
    use_lockfile = true
  }
}
