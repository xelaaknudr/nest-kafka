# iam.tf
#
# Service Accounts и права доступа.
# Принцип минимальных привилегий: каждый SA получает только то что ему нужно.

# ─── Service Account: ноды GKE ─────────────────────────────────────────────────
#
# Этот SA используют виртуальные машины (ноды) кластера.
# Без него ноды не смогут скачать Docker образы из Artifact Registry.

resource "google_service_account" "gke_nodes" {
  account_id   = "gke-nodes-sa"
  display_name = "GKE Node Pool Service Account"
  description  = "Минимальные права для нод кластера: пулить образы и писать логи."
  depends_on   = [google_project_service.apis]
}

# roles/artifactregistry.reader — право скачивать Docker образы.
# Только чтение — ноды не должны уметь ПУШИТЬ образы.
resource "google_project_iam_member" "gke_nodes_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# roles/logging.logWriter — право отправлять логи в Cloud Logging.
# Без этого логи подов не будут видны в GCP Console.
resource "google_project_iam_member" "gke_nodes_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# roles/monitoring.metricWriter — право отправлять метрики в Cloud Monitoring.
resource "google_project_iam_member" "gke_nodes_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# ─── Service Account: GitHub Actions ───────────────────────────────────────────
#
# Этот SA используется CI/CD пайплайном.
# Права: пушить образы в Artifact Registry + деплоить в GKE.

resource "google_service_account" "github_actions" {
  account_id   = "github-actions-sa"
  display_name = "GitHub Actions CI/CD"
  description  = "Используется GitHub Actions для push образов и деплоя в GKE через WIF."
  depends_on   = [google_project_service.apis]
}

# roles/artifactregistry.writer — право ПУШИТЬ Docker образы.
resource "google_project_iam_member" "github_actions_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# roles/container.developer — право деплоить в GKE (kubectl, helm).
resource "google_project_iam_member" "github_actions_container_developer" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# ─── Workload Identity Federation ──────────────────────────────────────────────
#
# WIF позволяет GitHub Actions аутентифицироваться в GCP без JSON ключей.
# Вместо секрета в GitHub — короткоживущий OIDC токен который GitHub выдаёт
# при каждом запуске workflow. Живёт 5 минут, потом истекает.

# Пул — контейнер для внешних провайдеров идентификации.
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "WIF пул для аутентификации GitHub Actions"
  depends_on                = [google_project_service.apis]
}

# Провайдер — описывает откуда приходят токены (GitHub OIDC).
# attribute_mapping: переводит поля GitHub токена в атрибуты Google.
# attribute_condition: ТОЛЬКО токены из нашего репозитория будут приняты.
#   Если кто-то с другого репозитория попытается авторизоваться — получит отказ.
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository == '${var.github_owner}/${var.github_repo}'"

  oidc {
    # Официальный OIDC endpoint GitHub — Google проверяет токены через него.
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Привязка: разрешаем github-actions-sa использоваться через WIF пул.
# principalSet — это "все запросы из репозитория xelaaknudr/nest-kafka".
resource "google_service_account_iam_member" "github_wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_owner}/${var.github_repo}"
}

# ─── Service Account: External Secrets Operator ────────────────────────────────
#
# ESO (External Secrets Operator) — контроллер в кластере который читает секреты
# из Google Cloud Secret Manager и создаёт из них обычные Kubernetes Secrets.
#
# Схема работы через Workload Identity (без JSON ключей):
#
#   ESO Pod (K8s SA: external-secrets)
#     │  использует Workload Identity
#     ▼
#   GCP SA: eso-sa  (roles/secretmanager.secretAccessor)
#     │
#     ▼
#   Google Cloud Secret Manager
#     └── читает секреты и создаёт K8s Secrets для подов

resource "google_service_account" "eso" {
  account_id   = "eso-sa"
  display_name = "External Secrets Operator"
  description  = "Читает секреты из GSM и создаёт Kubernetes Secrets через ESO."
  depends_on   = [google_project_service.apis]
}

# roles/secretmanager.secretAccessor — право ЧИТАТЬ значения секретов.
# Только чтение. ESO не может создавать или изменять секреты в GSM.
resource "google_project_iam_member" "eso_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.eso.email}"
}

# Workload Identity binding для ESO.
# Разрешаем Kubernetes ServiceAccount "external-secrets" в namespace "external-secrets"
# использоваться от имени GCP SA "eso-sa".
# Формат: serviceAccount:<project>.svc.id.goog[<namespace>/<k8s-sa-name>]
resource "google_service_account_iam_member" "eso_wif_binding" {
  service_account_id = google_service_account.eso.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[external-secrets/external-secrets]"

  # l3v5h-506810.svc.id.goog — это Identity Pool который Google создаёт
  # автоматически при создании GKE кластера с включённым Workload Identity.
  # Без этого depends_on Terraform пытается создать binding до того как
  # кластер существует → ошибка "Identity Pool does not exist".
  depends_on = [google_container_cluster.main]
}
