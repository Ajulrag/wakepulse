# WakePulse

> Keep your services awake.

WakePulse is a service monitoring and keep-alive platform that periodically sends HTTP requests to configured services and tracks their availability, response time, and health.

## Tech Stack

- React
- TypeScript
- Vite
- Node.js
- Express.js
- MongoDB Atlas
- Docker
- Nginx
- Oracle Cloud

## Project Structure

- `client` - React frontend
- `server` - Express backend and scheduler
- `shared` - Shared TypeScript types
- `scripts` - Utility scripts
- `docker` - Deployment configuration

## Status

✅ MVP functionality complete; deployment configuration and product polish are now included.

## Features

- User authentication with protected dashboard access
- Single-use, one-hour password reset links delivered by SMTP
- Service registration, editing, pause/resume, removal, and manual checks
- Scheduled health monitoring with concurrency-safe polling
- Dashboard summaries and recent activity views
- Monitoring history and workspace settings pages
- Dockerized deployment configuration with MongoDB and Nginx

## Deploy to an Ubuntu VPS

The production Compose setup builds the frontend and API images on the VPS,
connects the API to MongoDB Atlas, and uses Caddy to obtain and renew HTTPS
certificates automatically. The API is private to the Docker network.

### Requirements

- An Ubuntu VPS with a public IP address
- A domain or subdomain with an `A` record pointing to the VPS
- A MongoDB Atlas database whose network access allows the VPS public IP
- Inbound TCP ports 22, 80, and 443 allowed by both the VPS firewall and cloud
  firewall/security group

Install Docker Engine and the Compose plugin by following the
[official Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/).
For example, after adding Docker's official apt repository, install
`docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, and
`docker-compose-plugin`.

### Configure and start

```bash
cd /path/to/wakepulse
openssl rand -hex 32
nano server/.env
```

If you uploaded your existing `server/.env`, edit that file; do not replace it
with the example. Otherwise, copy `server/.env.example` to `server/.env` first.
Set `DOMAIN` to your full DuckDNS hostname and `CLIENT_URL` to the same hostname
with `https://`. Ensure `MONGODB_URI` points to a MongoDB Atlas database and
`MONGODB_DB_NAME` is correct. Add the VPS public IP to Atlas Network Access.
Keep the existing `JWT_SECRET` and SMTP credentials if you want to reuse them.
If no JWT secret exists, use the generated value. Keep `server/.env` private
and do not commit it.

Start the app:

```bash
docker compose --env-file server/.env up -d --build
docker compose --env-file server/.env ps
docker compose --env-file server/.env logs -f
```

Once DNS has propagated, visit `https://your-domain`. Caddy needs public access
to ports 80 and 443 to issue and renew the certificate. The API is not
published on a host port; do not open port 5000 in the firewall.

To use UFW, allow SSH before enabling it so you do not lock yourself out:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

To deploy code changes uploaded from your computer, upload/replace the changed
project files and run:

```bash
docker compose --env-file server/.env up -d --build
```

Password-reset email is optional; configure the `SMTP_*` values in
`server/.env` to enable it. Docker Compose reads `server/.env` for API settings
and the Caddy domain; only the non-secret domain is passed to Caddy.
`NODE_ENV` is set to `production` by Compose.