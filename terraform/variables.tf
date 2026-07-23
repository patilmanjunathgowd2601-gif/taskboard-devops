variable "aws_region" {
  default = "ap-south-1"
}

variable "project_name" {
  default = "taskboard"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  default = ["ap-south-1a", "ap-south-1b"]
}
