# apis.tf
#
# Включение GCP API в проекте.
#
# На новом проекте все API выключены по умолчанию — без них ничего не создать.
# disable_on_destroy = false — намеренно. При `terraform destroy` API не выключаем:
# это предохранитель от случайного разрушения зависимых ресурсов.
#
# API могут активироваться до ~2 минут. Ресурсы которые их используют
# (gke.tf, iam.tf и т.д.) ссылаются на этот модуль через depends_on.

locals {
  required_apis = [
    "container.googleapis.com",            # GKE — Kubernetes кластер
    "artifactregistry.googleapis.com",     # Artifact Registry — Docker образы
    "iam.googleapis.com",                  # IAM — Service Accounts и права
    "iamcredentials.googleapis.com",       # Workload Identity Federation
    "sts.googleapis.com",                  # Security Token Service (нужен для WIF)
    "compute.googleapis.com",              # Compute Engine — ноды GKE, VPC
    "cloudresourcemanager.googleapis.com", # Управление проектом (нужен Terraform)
    "secretmanager.googleapis.com",        # Secret Manager — хранилище секретов для ESO
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.required_apis)

  service            = each.key
  disable_on_destroy = false
}
