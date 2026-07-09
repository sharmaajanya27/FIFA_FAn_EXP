# Bootstrap (run once)

Creates the shared pieces the CI-driven stack depends on:

- **S3 bucket** for Terraform remote state (versioned + encrypted)
- **DynamoDB table** for state locking
- **GitHub OIDC provider** + **CI IAM role** (`fanfndr-ci`) that GitHub Actions
  assumes — no long-lived AWS keys in GitHub

This runs with **local state** and is a one-time, admin-only step. Everything
else is managed by CI against the remote backend this creates.

## Run

```bash
cd infra/terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars   # set a globally-unique bucket name
terraform init
terraform apply
```

## After apply

Add these to the repo's **GitHub Actions secrets** (Settings → Secrets and
variables → Actions):

| Secret | Value |
|--------|-------|
| `AWS_ROLE_ARN` | `terraform output -raw ci_role_arn` |
| `TF_STATE_BUCKET` | `terraform output -raw state_bucket` |
| `TF_LOCK_TABLE` | `terraform output -raw lock_table` |

Then continue with the main stack — see [`../README.md`](../README.md).

> Keep the local `terraform.tfstate` here safe (or migrate it into the new
> bucket). It only tracks the backend + CI role, which rarely change.
