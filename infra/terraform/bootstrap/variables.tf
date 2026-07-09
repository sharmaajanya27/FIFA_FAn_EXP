# Bootstrap inputs. Run ONCE by an administrator with local state.
# Creates the shared remote-state backend + the GitHub OIDC CI role that every
# later `terraform apply` (in CI) relies on.

variable "aws_region" {
  description = "Region to create the state bucket, lock table, and IAM in (global resources, but the S3 bucket lives in one region). Use your primary region."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name prefix used for all resource names."
  type        = string
  default     = "fanfndr"
}

variable "github_repo" {
  description = "GitHub repo allowed to assume the CI role, as owner/name."
  type        = string
  default     = "sharmaajanya27/FIFA_FAn_EXP"
}

variable "state_bucket_name" {
  description = "Globally-unique S3 bucket name for Terraform remote state."
  type        = string
}

variable "lock_table_name" {
  description = "DynamoDB table name for Terraform state locking."
  type        = string
  default     = "fanfndr-tf-lock"
}
