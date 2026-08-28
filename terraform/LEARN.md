# Полный гид по нашей инфраструктуре (Terraform)

Этот документ написан специально для того, чтобы разжевать **каждую строчку** и каждый логический этап, который мы проделали. Если раньше инфраструктура поднималась руками через консоль Google Cloud, то теперь она полностью описана кодом (Infrastructure as Code).

Давай пройдёмся по всем файлам, которые мы создали, и разберём, зачем нужна каждая их часть.

---

## 1. Где хранится состояние и кто управляет облаком
Terraform — это декларативная система. Мы пишем "я хочу, чтобы был кластер", а Terraform сам вычисляет, как его создать. Но чтобы Terraform знал, что уже создано, ему нужна "память". Эта память называется **State** (состояние).

### Файл: `backend.tf`
В этом файле мы говорим Terraform'у, где хранить его память.

```hcl
terraform {
  backend "gcs" {
    bucket = "l3v5h-506810-terraform-state"
    prefix = "terraform/state"
  }
}
```
* `terraform { ... }` — это базовый блок настроек самого Terraform.
* `backend "gcs"` — означает Google Cloud Storage. Мы не храним память на твоём локальном ноутбуке в файле `terraform.tfstate`. Если ноутбук сломается, мы потеряем контроль над кластером. Мы храним его в надёжной корзине (Bucket) в самом Google Cloud.
* `bucket = "..."` — имя корзины, которую ты создал вручную на самом первом шаге.
* `prefix` — это папка внутри корзины, где будет лежать файл состояния.

### Файл: `main.tf`
Этот файл обычно используют как точку входа. В нашем случае тут описано, **каким провайдером** мы пользуемся. Провайдер — это плагин, который знает, как общаться с API конкретного облака.

```hcl
provider "google" {
  project = var.project_id
  region  = var.region
}
```
* `provider "google"` — подключаем плагин для работы с Google Cloud.
* `project` и `region` — указываем, в каком проекте и регионе по умолчанию создавать ресурсы. Обрати внимание: мы не пишем хардкодом `l3v5h-506810`, мы обращаемся к переменной `var.project_id`.

---

## 2. Переменные
Чтобы наш код был гибким (например, если мы захотим развернуть копию проекта `staging`), мы выносим все изменяемые параметры в переменные.

### Файл: `variables.tf`
Здесь мы **объявляем**, какие переменные вообще существуют. Это как интерфейсы в TypeScript.
```hcl
variable "project_id" {
  description = "ID проекта в Google Cloud"
  type        = string
}

variable "region" {
  description = "Регион для развёртывания (по умолчанию us-east4)"
  type        = string
  default     = "us-east4"
}
```
* `description` — подсказка для людей, зачем нужна переменная.
* `type = string` — строгая типизация (может быть `number`, `list`, `map`).
* `default` — значение, которое будет использовано, если мы явно не передадим другое.

### Файл: `terraform.tfvars`
А здесь мы **задаём значения** этим переменным.
```hcl
project_id   = "l3v5h-506810"
cluster_name = "l3v5h-cluster"
github_owner = "xelaaknudr"
github_repo  = "nest-kafka"
```
> **Почему это отдельный файл?** `variables.tf` попадает в репозиторий Git, чтобы все разработчики видели структуру. А `terraform.tfvars` добавлен в `.gitignore` и живёт только у тебя на компьютере, потому что в нём могут быть секреты или локальные настройки.

---

## 3. Включение API
Google Cloud по умолчанию блокирует все свои сервисы. Пока ты явно не нажмёшь кнопку "Enable API", ты не сможешь создать ни кластер, ни секреты, ни сеть. Мы автоматизировали это нажатие кнопок.

