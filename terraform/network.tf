# network.tf
#
# Изолированная сеть для GKE кластера.
# Не используем default VPC — создаём свою с явными настройками.

# ─── VPC ───────────────────────────────────────────────────────────────────────

resource "google_compute_network" "main" {
  name = "${var.project_id}-vpc"

  # false — не создавать subnet автоматически в каждом регионе мира.
  # Мы сами явно создадим один subnet ниже только там где нужно.
  # Если оставить true — GCP создаст ~20 лишних subnet по всему миру.
  auto_create_subnetworks = false

  # Без включённого Compute API создать VPC невозможно.
  # depends_on гарантирует что API включится раньше чем Terraform попытается
  # создать сеть.
  depends_on = [google_project_service.apis]
}

# ─── Subnet ────────────────────────────────────────────────────────────────────

resource "google_compute_subnetwork" "gke" {
  name    = "gke-subnet"
  region  = var.region
  network = google_compute_network.main.id

  # Диапазон IP адресов для нод кластера (виртуальных машин).
  # /20 = 4094 адреса — для нод более чем достаточно.
  ip_cidr_range = "10.0.0.0/20"

  # Позволяет нодам обращаться к Google API (Artifact Registry, Cloud Logging и т.д.)
  # без выхода в публичный интернет. Это важно если у нод нет внешнего IP.
  private_ip_google_access = true

  # Вторичные диапазоны — обязательны для VPC-native GKE кластера.
  # VPC-native = каждый Pod и Service получают реальный IP из VPC (а не NAT).
  # Это современный стандарт — позволяет напрямую обращаться к подам из VPC.

  secondary_ip_range {
    range_name = "pods"
    # /14 = ~262 000 адресов. Много? Kubernetes выделяет /24 блок на каждую ноду
    # (256 адресов на ноду). При 10 нодах это уже 2560 адресов.
    ip_cidr_range = "10.48.0.0/14"
  }

  secondary_ip_range {
    range_name = "services"
    # /20 = 4094 адресов — для Kubernetes Services (ClusterIP) достаточно.
    ip_cidr_range = "10.52.0.0/20"
  }
}
