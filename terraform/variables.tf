# variables.tf
#
# Все входные переменные проекта.
# Значения задаются в terraform.tfvars (не в git).
# Шаблон — terraform.tfvars.example

# ─── Базовые ───────────────────────────────────────────────────────────────────

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-east4"
}

# ─── Микросервисы ──────────────────────────────────────────────────────────────

variable "services" {
  description = "Список микросервисов. Для каждого создаётся отдельный Artifact Registry репозиторий."
  type        = list(string)
  default     = ["auth", "reservations", "notifications", "payments"]
}

# ─── GKE Кластер ───────────────────────────────────────────────────────────────

variable "cluster_name" {
  description = "Имя GKE кластера"
  type        = string
  default     = "l3v5h-cluster"
}

# ─── GitHub (Workload Identity Federation) ─────────────────────────────────────
#
# WIF позволяет GitHub Actions аутентифицироваться в GCP без JSON ключей.
# Вместо секрета GCP_SA_KEY в GitHub Secrets — короткоживущий OIDC токен.

variable "github_owner" {
  description = "GitHub owner (username или org). Используется для WIF."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name. Используется для WIF."
  type        = string
  default     = "nest-kafka"
}
