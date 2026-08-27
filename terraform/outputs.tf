# outputs.tf
#
# Выходные значения после terraform apply.
# Используются для: документации, скриптов, настройки GitHub Secrets.

# ─── Artifact Registry ─────────────────────────────────────────────────────────

output "artifact_registry_urls" {
  description = "Docker URLs для каждого микросервиса"
  value = {
    for service in var.services :
    service => "${var.region}-docker.pkg.dev/${var.project_id}/${service}"
  }
}

# ─── GKE ───────────────────────────────────────────────────────────────────────

output "gke_cluster_name" {
  description = "Имя GKE кластера — нужен для GitHub Secret GKE_CLUSTER_NAME"
  value       = google_container_cluster.main.name
}

output "gke_cluster_location" {
  description = "Регион кластера — нужен для GitHub Secret GKE_CLUSTER_ZONE"
  value       = google_container_cluster.main.location
}

# ─── IAM / WIF ─────────────────────────────────────────────────────────────────

output "github_actions_sa_email" {
  description = "Email Service Account для GitHub Actions"
  value       = google_service_account.github_actions.email
}

output "workload_identity_provider" {
  description = "WIF provider URL — заменяет GCP_SA_KEY в GitHub Secrets"
  value       = "projects/${var.project_id}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github.workload_identity_pool_provider_id}"
}
