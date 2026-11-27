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
- Docker Compose
- Caddy (public HTTPS and reverse proxy)
- Nginx
- Oracle Cloud

## Project Structure

- `client/` - React frontend, pages, API clients, and UI
- `server/` - Express API, MongoDB access, authentication, and monitoring scheduler
- `docker/caddy/` - Public HTTPS reverse proxy configuration
- `docker/nginx/` - Internal static-site server and API reverse proxy
- `Dockerfile` and `docker-compose.yml` - Production container build and orchestration

## Status

✅ MVP functionality complete; deployment configuration and product polish are now included.

## Features

- User authentication with protected dashboard access
- Single-use, one-hour password reset links delivered by SMTP
- Service registration, editing, pause/resume, removal, and manual checks
- Scheduled health monitoring with concurrency-safe polling
- Dashboard summaries and recent activity views
- Monitoring history and workspace settings pages
- Role-protected admin console for account access, service management, and visitor analytics
- Anonymous, session-based page-view analytics with automatic 90-day event expiry
- In-app service alerts and recovery emails with admin-managed sender identity
- Dockerized deployment configuration using MongoDB Atlas, Nginx, and Caddy-managed HTTPS

## Deploy to an Ubuntu VPS

The production Compose setup builds the frontend and API images on the VPS,
connects the API to MongoDB Atlas, and uses Caddy to obtain and renew HTTPS
certificates automatically. Caddy is the public entry point and forwards
requests through the internal Nginx web container to the API. The API is
private to the Docker network.

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

### Admin access and visitor analytics

Create the intended administrator account through the normal registration flow,
then have a trusted database operator assign its `role` to `admin` in MongoDB
(for example, in MongoDB Atlas Data Explorer). Public registration never grants
privileged roles, because account email ownership is not verified. Once the
first administrator is active, additional admin roles can be granted in the
admin console. Role changes take effect on the next API request.

The admin console is available at `/admin` to active admins. It can review and
suspend user accounts, grant or remove admin roles, inspect all monitored
services, pause or resume monitoring, and remove services with their check
history. Visitor analytics count normalized page views and anonymous browser
sessions only; IP addresses, account identities, and URL query strings are not
stored. Visitor events are automatically deleted after 90 days, and browsers
that send Do Not Track are not counted.

### Service alerts

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and
`SMTP_PASSWORD` in `server/.env`. Active users see an in-app notification and
receive an email at their account address when one of their monitored services
goes offline, followed by another notification/email when it recovers. Alerts
are sent on status transitions rather than on every failed poll to avoid
repeated emails during an ongoing outage. Configure and test the sender name
and from-address in **Administration → Alerts & email**. The sender address
must be authorized by the configured SMTP provider; SMTP credentials remain
server-side and are never shown in the admin UI.

If all service checks fail with a connection error, remember that checks run
from the API container, not the browser. After deploying an update, inspect the
specific network error shown by the service check and test egress from that
container:

```bash
docker compose --env-file server/.env exec api node -e 'fetch("https://YOUR-SERVICE.example/health", { method: "HEAD" }).then((response) => console.log("HTTP", response.status)).catch((error) => { console.error(error.cause?.code || error.message); process.exit(1); })'
```

Replace the example URL with the service URL. If this command cannot connect,
check the VPS outbound firewall/network rules, DNS, service hostname, port, and
whether the target accepts connections from the VPS. The checker also retries
other public IP addresses returned by DNS when a route is unreachable.