#!/usr/bin/env bash
# ==============================================================================
# Mifrufely Web — GCP Deployment Script
# Deploys Cloud Run + Cloud Tasks Queue + Cloud Scheduler Jobs
#
# Prerequisites:
#   - gcloud CLI authenticated: gcloud auth login
#   - Project selected: gcloud config set project PROJECT_ID
#   - APIs enabled: Cloud Run, Cloud Tasks, Cloud Scheduler
#   - Service account with Cloud Run Invoker role
# ==============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${CLOUD_TASKS_LOCATION:-us-central1}"
SERVICE_NAME="mifrufely-backend"
QUEUE_NAME="mifrufely-tasks"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
SA_NAME="${SERVICE_NAME}-invoker"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# ── 1. Build and Push Docker Image ────────────────────────────────────────────
echo "🔨 Building Docker image..."
docker build -t "${IMAGE}" --target production -f _backEnd/Dockerfile _backEnd/

echo "📤 Pushing to GCR..."
docker push "${IMAGE}"

# ── 2. Create Service Account (if not exists) ────────────────────────────────
echo "👤 Creating service account..."
gcloud iam service-accounts create "${SA_NAME}" \
  --display-name="Cloud Tasks → Cloud Run Invoker" \
  2>/dev/null || echo "  (already exists)"

# ── 3. Deploy Cloud Run Service ───────────────────────────────────────────────
echo "🚀 Deploying Cloud Run service..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars "APP_ENV=production,DEBUG=false,LOG_FORMAT=json" \
  --set-env-vars "GCP_PROJECT_ID=${PROJECT_ID}" \
  --set-env-vars "CLOUD_TASKS_QUEUE=${QUEUE_NAME}" \
  --set-env-vars "CLOUD_TASKS_LOCATION=${REGION}" \
  --set-env-vars "CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL=${SA_EMAIL}" \
  --quiet

# Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format "value(status.url)")

echo "  Service URL: ${SERVICE_URL}"

# Update Cloud Run with its own URL (needed for OIDC audience)
gcloud run services update "${SERVICE_NAME}" \
  --region "${REGION}" \
  --update-env-vars "CLOUD_RUN_SERVICE_URL=${SERVICE_URL}" \
  --quiet

# ── 4. Grant Invoker Permission ───────────────────────────────────────────────
echo "🔐 Granting Cloud Run invoker role..."
gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
  --region "${REGION}" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/run.invoker" \
  --quiet

# ── 5. Create Cloud Tasks Queue ───────────────────────────────────────────────
echo "📋 Creating Cloud Tasks queue..."
gcloud tasks queues create "${QUEUE_NAME}" \
  --location "${REGION}" \
  --max-concurrent-dispatches 5 \
  --max-attempts 5 \
  --min-backoff 10s \
  --max-backoff 300s \
  2>/dev/null || echo "  (already exists)"

# ── 6. Create Cloud Scheduler Jobs ───────────────────────────────────────────
echo "⏰ Creating Cloud Scheduler jobs..."

# Expire lots — daily at 06:00 Lima time
gcloud scheduler jobs create http "expire-lots-daily" \
  --location "${REGION}" \
  --schedule "0 6 * * *" \
  --time-zone "America/Lima" \
  --uri "${SERVICE_URL}/api/v1/tasks/expire-lots" \
  --http-method POST \
  --oidc-service-account-email "${SA_EMAIL}" \
  --oidc-token-audience "${SERVICE_URL}" \
  --attempt-deadline 120s \
  2>/dev/null || gcloud scheduler jobs update http "expire-lots-daily" \
    --location "${REGION}" \
    --schedule "0 6 * * *" \
    --uri "${SERVICE_URL}/api/v1/tasks/expire-lots" \
    --quiet

# Expire coupons — daily at 06:05 Lima time
gcloud scheduler jobs create http "expire-coupons-daily" \
  --location "${REGION}" \
  --schedule "5 6 * * *" \
  --time-zone "America/Lima" \
  --uri "${SERVICE_URL}/api/v1/tasks/expire-coupons" \
  --http-method POST \
  --oidc-service-account-email "${SA_EMAIL}" \
  --oidc-token-audience "${SERVICE_URL}" \
  --attempt-deadline 120s \
  2>/dev/null || gcloud scheduler jobs update http "expire-coupons-daily" \
    --location "${REGION}" \
    --schedule "5 6 * * *" \
    --uri "${SERVICE_URL}/api/v1/tasks/expire-coupons" \
    --quiet

# Expire pending ventas — every 15 minutes
gcloud scheduler jobs create http "expire-pending-ventas" \
  --location "${REGION}" \
  --schedule "*/15 * * * *" \
  --time-zone "America/Lima" \
  --uri "${SERVICE_URL}/api/v1/tasks/expire-pending-ventas" \
  --http-method POST \
  --oidc-service-account-email "${SA_EMAIL}" \
  --oidc-token-audience "${SERVICE_URL}" \
  --attempt-deadline 60s \
  2>/dev/null || gcloud scheduler jobs update http "expire-pending-ventas" \
    --location "${REGION}" \
    --schedule "*/15 * * * *" \
    --uri "${SERVICE_URL}/api/v1/tasks/expire-pending-ventas" \
    --quiet

# Aggregate daily analytics — daily at 06:10 Lima time
gcloud scheduler jobs create http "aggregate-daily-analytics" \
  --location "${REGION}" \
  --schedule "10 6 * * *" \
  --time-zone "America/Lima" \
  --uri "${SERVICE_URL}/api/v1/tasks/aggregate-daily" \
  --http-method POST \
  --oidc-service-account-email "${SA_EMAIL}" \
  --oidc-token-audience "${SERVICE_URL}" \
  --attempt-deadline 120s \
  2>/dev/null || gcloud scheduler jobs update http "aggregate-daily-analytics" \
    --location "${REGION}" \
    --schedule "10 6 * * *" \
    --uri "${SERVICE_URL}/api/v1/tasks/aggregate-daily" \
    --quiet

echo ""
echo "✅ Deployment complete!"
echo "   Cloud Run:       ${SERVICE_URL}"
echo "   Health Check:    ${SERVICE_URL}/api/v1/health"
echo "   Cloud Tasks:     ${QUEUE_NAME} @ ${REGION}"
echo "   Scheduler Jobs:  4 jobs configured"
echo ""
echo "⚠️  Remember to set these secrets via gcloud or the console:"
echo "   DATABASE_URL, SECRET_KEY, REDIS_URL, SMTP_USER, SMTP_PASSWORD,"
echo "   SMTP_FROM, GOOGLE_CLIENT_ID, CLOUDINARY_*, FRONTEND_URL, ALLOWED_ORIGINS"
