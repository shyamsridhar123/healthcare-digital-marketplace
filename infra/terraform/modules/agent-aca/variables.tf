variable "name" {
  description = "Container App name for the domain agent."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group containing the Container Apps environment."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "container_app_environment_id" {
  description = "Existing Azure Container Apps managed environment resource ID."
  type        = string
}

variable "image" {
  description = "Domain agent container image."
  type        = string
}

variable "target_port" {
  description = "Container port exposed by the agent."
  type        = number
  default     = 8080
}

variable "cpu" {
  description = "CPU cores per replica."
  type        = number
  default     = 0.5
}

variable "memory" {
  description = "Memory per replica."
  type        = string
  default     = "1Gi"
}

variable "min_replicas" {
  description = "Minimum replica count."
  type        = number
  default     = 0
}

variable "max_replicas" {
  description = "Maximum replica count."
  type        = number
  default     = 3
}

variable "env" {
  description = "Plain environment variables for the agent container."
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
