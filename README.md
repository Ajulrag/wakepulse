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
- Service registration, editing, pause/resume, removal, and manual checks
- Scheduled health monitoring with concurrency-safe polling
- Dashboard summaries and recent activity views
- Monitoring history and workspace settings pages
- Dockerized deployment configuration with MongoDB and Nginx

## Deployment

1. Copy `server/.env.example` to `server/.env` and fill in MongoDB and JWT values.
2. Create a root `.env` if you want to override the frontend and server host settings.
3. Run:
   - `docker compose up --build`
4. The app is exposed through the Nginx frontend on port 80 and the API on port 5000.

## Notes

The project is now in a deployable MVP state for local/containerized deployment.