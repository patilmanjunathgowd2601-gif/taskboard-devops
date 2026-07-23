# TaskBoard — 3-Tier DevOps Project

A task manager built to learn and demonstrate a real, end-to-end DevOps
pipeline: containerization, orchestration, infrastructure-as-code, CI/CD,
and monitoring, all wired together around a classic 3-tier application.

    [ Browser ]
         |
         v
    [ Presentation tier ]  frontend/   static HTML/CSS/JS served by nginx
         |  reverse-proxies /api/* to...
         v
    [ Application tier ]   backend/    Node.js + Express REST API
         |  reads/writes via Mongoose
         v
    [ Data tier ]          database/   MongoDB

## What's in the repo

| Path                            | Purpose                                                        |
|----------------------------------|-----------------------------------------------------------------|
| frontend/                        | Static UI + nginx reverse-proxy config + Dockerfile              |
| backend/                         | Express API, Mongoose model, Prometheus metrics, Dockerfile      |
| database/                        | Mongo seed script                                                 |
| docker-compose.yml               | Runs all 3 tiers locally                                          |
| docker-compose.monitoring.yml    | Adds Prometheus + Grafana on top of the base stack               |
| monitoring/                      | Prometheus scrape config + Grafana datasource provisioning        |
| k8s/                             | Kubernetes manifests (Deployments, Services)                      |
| terraform/                       | AWS IaC: VPC, EKS cluster, ECR repos, GitHub OIDC federation      |
| .github/workflows/               | ci.yml (test/build) and cd.yml (build, push, deploy to EKS)      |

## Local development

Requires Docker + Docker Compose.

    docker compose up -d --build

- Frontend: http://localhost:8080
- Backend health check: http://localhost:5000/api/health
- Backend metrics (Prometheus format): http://localhost:5000/metrics

Add monitoring on top:

    docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d --build

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

Tear down with docker compose down (add -v to also wipe the Mongo volume).

## Deploying to Kubernetes

The manifests in k8s/ work against any cluster. For local testing this
project was run against kind (Kubernetes-in-Docker):

    kind create cluster --name taskboard
    kubectl create namespace taskboard
    kind load docker-image taskboard-backend:local --name taskboard
    kind load docker-image taskboard-frontend:local --name taskboard
    kubectl apply -f k8s/mongo.yaml -f k8s/backend.yaml -f k8s/frontend.yaml

Mongo uses an emptyDir volume rather than a PersistentVolumeClaim, so data
resets if that pod restarts — a deliberate tradeoff for a demo project
without an EBS CSI driver installed.

## AWS infrastructure (Terraform)

terraform/ provisions a real EKS cluster on AWS:

    cd terraform
    terraform init
    terraform plan
    terraform apply
    aws eks update-kubeconfig --region <region> --name taskboard

This creates a 2-AZ public-subnet VPC, an EKS cluster with one managed node
group, two ECR repositories (immutable tags), and a GitHub OIDC federation
setup so GitHub Actions can deploy without any long-lived AWS credentials
stored in the repo.

**This provisions real, billable AWS resources** (EKS control plane, EC2
nodes, a Load Balancer once the frontend Service is created). Run
terraform destroy when you're done to stop charges.

## CI/CD (GitHub Actions)

- **ci.yml** — on every push: installs dependencies, runs backend tests,
  builds both Docker images to confirm they build cleanly.
- **cd.yml** — on every push to main: assumes an AWS IAM role via GitHub's
  OIDC provider (no stored AWS keys), builds both images tagged with the
  commit SHA, pushes them to ECR, points kubectl at the EKS cluster, applies
  the manifests, and rolls out the new images with kubectl set image and
  kubectl rollout status.

Required repository secrets: AWS_OIDC_ROLE_ARN, ECR_REGISTRY,
AWS_REGION, EKS_CLUSTER_NAME — all consumed by cd.yml, none of them
long-lived AWS credentials.

## Monitoring

docker-compose.monitoring.yml brings up Prometheus (scraping the backend's
/metrics endpoint via prom-client) and Grafana (pre-provisioned with the
Prometheus datasource).

## Things that broke while building this (and what fixed them)

- **MongoDB connection race condition**: the backend crashed on startup
  under both Docker Compose and Kubernetes because it tried to connect to
  Mongo before Mongo was ready. Fixed with a retry loop with exponential
  backoff in backend/src/config/db.js.
- **EKS Access Entries require API or API_AND_CONFIG_MAP auth mode**:
  a fresh EKS cluster defaults to CONFIG_MAP-only, which silently breaks
  the newer Access Entries API used to grant GitHub Actions cluster access.
- **eks:DescribeCluster is a separate permission from cluster access**:
  granting an IAM role access inside the cluster (via an Access Entry)
  doesn't also grant it the plain IAM permission needed to call
  aws eks update-kubeconfig in the first place.
- **Immutable ECR tags don't mix with a :latest tag**: pushing a fresh
  :latest tag on every deploy conflicts with immutable image tags after
  the first push. Fixed by deploying only unique git-SHA tags.
- **A hardcoded http://localhost:5000 in the frontend JS**: worked by
  coincidence in every local/dev environment, but broke as soon as the app
  was accessed from a real browser over the internet, since "localhost"
  there means the visitor's own machine. Fixed by using a relative /api
  path and letting nginx's existing reverse proxy handle it everywhere.

## Security notes

- k8s/mongo.yaml, backend.yaml, frontend.yaml have no secrets in them
  — this project doesn't yet use Kubernetes Secrets for Mongo credentials
  (no auth is enabled on the Mongo container). Add that before using this
  as a template for anything beyond a personal demo.
- The GitHub Actions IAM role is scoped via OIDC sub claim conditions to
  this specific repository and the main branch only.
- ECR repositories use immutable tags and image scanning on push.
