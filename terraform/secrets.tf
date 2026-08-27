# secrets.tf
#
# Структура секретов в Google Cloud Secret Manager.
#
# Terraform создаёт "контейнер" для каждого секрета.
# Значения вносятся вручную в GCP Console (или через gcloud) — они не хранятся
# в коде и не попадают в git. Это правильно: код описывает СТРУКТУРУ,
# не сами чувствительные данные.
#
# После terraform apply — зайди в GCP Console → Secret Manager и
# добавь значение для каждого секрета через кнопку "Add version".

locals {
  # Список всех секретов которые нужны микросервисам.
  # Ключи в GSM совпадают с тем что указано в k8s/l3v5h/templates/*/secret.yaml
  app_secrets = [
    "l3v5h-auth-mongodb-uri",
    "l3v5h-jwt-secret",
    "l3v5h-google-oauth-client-id",
    "l3v5h-google-oauth-client-secret",
    "l3v5h-google-oauth-refresh-token",
    "l3v5h-reservations-mongodb-uri",
    "l3v5h-payments-mongodb-uri",
    "l3v5h-stripe-secret-key",
    "l3v5h-smtp-user",
  ]
}

resource "google_secret_manager_secret" "app_secrets" {
  for_each = toset(local.app_secrets)

  secret_id = each.key

  # Автоматическая репликация — GCP сам выбирает где хранить.
  # Альтернатива: user_managed с явным списком регионов.
  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

# Outputs чтобы видеть какие секреты созданы после apply
output "gsm_secrets" {
  description = "Секреты созданы в GSM. Заполни значения вручную в GCP Console."
  value       = [for s in google_secret_manager_secret.app_secrets : s.secret_id]
}