### Файл: `apis.tf`
```hcl
locals {
  required_apis = [
    "container.googleapis.com",       # API для создания Kubernetes (GKE)
    "artifactregistry.googleapis.com",# API для хранения Docker-образов
    "secretmanager.googleapis.com",   # API для хранения секретов
    "iam.googleapis.com",             # API для управления правами (IAM)
    "sts.googleapis.com",             # API для выдачи временных токенов (нужно для WIF)
    "compute.googleapis.com",         # API для работы с сетями и виртуалками
    "cloudresourcemanager.googleapis.com", # Базовое API управления проектом
    "iamcredentials.googleapis.com"   # Тоже для Workload Identity Federation
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.required_apis)
  service            = each.key
  disable_on_destroy = false
}
```
* `locals { ... }` — это блок локальных констант. Мы создали массив строк с именами нужных API.
* `resource "google_project_service" "apis"` — ресурс, который включает API.
* `for_each = toset(local.required_apis)` — это магия Terraform. Вместо того, чтобы писать 8 блоков кода для каждого API, мы запускаем цикл. Terraform сам включит все сервисы из списка.
* `disable_on_destroy = false` — **очень важная строчка**. Если мы решим удалить инфраструктуру (командой `terraform destroy`), Terraform не будет выключать эти API. Если бы он их выключил, мы могли бы потерять данные.

---

## 4. Хранилище Docker-образов
Здесь мы создаём реестры (папки), куда GitHub Actions будет пушить сбилженные образы наших микросервисов.

### Файл: `artifact_registry.tf`
```hcl
locals {
  services = ["auth", "reservations", "notifications", "payments"]
}

resource "google_artifact_registry_repository" "repos" {
  for_each      = toset(local.services)
  location      = var.region
  repository_id = each.key
  description   = "Docker repository for ${each.key} service"
  format        = "DOCKER"
}
```
* Снова используем цикл `for_each`. Terraform создаст 4 независимых хранилища: одно для auth, одно для payments и т.д.
* `format = "DOCKER"` — Artifact Registry поддерживает разные форматы (Maven, npm, apt), но мы явно говорим, что будем хранить Docker-контейнеры.

---

## 5. Сетевая инфраструктура (VPC)
Кластеру Kubernetes нужна сеть для общения серверов (нод) между собой и с внешним миром.

### Файл: `network.tf`
```hcl
resource "google_compute_network" "main" {
  name                    = "${var.project_id}-vpc"
  auto_create_subnetworks = false
}
```
* `google_compute_network` — это виртуальная сеть (VPC).
* `auto_create_subnetworks = false` — по умолчанию GCP создаёт подсети во всех странах (Европа, США, Азия). Нам это не нужно, поэтому мы отключаем автоматику и создаём подсеть только в одном регионе (`us-east4`).

```hcl
resource "google_compute_subnetwork" "gke" {
  name                     = "${var.project_id}-subnet-gke"
  network                  = google_compute_network.main.id
  ip_cidr_range            = "10.0.0.0/20"
  region                   = var.region
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = "10.48.0.0/14"
  }
  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = "10.52.0.0/20"
  }
}
```
* `network = google_compute_network.main.id` — подсеть привязывается к VPC, созданной выше.
* `ip_cidr_range = "10.0.0.0/20"` — основной пул IP-адресов. Эти адреса получат **виртуальные машины** (ноды), на которых крутится кластер.
* `secondary_ip_range` — **Вторичные диапазоны**. Это ключевое требование современного GKE (VPC-native cluster). Контейнерам (подам) и внутренним балансировщикам (сервисам) нужны свои огромные блоки IP-адресов. Мы выделяем их заранее.
* `private_ip_google_access = true` — позволяет серверам без публичного IP-адреса безопасно обращаться к сервисам Google (например, скачивать образы из Artifact Registry).

---

## 6. Кластер GKE (Kubernetes)
Это основа нашего продакшена. Мы создаём сам кластер и группу серверов для него.

