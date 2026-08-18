# ==============================================================================
# Mifrufely Web — Script de Despliegue en GCP Cloud Run (PowerShell)
# ==============================================================================

$ErrorActionPreference = "Stop"

# ── Variables de Configuración ────────────────────────────────────────────────
$PROJECT_ID = "mitrufely"
$REGION = "us-central1"
$SERVICE_NAME = "mifrufely-backend"
$QUEUE_NAME = "mifrufely-tasks"
$IMAGE = "$REGION-docker.pkg.dev/$PROJECT_ID/mifrufely-repo/${SERVICE_NAME}:latest"
$SA_NAME = "$SERVICE_NAME-invoker"
$SA_EMAIL = "$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Asegurar que gcloud esté en el PATH
$gcloudPath = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin"
if (Test-Path "$gcloudPath\gcloud.cmd") {
    $env:PATH = "$gcloudPath;$env:PATH"
}

Write-Host "`n🚀 1. Configurando proyecto $PROJECT_ID..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID

Write-Host "`n🔌 2. Habilitando APIs en Google Cloud..." -ForegroundColor Cyan
gcloud services enable `
    run.googleapis.com `
    cloudtasks.googleapis.com `
    cloudscheduler.googleapis.com `
    cloudbuild.googleapis.com `
    iam.googleapis.com `
    containerregistry.googleapis.com `
    --quiet

Write-Host "`n🔨 3. Construyendo y enviando imagen Docker a Artifact Registry..." -ForegroundColor Cyan
docker build -t $IMAGE --target production -f _backEnd/Dockerfile _backEnd/
docker push $IMAGE

Write-Host "`n👤 4. Creando Service Account para Cloud Tasks y Scheduler..." -ForegroundColor Cyan
try {
    gcloud iam service-accounts create $SA_NAME --display-name="Cloud Tasks and Scheduler Invoker"
} catch {
    Write-Host "  (Service Account ya existe)" -ForegroundColor Yellow
}

Write-Host "`n☁️ 5. Desplegando en Cloud Run (Scale to Zero)..." -ForegroundColor Cyan
gcloud run deploy $SERVICE_NAME `
    --image $IMAGE `
    --region $REGION `
    --platform managed `
    --allow-unauthenticated `
    --min-instances 0 `
    --max-instances 3 `
    --memory 512Mi `
    --cpu 1 `
    --timeout 300 `
    --env-vars-file _backEnd/gcp/env.yaml `
    --quiet

$SERVICE_URL = (gcloud run services describe $SERVICE_NAME --region $REGION --format "value(status.url)").Trim()
Write-Host "`n✅ URL del servicio: $SERVICE_URL" -ForegroundColor Green

# Actualizar audience con su propia URL
gcloud run services update $SERVICE_NAME --region $REGION --update-env-vars "CLOUD_RUN_SERVICE_URL=$SERVICE_URL" --quiet

Write-Host "`n🔐 6. Asignando permisos de invocación a la Service Account..." -ForegroundColor Cyan
gcloud run services add-iam-policy-binding $SERVICE_NAME `
    --region $REGION `
    --member "serviceAccount:$SA_EMAIL" `
    --role "roles/run.invoker" `
    --quiet

Write-Host "`n📋 7. Creando Cola en Cloud Tasks ($QUEUE_NAME)..." -ForegroundColor Cyan
try {
    gcloud tasks queues create $QUEUE_NAME `
        --location $REGION `
        --max-concurrent-dispatches 5 `
        --max-attempts 5 `
        --min-backoff 10s `
        --max-backoff 300s
} catch {
    Write-Host "  (Cola ya existe)" -ForegroundColor Yellow
}

Write-Host "`n⏰ 8. Configurando Jobs en Cloud Scheduler..." -ForegroundColor Cyan

# 1. Expirar lotes diario a las 06:00 Lima
try {
    gcloud scheduler jobs create http "expire-lots-daily" `
        --location $REGION `
        --schedule "0 6 * * *" `
        --time-zone "America/Lima" `
        --uri "$SERVICE_URL/api/v1/tasks/expire-lots" `
        --http-method POST `
        --oidc-service-account-email $SA_EMAIL `
        --oidc-token-audience $SERVICE_URL `
        --attempt-deadline 120s
} catch {
    gcloud scheduler jobs update http "expire-lots-daily" `
        --location $REGION `
        --schedule "0 6 * * *" `
        --uri "$SERVICE_URL/api/v1/tasks/expire-lots" `
        --quiet
}

# 2. Expirar cupones diario a las 06:05 Lima
try {
    gcloud scheduler jobs create http "expire-coupons-daily" `
        --location $REGION `
        --schedule "5 6 * * *" `
        --time-zone "America/Lima" `
        --uri "$SERVICE_URL/api/v1/tasks/expire-coupons" `
        --http-method POST `
        --oidc-service-account-email $SA_EMAIL `
        --oidc-token-audience $SERVICE_URL `
        --attempt-deadline 120s
} catch {
    gcloud scheduler jobs update http "expire-coupons-daily" `
        --location $REGION `
        --schedule "5 6 * * *" `
        --uri "$SERVICE_URL/api/v1/tasks/expire-coupons" `
        --quiet
}

# 3. Anular ventas pendientes cada 15 min
try {
    gcloud scheduler jobs create http "expire-pending-ventas" `
        --location $REGION `
        --schedule "*/15 * * * *" `
        --time-zone "America/Lima" `
        --uri "$SERVICE_URL/api/v1/tasks/expire-pending-ventas" `
        --http-method POST `
        --oidc-service-account-email $SA_EMAIL `
        --oidc-token-audience $SERVICE_URL `
        --attempt-deadline 60s
} catch {
    gcloud scheduler jobs update http "expire-pending-ventas" `
        --location $REGION `
        --schedule "*/15 * * * *" `
        --uri "$SERVICE_URL/api/v1/tasks/expire-pending-ventas" `
        --quiet
}

# 4. Analytics diario a las 06:10 Lima
try {
    gcloud scheduler jobs create http "aggregate-daily-analytics" `
        --location $REGION `
        --schedule "10 6 * * *" `
        --time-zone "America/Lima" `
        --uri "$SERVICE_URL/api/v1/tasks/aggregate-daily" `
        --http-method POST `
        --oidc-service-account-email $SA_EMAIL `
        --oidc-token-audience $SERVICE_URL `
        --attempt-deadline 120s
} catch {
    gcloud scheduler jobs update http "aggregate-daily-analytics" `
        --location $REGION `
        --schedule "10 6 * * *" `
        --uri "$SERVICE_URL/api/v1/tasks/aggregate-daily" `
        --quiet
}

Write-Host "`n🎉 ==========================================================" -ForegroundColor Green
Write-Host "DESPLIEGUE EXITOSO EN GOOGLE CLOUD PLATFORM" -ForegroundColor Green
Write-Host "Cloud Run URL: $SERVICE_URL" -ForegroundColor Green
Write-Host "Health Check:  $SERVICE_URL/api/v1/health" -ForegroundColor Green
Write-Host "==========================================================`n" -ForegroundColor Green
