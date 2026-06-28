#!/usr/bin/env bash
#
# deploy-api.sh — pull the latest main on the EC2 host and restart the API.
#
# Distills the manual deploy step:
#   ssh <host> 'cd <dir> && git pull origin main && cd api && npm install && pm2 restart fanwatch-api'
#
# The frontend deploys automatically via AWS Amplify on push to main; this
# script only handles the EC2-hosted API (api.tuparea.com).
#
# Override any of these via environment variables:
#   FANWATCH_SSH_KEY    Path to the EC2 private key  (default: ~/Documents/Fanwatch-aws/fanwatch-key.pem)
#   FANWATCH_EC2_HOST   user@host for SSH            (default: ec2-user@98.91.107.103)
#   FANWATCH_REMOTE_DIR Repo dir on the host         (default: FIFA_FAn_EXP)
#   FANWATCH_PM2_NAME   PM2 process name             (default: fanwatch-api)
#   FANWATCH_BRANCH     Git branch to deploy         (default: main)
#
# Usage: scripts/deploy-api.sh
set -euo pipefail

SSH_KEY="${FANWATCH_SSH_KEY:-$HOME/Documents/Fanwatch-aws/fanwatch-key.pem}"
EC2_HOST="${FANWATCH_EC2_HOST:-ec2-user@98.91.107.103}"
REMOTE_DIR="${FANWATCH_REMOTE_DIR:-FIFA_FAn_EXP}"
PM2_NAME="${FANWATCH_PM2_NAME:-fanwatch-api}"
BRANCH="${FANWATCH_BRANCH:-main}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "error: SSH key not found at $SSH_KEY (set FANWATCH_SSH_KEY)" >&2
  exit 1
fi

echo "==> Deploying API to $EC2_HOST ($REMOTE_DIR, branch $BRANCH)"

ssh -o ConnectTimeout=15 -i "$SSH_KEY" "$EC2_HOST" bash -s <<REMOTE
set -euo pipefail
cd "$REMOTE_DIR"
echo "--> git pull origin $BRANCH"
git pull origin "$BRANCH"
cd api
echo "--> npm install"
npm install
echo "--> npm run typecheck"
npm run typecheck
echo "--> pm2 restart $PM2_NAME"
pm2 restart "$PM2_NAME" --update-env
pm2 save
REMOTE

echo "==> Done. Verify with: scripts/verify.sh"
