# main.tf
#
# Точка входа: версия Terraform и провайдер.
# Backend (где хранится state) — в backend.tf
# Все ресурсы — в отдельных файлах (apis.tf, network.tf, iam.tf, gke.tf, ...)

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
