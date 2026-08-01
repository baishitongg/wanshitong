# Production Deployment

This project deploys to a DigitalOcean Droplet with Docker Compose. GitHub Actions
acts as the webhook: every push to `main` runs CI, SSHes into the server, pulls the
latest code, runs Prisma migrations, and restarts the app containers.

## 1. Server Bootstrap

Run these commands once on the Droplet:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker

sudo mkdir -p /var/www
sudo chown -R "$USER:$USER" /var/www
git clone https://github.com/baishitongg/wanshitong.git /var/www/wanshitong
cd /var/www/wanshitong
cp .env.production.example .env.production
nano .env.production
```

Fill `.env.production` with the real Neon, Supabase, Auth, and site values.

## 2. First Manual Deploy

```bash
cd /var/www/wanshitong
bash scripts/deploy.sh
```

The app will listen on `127.0.0.1:3000`; Nginx should be the public entry point.

## 3. Nginx

Copy the sample config and reload Nginx:

```bash
sudo cp deploy/nginx/wanshitong.conf /etc/nginx/sites-available/wanshitong
sudo ln -s /etc/nginx/sites-available/wanshitong /etc/nginx/sites-enabled/wanshitong
sudo nginx -t
sudo systemctl reload nginx
```

For SSL, use Certbot. For many partner subdomains, a wildcard certificate is best:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d klyihao.com -d www.klyihao.com
```

Wildcard certificates such as `*.klyihao.com` need a DNS challenge. If the domain
DNS is in DigitalOcean, use a DigitalOcean DNS Certbot plugin or create individual
certificates for each subdomain.

## 4. GitHub Secrets

Add these in GitHub:

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Required server secrets:

```text
DO_HOST=your-droplet-ip
DO_USER=your-ssh-user
DO_SSH_PRIVATE_KEY=private-key-that-can-ssh-into-the-droplet
DO_APP_DIR=/var/www/wanshitong
```

Required app secrets for CI build:

```text
AUTH_SECRET
NEXTAUTH_SECRET
DATABASE_URL
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Optional:

```text
REDIS_URL
NEXT_PUBLIC_SUPPORT_WHATSAPP
NEXT_PUBLIC_SUPPORT_TELEGRAM
```

## 5. CI/CD Flow

After setup:

```bash
git push origin main
```

GitHub Actions will:

1. Install dependencies.
2. Generate Prisma client.
3. Run lint.
4. Build the app.
5. SSH into the Droplet.
6. Pull latest `main`.
7. Build the Docker image.
8. Run `prisma migrate deploy`.
9. Restart the app and Redis containers.

## Useful Server Commands

```bash
cd /var/www/wanshitong
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f app
bash scripts/deploy.sh
```
