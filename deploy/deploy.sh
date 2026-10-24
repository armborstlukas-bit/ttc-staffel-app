#!/usr/bin/env bash
# Veröffentlicht die TTC-App: Server-Funktionen (api/) → Cloud Run, Oberfläche (dist/) → Firebase Hosting
# Aufruf (Git Bash): bash deploy/deploy.sh        (nur Oberfläche: bash deploy/deploy.sh --nur-oberflaeche)
set -euo pipefail
cd "$(dirname "$0")/.."
GC="${GCLOUD:-$LOCALAPPDATA/Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd}"
P=ttc-staffel-app; R=europe-west1
if [ "${1:-}" != "--nur-oberflaeche" ]; then
  IMG="$R-docker.pkg.dev/$P/ttc/app-api:$(git rev-parse --short HEAD)-$(date +%s)"
  "$GC" builds submit --project $P --region $R --tag "$IMG" .
  "$GC" run deploy ttc-staffel-app-api --project $P --region $R --image "$IMG" --quiet
fi
npm run build
TOKEN=$("$GC" auth print-access-token) MESSAGE="$(git log -1 --format=%s)" node deploy/hosting-deploy.mjs ttc-staffel-app dist deploy/hosting-app.json $P
echo "Fertig: https://app.ttc-staffel.de"
