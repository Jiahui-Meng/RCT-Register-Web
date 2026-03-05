# AWS Deploy (EC2 + Nginx + PM2) for SQLite Version

This project uses SQLite, so deploy on **single EC2 instance** with persistent EBS volume.

## 1) Create EC2
- Ubuntu 22.04
- Instance: t3.small (or t3.micro for light testing)
- Security Group inbound:
  - 22 (SSH) from your IP only
  - 80 (HTTP) from 0.0.0.0/0
  - 443 (HTTPS) from 0.0.0.0/0

## 2) Connect server
```bash
ssh -i <your-key>.pem ubuntu@<EC2_PUBLIC_IP>
```

## 3) Install runtime
```bash
chmod +x deploy/aws/setup-server.sh
./deploy/aws/setup-server.sh
```

If you are running this from local machine, copy this script to server and run there.

## 4) Upload / clone project
```bash
sudo mkdir -p /opt/rct-register-web
sudo chown -R $USER:$USER /opt/rct-register-web
cd /opt/rct-register-web
# Option A: git clone
# git clone <your_repo_url> .
# Option B: upload files via scp/rsync
```

## 5) Configure env
Create `/opt/rct-register-web/.env.local`:
```env
ADMIN_PASSWORD_HASH=\$2a\$10\$...
ADMIN_SESSION_SECRET=<long-random-secret>
BOOKING_WINDOW_DAYS=30
APP_TIMEZONE=Asia/Hong_Kong
SQLITE_DB_PATH=/opt/rct-register-web/data/rct.db
```

## 6) Install and build
```bash
cd /opt/rct-register-web
npm ci
npm run build
```

## 7) Start app with PM2
```bash
pm2 start deploy/aws/ecosystem.config.cjs
pm2 save
pm2 startup
```

## 8) Configure Nginx
```bash
sudo cp deploy/aws/nginx-rct.conf /etc/nginx/sites-available/rct-register-web
sudo ln -sf /etc/nginx/sites-available/rct-register-web /etc/nginx/sites-enabled/rct-register-web
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

Now open: `http://<EC2_PUBLIC_IP>`

## 9) Enable HTTPS (recommended)
If domain already points to EC2:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <your-domain>
```

## 10) Update deployment
```bash
cd /opt/rct-register-web
git pull
npm ci
npm run build
pm2 restart rct-register-web
```

## Notes
- SQLite file is persistent at `SQLITE_DB_PATH`.
- Back up DB periodically:
```bash
cp /opt/rct-register-web/data/rct.db /opt/rct-register-web/data/rct-$(date +%F-%H%M).db
```
