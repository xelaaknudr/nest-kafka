# gke.tf
#
# GKE кластер и пул нод.
# Паттерн: создаём кластер без нод, сразу удаляем дефолтный пул,
# создаём свой пул с правильными настройками.

# ─── Кластер ───────────────────────────────────────────────────────────────────

resource "google_container_cluster" "main" {
  name = var.cluster_name

  # Regional кластер — control plane в 3 зонах us-east4.
  # Если одна зона упадёт — кластер продолжает работать.
  location = var.region

  # Удаляем дефолтный пул нод который GKE создаёт автоматически.
  # Вместо него ниже создаём свой с правильным SA и autoscaling.
  # initial_node_count = 1 обязателен даже при remove_default_node_pool —
  # это особенность Terraform провайдера для GKE.
  remove_default_node_pool = true
  initial_node_count       = 1

  # Подключаем кластер к нашей VPC и subnet из network.tf
  network    = google_compute_network.main.id
  subnetwork = google_compute_subnetwork.gke.id

  # VPC-native режим — поды получают реальные IP из subnet.
  # Указываем secondary ranges которые мы создали в network.tf.
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Workload Identity на уровне кластера.
  # Позволяет Kubernetes Service Accounts привязываться к GCP Service Accounts.
  # Нужно для безопасного доступа подов к GCP сервисам без ключей.
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # false — позволяет удалить кластер через terraform destroy.
  # В настоящем продакшене ставят true чтобы случайно не снести кластер.
  deletion_protection = false

  depends_on = [
    google_project_service.apis,
    google_compute_subnetwork.gke,
    google_service_account.gke_nodes,
  ]
}

# ─── Node Pool ─────────────────────────────────────────────────────────────────

resource "google_container_node_pool" "main" {
  name    = "main-pool"
  cluster = google_container_cluster.main.id

  # Autoscaling — GKE сам добавляет/убирает ноды в зависимости от нагрузки.
  # min = 1 (всегда есть хотя бы одна нода), max = 3 (не более трёх).
  autoscaling {
    min_node_count = 1
    max_node_count = 2
  }

  node_config {
    # e2-standard-2: 2 vCPU, 8 GB RAM.
    # Хорошо для 4 микросервисов. Достаточно и не дорого.
    machine_type = "e2-standard-2"

    # Привязываем SA из iam.tf — ноды получат права пулить образы и писать логи.
    service_account = google_service_account.gke_nodes.email

    # cloud-platform даёт доступ ко всем GCP API которые разрешены через SA.
    # Конкретные права ограничены ролями в iam.tf, не здесь.
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    # Включаем Workload Identity на уровне нод.
    # GKE_METADATA — ноды используют metadata сервер GKE вместо обычного Compute.
    # Это безопаснее: поды не могут получить credentials ноды напрямую.
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}
