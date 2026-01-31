# Dockerized Service

Project URl : https://roadmap.sh/projects/dockerized-service-deployment

This project provides a complete infrastructure-as-code solution to deploy a Dockerized Node.js Express application on AWS EC2 using Terraform and Ansible. It demonstrates container-based deployment with Docker, orchestration with Docker Compose, and infrastructure automation.

## Project Overview

The project is designed to:
- Provision AWS infrastructure (VPC, subnets, security groups, EC2 instance) using **Terraform**
- Automate Docker and Docker Compose installation using **Ansible**
- Deploy a containerized Node.js application with environment variables
- Implement multi-stage Docker builds for optimized image sizes
- Include health checks and security best practices (non-root user)
- Support Docker Hub image distribution

## Project Structure

```
Dockerized-Service/
├── .github/
│   └── workflows/
│       └── gitub_actions.yml              # CI/CD pipeline configuration
├── docker-compose.yml                      # Docker Compose service definition
├── terraform/                              # Infrastructure as Code (AWS)
│   ├── main.tf                             # Main Terraform configuration
│   ├── providers.tf                        # Provider configuration
│   ├── variables.tf                        # Variable declarations
│   ├── variables.auto.tfvars               # Variable values (auto-loaded)
│   ├── output.tf                           # Output values
│   ├── network/                            # VPC and networking modules
│   │   ├── main.tf
│   │   └── output.tf
│   └── security/                           # Security groups module
│       ├── main.tf
│       ├── output.tf
│       └── variables.tf
├── ansible/                                # Configuration Management
│   ├── ansible.cfg                         # Ansible configuration
│   ├── inventory                           # Inventory file (target servers)
│   └── playbook.yml                        # Playbook (Docker installation)
├── app/                                    # Node.js Application
│   ├── index.js                            # Express server with authentication
│   ├── package.json                        # Node.js dependencies
│   ├── Dockerfile                          # Multi-stage Docker build
│   ├── .dockerignore                       # Docker build ignore rules
│   ├── .env                                # Environment variables (actual)
│   ├── .env.example                        # Environment variables (template)
│   └── .gitignore                          # Git ignore rules
├── keys/                                   # SSH Keys (for authentication)
│   ├── key                                 # Private key
│   ├── key.private                         # Alternative private key format
│   ├── key.pub                             # Public key
│   └── .gitignore                          # Ensures keys aren't committed
└── README.md                               # This file
```

## Prerequisites

Before you begin, ensure you have the following installed:

