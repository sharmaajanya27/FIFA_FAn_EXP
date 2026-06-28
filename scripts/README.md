# scripts

Operational helper scripts that distill repeated manual commands.

| Script          | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `deploy-api.sh` | Pull latest `main` on the EC2 host, reinstall, typecheck, restart PM2.  |
| `verify.sh`     | Smoke-test the live deployment (API + frontend-proxy health, TLS expiry). |

The **frontend** deploys automatically via AWS Amplify on push to `main`; these
scripts only cover the EC2-hosted API and post-deploy verification. Each script
documents its environment-variable overrides in its header comment.

```bash
# Deploy the API to EC2, then verify
scripts/deploy-api.sh
scripts/verify.sh
```

> See [`../knowledge-base/DEPLOYMENT.md`](../knowledge-base/DEPLOYMENT.md) for the
> full runbook.