### Файл: `gke.tf`
```hcl
resource "google_container_cluster" "main" {
  name     = var.cluster_name
  location = var.region

  network    = google_compute_network.main.name
  subnetwork = google_compute_subnetwork.gke.name

  remove_default_node_pool = true
  initial_node_count       = 1
  deletion_protection      = false

  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
}
```
* `location = var.region` — мы указываем регион (а не конкретную зону). Это делает кластер **Regional**. Мастер-ноды Google дублируются в трёх разных дата-центрах для максимальной отказоустойчивости.
* `remove_default_node_pool = true` — при создании кластера Google делает дефолтную группу серверов, которую неудобно настраивать. Мы сразу её удаляем, чтобы ниже описать свою.
* `ip_allocation_policy` — связывает кластер со вторичными диапазонами IP (которые мы сделали в `network.tf`).
* `workload_identity_config` — включает Workload Identity. Это значит, что GKE создаст специальный `Identity Pool` с именем `l3v5h-506810.svc.id.goog`. Позже это позволит нашим подам (например ESO) безопасно представляться Google Cloud'у без паролей.

```hcl
resource "google_container_node_pool" "main" {
  name       = "main-pool"
  cluster    = google_container_cluster.main.id
  node_count = 1

  node_config {
    machine_type    = "e2-standard-2"
    service_account = google_service_account.gke_nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}
```
* `google_container_node_pool` — это рабочие сервера (ноды), на которых будут запускаться твои NestJS приложения.
* `machine_type = "e2-standard-2"` — сервер с 2 CPU и 8 ГБ RAM.
* `service_account = google_service_account.gke_nodes.email` — мы не даём нодам права "админа". Мы привязываем к ним специально созданный ограниченный аккаунт. О нём речь пойдёт в `iam.tf`.

---

## 7. Управление доступом (IAM и WIF)
Самый большой и самый важный файл с точки зрения безопасности. GCP использует принцип наименьших привилегий (Least Privilege). Для каждой сущности (ноды, GitHub, ESO) мы создаём **Service Account (SA)** и выдаём ему **только те роли**, которые ему нужны.

### Файл: `iam.tf`

#### Часть 7.1: Права для нод кластера (GKE Nodes)
Ноды кластера — это просто виртуальные машины. Им нужно уметь скачивать образы из Artifact Registry и отправлять свои логи/метрики в дашборды Google.
```hcl
resource "google_service_account" "gke_nodes" {
  account_id   = "gke-nodes-sa"
  display_name = "GKE Node Pool Service Account"
}

resource "google_project_iam_member" "gke_nodes_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}
```
* `google_service_account` — создаёт сам аккаунт (почту вида `gke-nodes-sa@...`).
* `google_project_iam_member` — связывает этот аккаунт с конкретной ролью на весь проект.
* `roles/artifactregistry.reader` — **Только чтение**. Ноды могут скачивать контейнеры, но если кто-то взломает ноду, он не сможет удалить или подменить образы в Artifact Registry. Аналогичные блоки кода ниже в файле дают роли `roles/logging.logWriter` и `roles/monitoring.metricWriter`.

#### Часть 7.2: Права для GitHub Actions
GitHub Actions должен собирать код, пушить новые Docker-образы и применять деплой в кластер.
```hcl
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-sa"
}

resource "google_project_iam_member" "github_actions_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "github_actions_container_developer" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}
```
* `roles/artifactregistry.writer` — даёт право **записывать** (пушить) образы.
* `roles/container.developer` — даёт право управлять кластером GKE (чтобы команда `helm upgrade` в пайплайне сработала).

#### Часть 7.3: Workload Identity Federation (WIF) для GitHub
Как GitHub Actions докажет Google, что он имеет право использовать аккаунт `github_actions_sa`?
Раньше для этого скачивали Service Account JSON Key (пароль), который мог утечь. WIF (Workload Identity Federation) позволяет настроить доверие между Google и GitHub.

```hcl
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
}
```
* **Пул** — это "дверь", через которую внешние системы входят в Google Cloud.

