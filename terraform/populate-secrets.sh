#!/bin/bash
# populate-secrets.sh
#
# Заполняет Google Cloud Secret Manager значениями из локальных .env файлов.
# Запускать ПОСЛЕ terraform apply (контейнеры секретов должны существовать).
#
# Использование: bash populate-secrets.sh

set -e
PROJECT="l3v5h-506810"
APPS_DIR="$(dirname "$0")/../apps"

add_secret() {
  local SECRET_NAME=$1
  local VALUE=$2
  if [ -z "$VALUE" ] || [ "$VALUE" = "yiuyiuy" ] || [ "$VALUE" = "yuiyiu" ] || [ "$VALUE" = "yuiy" ]; then
    echo "⚠️  ПРОПУЩЕН $SECRET_NAME — значение пустое или заглушка. Заполни вручную в GCP Console."
    return
  fi
  echo "$VALUE" | gcloud secrets versions add "$SECRET_NAME" \
    --data-file=- \
    --project="$PROJECT" \
    --quiet
  echo "✅ $SECRET_NAME"
}

echo "📦 Читаем значения из .env файлов..."
echo ""

# Auth
AUTH_ENV="$APPS_DIR/auth/.env"
add_secret "l3v5h-auth-mongodb-uri"  "$(grep '^MONGODB_URI=' $AUTH_ENV | cut -d= -f2-)"
add_secret "l3v5h-jwt-secret"        "$(grep '^JWT_SECRET=' $AUTH_ENV | cut -d= -f2-)"

# Reservations
RES_ENV="$APPS_DIR/reservation/.env"
add_secret "l3v5h-reservations-mongodb-uri" "$(grep '^MONGODB_URI=' $RES_ENV | cut -d= -f2-)"

# Payments
PAY_ENV="$APPS_DIR/payments/.env"
add_secret "l3v5h-payments-mongodb-uri" "$(grep '^MONGODB_URI=' $PAY_ENV | cut -d= -f2-)"
add_secret "l3v5h-stripe-secret-key"    "$(grep '^STRIPE_SECRET_KEY=' $PAY_ENV | cut -d= -f2-)"

# Notifications (Google OAuth + SMTP) — пропустятся если заглушки
NOT_ENV="$APPS_DIR/notifications/.env"
add_secret "l3v5h-google-oauth-client-id"     "$(grep '^GOOGLE_OAUTH_CLIENT_ID=' $NOT_ENV | cut -d= -f2-)"
add_secret "l3v5h-google-oauth-client-secret" "$(grep '^GOOGLE_OAUTH_CLIENT_SECRET=' $NOT_ENV | cut -d= -f2-)"
add_secret "l3v5h-google-oauth-refresh-token" "$(grep '^GOOGLE_OAUTH_REFRESH_TOKEN=' $NOT_ENV | cut -d= -f2-)"
add_secret "l3v5h-smtp-user"                  "$(grep '^SMTP_USER=' $NOT_ENV | cut -d= -f2-)"

echo ""
echo "🏁 Готово! Секреты с ⚠️  нужно заполнить вручную:"
echo "   https://console.cloud.google.com/security/secret-manager?project=$PROJECT"
