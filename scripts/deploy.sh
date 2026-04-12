#!/usr/bin/env bash
# Deploy both frontend and backend from repo root.
# Usage: bash scripts/deploy.sh [frontend|backend|all]
set -euo pipefail

PROJECT_ID="sustainmetric"
REGION="asia-south1"
BACKEND_SERVICE="sustainmetric-api"
API_URL="https://sustainmetric-api-446198217624.asia-south1.run.app"

deploy_frontend() {
    echo "=== Building Next.js static export ==="
    cd apps/web
    npm run build
    cd ../..

    echo "=== Deploying to Firebase Hosting ==="
    firebase deploy --only hosting --project "$PROJECT_ID"
    echo "=== Frontend live at https://sustainmetric.web.app ==="
}

deploy_backend() {
    echo "=== Deploying FastAPI to Cloud Run ($REGION) ==="
    cd apps/api
    gcloud run deploy "$BACKEND_SERVICE" \
        --source=. \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --allow-unauthenticated \
        --memory=512Mi \
        --cpu=1 \
        --max-instances=2 \
        --min-instances=0
    cd ../..
    echo "=== Backend live at $API_URL ==="
}

case "${1:-all}" in
    frontend) deploy_frontend ;;
    backend)  deploy_backend ;;
    all)
        deploy_backend
        deploy_frontend
        ;;
    *)
        echo "Usage: $0 [frontend|backend|all]"
        exit 1
        ;;
esac