```hcl
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == '${var.github_owner}/${var.github_repo}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
```
* **Провайдер** — это "вышибала" на двери. Он говорит: "Я принимаю токены только от официального сервера GitHub (`token.actions.githubusercontent.com`)".
* `attribute_mapping` — переводит поля из сертификата GitHub на язык Google (например, поле `repository` в сертификате GitHub становится `attribute.repository` в Google).
* `attribute_condition` — **Самое важное правило безопасности**. Вышибала пропустит токен **только если** он пришёл из репозитория `xelaaknudr/nest-kafka`. Если кто-то запустит Actions в другом репозитории, Google ответит "Access Denied".

```hcl
resource "google_service_account_iam_member" "github_wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_owner}/${var.github_repo}"
}
```
* **Привязка** — мы разрешаем всем, кто прошёл проверку вышибалы (то есть нашему GitHub Actions), "переодеваться" (impersonate) в сервисный аккаунт `github-actions-sa` и действовать от его имени.

#### Часть 7.4: Права для External Secrets Operator (ESO)
Твоим подам нужны пароли от PostgreSQL и Stripe. Мы используем инструмент ESO, который крутится прямо внутри Kubernetes. Ему нужно ходить в Google Cloud Secret Manager.
```hcl
resource "google_service_account" "eso" {
  account_id   = "eso-sa"
}

resource "google_project_iam_member" "eso_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.eso.email}"
}
```
* Мы создаём аккаунт `eso-sa` и даём ему роль `secretmanager.secretAccessor`. Эта роль позволяет только **читать** секреты, но не менять их.

```hcl
resource "google_service_account_iam_member" "eso_wif_binding" {
  service_account_id = google_service_account.eso.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[external-secrets/external-secrets]"
  depends_on         = [google_container_cluster.main]
}
```
* Это настройка Workload Identity, но уже **для внутреннего использования GKE**. 
* Когда GKE был создан, Google сделал скрытый Identity Pool (`l3v5h-506810.svc.id.goog`). 
* Мы говорим Google Cloud: "Если под внутри кластера работает под именем `external-secrets` в неймспейсе `external-secrets`, позволь ему переодеться в `eso-sa`".
* `depends_on = [google_container_cluster.main]` — **Критический момент**. Так как `svc.id.goog` пул создаётся *только после* завершения создания GKE-кластера, мы приказываем Terraform'у не выполнять эту команду, пока кластер не будет полностью готов. Без этого Terraform упал бы с ошибкой "Identity Pool does not exist".

---

## 8. Менеджер Секретов (Secret Manager)
Последний штрих — создание самих секретов в GCP. 

### Файл: `secrets.tf`
```hcl
locals {
  app_secrets = [
    "${var.project_id}-postgres-password",
    "${var.project_id}-stripe-secret-key",
    # ... и так далее
  ]
}

resource "google_secret_manager_secret" "app_secrets" {
  for_each  = toset(local.app_secrets)
  secret_id = each.key
  
  replication {
    auto {}
  }
}
```
* Мы перечисляем имена секретов в списке `app_secrets` (обрати внимание, что имена формируются динамически: `l3v5h-506810-postgres-password`).
* `google_secret_manager_secret` создаёт "контейнер" для секрета, но **не задаёт его значение**. 
* **Почему так:** Если бы мы хранили пароли в Terraform-коде (или даже в файле `.tfvars`), они бы остались в файле состояния (`terraform.tfstate`), что небезопасно. Terraform отвечает только за создание "ячеек" в сейфе. Наполняли ячейки паролями мы уже вне Terraform'а, с помощью bash-скрипта и ручного ввода в GCP консоли.

---

### Подведение итогов

Каждый файл в папке `terraform/` отвечает за свою изолированную часть инфраструктуры. Благодаря этому коду, мы связали GitHub Actions и GKE напрямую с Google Cloud, не создав **ни одного долгоживущего пароля или JSON ключа**, что соответствует высочайшим стандартам безопасности в индустрии (Zero Trust Security Model). Любой шаг легко прослеживается, и весь пайплайн работает полностью автоматически.
