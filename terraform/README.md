# Terraform — Infrastructure as Code

Управление инфраструктурой GCP проекта `l3v5h-506810`.

## Структура

```
terraform/
  backend.tf       ← Remote state (хранится в GCS, не в git)
  main.tf          ← Provider настройки
  variables.tf     ← Переменные
  outputs.tf       ← Выходные значения
  apis.tf          ← Включение GCP API
  artifact_registry.tf  ← Docker репозитории (Artifact Registry)
  network.tf       ← VPC и Subnet
  iam.tf           ← Service Accounts и IAM права
  gke.tf           ← GKE Кластер и Node Pool
  terraform.tfvars          ← Твои значения (в .gitignore, не в git!)
  terraform.tfvars.example  ← Шаблон — скопируй и заполни
```

## Первый запуск (one-time bootstrap)

> Выполняется один раз при создании нового GCP проекта.
> Этот bucket хранит terraform.tfstate — "память" Terraform о созданных ресурсах.

```bash
# 1. Создать GCS bucket для хранения Terraform state
gcloud storage buckets create gs://l3v5h-506810-terraform-state \
  --project=l3v5h-506810 \
  --location=us-east4 \
  --uniform-bucket-level-access

# 2. Включить версионирование (позволяет откатить state при ошибке)
gcloud storage buckets update gs://l3v5h-506810-terraform-state \
  --versioning
```

## Быстрый старт (для нового разработчика)

```bash
# 1. Скопируй шаблон переменных и заполни своими значениями
cp terraform.tfvars.example terraform.tfvars

# 2. Инициализация (скачает провайдеры, подключится к Remote State)
terraform init

# 3. Посмотреть что будет создано (без применения)
terraform plan

# 4. Применить изменения
terraform apply
```

## Важно

- `terraform.tfvars` — в `.gitignore`. Никогда не коммить реальные значения.
- `terraform.tfstate` — хранится в GCS bucket, локальная копия не нужна.
- Перед `apply` всегда смотри `plan`. Особенно если трогаешь `gke.tf` или `iam.tf`.

## Архитектура сети

```
VPC: l3v5h-506810-vpc
  └── Subnet: gke-subnet (us-east4)
        ├── Ноды (VM):    10.0.0.0/20   — виртуальные машины кластера
        ├── Поды:         10.48.0.0/14  — каждый Pod получает свой IP
        └── Services:     10.52.0.0/20  — Kubernetes ClusterIP сервисы
```

Используется VPC-native кластер (современный стандарт GKE).
Ноды имеют доступ к Google APIs (Artifact Registry, Logging) без публичного IP
через `private_ip_google_access = true`.