- **Terraform** (>= 1.0) - [Install](https://www.terraform.io/downloads)
- **Ansible** (>= 2.9) - [Install](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)
- **Docker** (>= 20.10) - [Install](https://docs.docker.com/get-docker/)
- **Docker Compose** (>= 2.0) - [Install](https://docs.docker.com/compose/install/)
- **AWS CLI** - [Install](https://aws.amazon.com/cli/)
- **SSH** client (pre-installed on Linux/Mac, use WSL or PuTTY on Windows)
- An **AWS account** with appropriate permissions

## Configuration Guide

### 1. AWS Credentials Setup

Configure your AWS credentials before running Terraform:

```bash
aws configure
```

You'll be prompted for:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `eu-west-1`)
- Default output format (e.g., `json`)

Alternatively, set environment variables:

```bash
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_DEFAULT_REGION="eu-west-1"
```

### 2. SSH Keys Configuration

SSH keys are used for secure authentication between your machine and the EC2 instance.

#### Generate New Keys (if needed)

```bash
ssh-keygen -t ed25519 -f keys/key -N ""
```

Or for RSA (older systems):

```bash
ssh-keygen -t rsa -b 4096 -f keys/key -N ""
```

This creates:
- `keys/key` - Private key (keep secure, permissions 600)
- `keys/key.pub` - Public key

#### Set Proper Permissions

```bash
chmod 600 keys/key
chmod 644 keys/key.pub
```

**Security Note**: Never commit private keys to version control. The `.gitignore` file in `keys/` prevents this.

### 3. Environment Variables Configuration

The application uses environment variables for configuration. Docker Compose loads these from a `.env` file.

#### Create .env File

Copy the example and fill in your values:

```bash
cp app/.env.example app/.env
```

Edit `app/.env`:

```env
SECRET_MESSAGE="THIS IS A VERY SECRET MESSAGE"
USERNAME="ADMIN"
PASSWORD="ADMIN"
```

**Variables Explained:**
- `SECRET_MESSAGE` - Custom message for the application (optional)
- `USERNAME` - Basic auth username for API authentication
- `PASSWORD` - Basic auth password for API authentication

**Security Note**: Never commit `.env` to Git. Use `.env.example` as a template for new deployments.

### 4. Docker Configuration

#### Understanding the Dockerfile

The [Dockerfile](app/Dockerfile) uses a multi-stage build pattern:

**Stage 1: Builder**
- Uses `node:20-alpine` base image
- Installs production dependencies only
- Cleans npm cache to reduce layer size

**Stage 2: Production**
- Fresh `node:20-alpine` image
- Creates non-root user (nodejs) for security
- Copies application from builder stage
- Includes health check endpoint
- Exposes port 80 (mapped to 3000 internally)

**Key Security Features:**
```dockerfile
# Non-root user (runs with UID 1001)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:80', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
```

#### Docker Compose Configuration

The [docker-compose.yml](docker-compose.yml) defines the web service:

```yaml
services:
  web:
    image: abdelhak245/dockerized-service:latest
    environment:
      - SECRET_MESSAGE=${SECRET_MESSAGE}
      - USERNAME=${USERNAME}
      - PASSWORD=${PASSWORD}
    ports:
      - "80:3000"
```

**Configuration Details:**
- `image` - Pre-built Docker Hub image (can be built locally with `docker build`)
- `environment` - Loads variables from `.env` file
- `ports` - Maps host port 80 to container port 3000

### 5. Terraform Configuration

#### Step 1: Define Variables

Edit [terraform/variables.auto.tfvars](terraform/variables.auto.tfvars):

```hcl
ami           = "ami-04df1508c6be5879e"  # Ubuntu 22.04 LTS in eu-west-1
instance_type = "t3.micro"               # Free tier eligible
```

**Common Ubuntu AMIs:**
- **eu-west-1 (Ireland)**: `ami-04df1508c6be5879e` (Ubuntu 22.04 LTS)
- **us-east-1 (N. Virginia)**: `ami-0c55b159cbfafe1f0` (Ubuntu 22.04 LTS)
- Find your region's AMI: https://cloud-images.ubuntu.com/locator/ec2/

**Instance Types:**
- `t3.micro` - Free tier, suitable for testing
- `t3.small` - ~$0.023/hour, more resources
- `t2.micro` - Previous generation free tier option

#### Step 2: Initialize and Plan

```bash
cd terraform

# Initialize Terraform (downloads providers and modules)
terraform init

# Validate configuration
terraform validate

# Preview changes
terraform plan
```

#### Step 3: Apply Configuration

```bash
# Create AWS resources
terraform apply

# Review and confirm by typing 'yes'
```

After successful deployment, Terraform outputs the EC2 instance IP address.

#### Step 4: Destroy Resources (when done)

```bash
terraform destroy

# Confirm by typing 'yes'
```

### 6. Ansible Configuration

Ansible automates Docker installation and configuration on the EC2 instance.

#### Update Inventory

Edit [ansible/inventory](ansible/inventory) with your EC2 instance IP:

```ini
[server]
<YOUR_EC2_IP> ansible_user=ubuntu ansible_ssh_private_key_file=../keys/key
```

Example:
```ini
[server]
15.236.204.147 ansible_user=ubuntu ansible_ssh_private_key_file=../keys/key
```

**Key Parameters:**
- `ansible_user` - SSH user for EC2 (typically `ubuntu` or `ec2-user`)
- `ansible_ssh_private_key_file` - Path to your private SSH key

#### Configure Ansible

Review [ansible/ansible.cfg](ansible/ansible.cfg):

```ini
[defaults]
inventory = ./inventory  # Points to inventory file
```

#### Review Playbook

The [ansible/playbook.yml](ansible/playbook.yml) performs:
1. Install Docker dependencies (apt-transport-https, ca-certificates, etc.)
2. Add Docker signing key
3. Configure Docker repository for your distribution
4. Install Docker CE, Docker CLI, containerd, and Docker Compose
5. Start and enable Docker service
6. Create docker group and add user to it

#### Run Playbook

```bash
cd ansible

# Test connectivity (optional)
ansible all -i inventory -m ping

# Run the playbook
ansible-playbook playbook.yml

# Run with verbose output for debugging
ansible-playbook -v playbook.yml
```

After successful execution, Docker and Docker Compose will be installed on the EC2 instance.

## Node.js Application

The application is an Express.js server with basic authentication:

**File:** [app/index.js](app/index.js)

```javascript
const express = require('express')
const app = express()
const port = process.env.PORT || 3000

app.get('/', (req, res) => {
    res.send('Hello, world!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
```

**Features:**
- Basic HTTP authentication
- Environment variable configuration
- Port configurable via PORT env var (defaults to 3000)
- Logs credentials and messages to console on startup

**Dependencies** ([app/package.json](app/package.json)):
- `express` ^5.2.1 - Web framework
- `dotenv` ^17.2.3 - Environment variable loading

### Authentication

The application implements HTTP Basic Authentication:

```javascript
function authentication(req, res, next) {
    const authheader = req.headers.authorization;
    if (!authheader) {
        return res.status(401).send('Authentication required')
    }
    // Verify username and password from Authorization header
}
```

**Default Credentials** (from `.env.example`):
- Username: `ADMIN`
- Password: `ADMIN`

To access the API with curl:

```bash
curl -u ADMIN:ADMIN http://<YOUR_EC2_IP>:80/
```

### Modify the Application

To customize:

1. Edit [app/index.js](app/index.js) with your Express routes
2. Update dependencies in [app/package.json](app/package.json)
3. Update [app/Dockerfile](app/Dockerfile) if needed
4. Rebuild the Docker image:
   ```bash
   docker build -t your-registry/app:latest app/
   ```
5. Push to Docker Hub:
   ```bash
   docker push your-registry/app:latest
   ```

## Deployment Workflow

### Full Deployment (First Time)

```bash
# 1. Configure AWS credentials
aws configure

# 2. Set up SSH keys
ssh-keygen -t ed25519 -f keys/key -N ""
chmod 600 keys/key

# 3. Configure environment variables
cp app/.env.example app/.env
# Edit app/.env with your values

# 4. Deploy infrastructure with Terraform
cd terraform
terraform init
terraform plan
terraform apply

# Note the EC2 instance IP from Terraform output

# 5. Update Ansible inventory
cd ../ansible
# Edit inventory file with EC2 IP

# 6. Run Ansible playbook to install Docker
ansible-playbook playbook.yml

# 7. SSH into instance and deploy application
ssh -i ../keys/key ubuntu@<YOUR_EC2_IP>

# On the instance:
cd /home/ubuntu
docker-compose pull
docker-compose up -d

# 8. Verify deployment
# Access http://<YOUR_EC2_IP> in a browser
# Or with curl:
curl -u ADMIN:ADMIN http://<YOUR_EC2_IP>/
```

### Deploy Using Docker Compose

After Ansible completes, SSH into the instance:

```bash
ssh -i keys/key ubuntu@<YOUR_EC2_IP>

# On the instance, create docker-compose.yml and .env, then run:
docker-compose pull
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Update Application

```bash
# 1. Update code locally
# 2. Build and push new Docker image
docker build -t your-registry/app:latest app/
docker push your-registry/app:latest

# 3. On the EC2 instance, pull and restart
ssh -i keys/key ubuntu@<YOUR_EC2_IP>
docker-compose pull
docker-compose down
docker-compose up -d

# Or restart running container:
docker-compose restart web
```

### Local Docker Development

Test the application locally before deploying:

```bash
# Build image
docker build -t app:latest app/

# Run with environment variables
docker run -p 8080:3000 \
  -e USERNAME=admin \
  -e PASSWORD=secret \
  -e SECRET_MESSAGE="Local test" \
  app:latest

# Or use Docker Compose
docker-compose up
```

### View Container Logs

```bash
# Live logs
docker-compose logs -f web

# Last 50 lines
docker-compose logs --tail=50 web

# Check health
docker-compose ps
```

### Destroy Infrastructure

```bash
cd terraform
terraform destroy
```

## Docker Best Practices Implemented

✅ **Multi-stage builds** - Reduces final image size by using builder pattern

✅ **Non-root user** - Application runs as `nodejs` user (UID 1001) for security

✅ **Alpine base image** - Small footprint (`node:20-alpine`)

✅ **Health checks** - Container monitors application health automatically

✅ **Environment variables** - Sensitive data kept out of image

✅ **Layer caching** - Dependencies installed separately from code

✅ **Production-only dependencies** - Uses `npm ci --only=production`

## GitHub Actions CI/CD

The project includes a GitHub Actions workflow for automated deployment.

**File:** [.github/workflows/gitub_actions.yml](.github/workflows/gitub_actions.yml)

Configure secrets in GitHub:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `TF_VAR_ami`
- `TF_VAR_instance_type`
- `DOCKER_USERNAME` (Docker Hub)
- `DOCKER_PASSWORD` (Docker Hub)

## Troubleshooting

### Docker Connection Issues

```bash
# Check Docker status
sudo systemctl status docker

# Check if user is in docker group
groups $USER

# Add user to docker group (requires logout/login)
sudo usermod -aG docker $USER

# Start Docker
sudo systemctl start docker
```

### SSH Connection Issues

```bash
# Test SSH connectivity
ssh -i keys/key ubuntu@<YOUR_EC2_IP>

# Debug SSH connection
ssh -vvv -i keys/key ubuntu@<YOUR_EC2_IP>
```

### Ansible Failures

```bash
cd ansible

# Test Ansible connectivity
ansible all -i inventory -m ping

# Run with debug output
ansible-playbook -vvv playbook.yml

# Check specific host
ansible -i inventory server -m setup
```

### Docker Compose Issues

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Reset (remove containers)
docker-compose down
docker-compose up -d
```

### Application Not Responding

```bash
# SSH into instance
ssh -i keys/key ubuntu@<YOUR_EC2_IP>

# Check container health
docker ps

# View application logs
docker-compose logs app

# Test locally
curl -u ADMIN:ADMIN http://localhost/

# Restart container
docker-compose restart web
```

### Port Conflicts

If port 80 is already in use:

```yaml
# Edit docker-compose.yml
ports:
  - "8080:3000"  # Use 8080 instead
```

Then access via `http://<YOUR_EC2_IP>:8080`

## Security Best Practices

1. **SSH Keys**:
   - Keep private keys secure (never commit to Git)
   - Use strong passphrases if not using ed25519
   - Rotate keys periodically

2. **Environment Variables**:
   - Keep `.env` out of Git (use `.env.example` as template)
   - Store sensitive values in GitHub Secrets for CI/CD
   - Use strong passwords in production

3. **Docker**:
   - Run as non-root user (implemented)
   - Include health checks (implemented)
   - Use specific base image versions (not `latest`)
   - Scan images for vulnerabilities

4. **AWS**:
   - Use IAM users instead of root account
   - Rotate access keys regularly
   - Restrict security group rules to necessary ports

5. **Application**:
   - Keep dependencies updated
   - Implement input validation
   - Use HTTPS in production (add nginx proxy)
   - Implement rate limiting for authentication endpoints

## Additional Resources

- [Terraform AWS Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Ansible Documentation](https://docs.ansible.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Express.js Guide](https://expressjs.com/)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## License

See LICENSE file for details.

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review log files (Terraform, Ansible, Docker)
3. Consult the Additional Resources section
4. Open an issue on GitHub
