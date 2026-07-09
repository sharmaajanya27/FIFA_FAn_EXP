# Remote state in S3 with DynamoDB locking (created by ./bootstrap).
#
# Config is PARTIAL on purpose so the same code serves every region. The bucket,
# key, region, and lock table are supplied at `init` time. Each region gets its
# own Terraform workspace, so state files never collide:
#
#   terraform init \
#     -backend-config="bucket=$TF_STATE_BUCKET" \
#     -backend-config="key=fanfndr/terraform.tfstate" \
#     -backend-config="region=$TF_STATE_REGION" \
#     -backend-config="dynamodb_table=$TF_LOCK_TABLE" \
#     -backend-config="encrypt=true"
#   terraform workspace select -or-create us-east-1
#
# The S3 backend stores each workspace under env:/<workspace>/<key>.
terraform {
  backend "s3" {}
}
