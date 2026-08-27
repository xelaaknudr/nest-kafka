# artifact_registry.tf
#
# Docker репозитории в Artifact Registry.
#
# for_each — один блок создаёт репозиторий для каждого сервиса из var.services.
# Добавить новый сервис = добавить строку в список, не копировать блок.
#
# depends_on = [google_project_service.apis] — критически важно для нового проекта.
# Terraform должен сначала включить API, потом создавать ресурсы которые его используют.
# Без этого на чистом проекте получим: Error: API artifactregistry not enabled.

resource "google_artifact_registry_repository" "services" {
  for_each = toset(var.services)

  location      = var.region
  repository_id = each.key
  description   = "Docker images for ${each.key} service"
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}
