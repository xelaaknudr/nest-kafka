# backend.tf
#
# Remote Backend — где хранится terraform.tfstate.
#
# GCS bucket создан один раз вручную командой:
#   gcloud storage buckets create gs://l3v5h-506810-terraform-state \
#     --project=l3v5h-506810 \
#     --location=us-east4 \
#     --uniform-bucket-level-access
#
# Versioning включён чтобы можно было восстановить state:
#   gcloud storage buckets update gs://l3v5h-506810-terraform-state \
#     --versioning

terraform {
  backend "gcs" {
    bucket = "l3v5h-506810-terraform-state"
    prefix = "terraform/state"
  }
}
