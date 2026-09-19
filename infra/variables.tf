variable "subscription_id" {
  description = "Azure subscription to deploy into."
  type        = string
  default     = "8e77e40c-e949-492d-bec8-4c317410a6d5"
}

variable "location" {
  type    = string
  default = "westeurope"
}

variable "postgres_location" {
  description = "Postgres region. Separate from var.location: this subscription is restricted from provisioning Flexible Server in westeurope."
  type        = string
  default     = "northeurope"
}

variable "prefix" {
  description = "Name prefix for all resources."
  type        = string
  default     = "spotbuddy"
}

variable "image_tag" {
  description = "Image tag to deploy."
  type        = string
  default     = ""
}

variable "postgres_admin_username" {
  type    = string
  default = "spotadmin"
}

variable "frontend_hostnames" {
  description = "Custom domains on the frontend app. The first is canonical; all become CORS origins."
  type        = list(string)
  default     = ["spotsteer.eu", "www.spotsteer.eu"]
}

variable "api_hostname" {
  description = "Custom domain on the backend app. Empty falls back to the generated FQDN."
  type        = string
  default     = "api.spotsteer.eu"
}

variable "entsoe_token" {
  description = "ENTSO-E Transparency Platform security token."
  type        = string
  sensitive   = true
}
