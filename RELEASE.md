# Release v0.0.1 - LiuGuang GPU Model Deployment Platform

## Overview

This is the initial release (v0.0.1) of LiuGuang (流光), an internal GPU model deployment platform. The platform enables one-click deployment of AI models onto GPU servers through a web interface.

**Tag**: `v0.0.1`
**Release Date**: 2026-05-09
**Repository**: `git@github.com:quanliu1991/liuguang.git`

## Installation

### Clone the Repository

```bash
git clone git@github.com:quanliu1991/liuguang.git
cd liuguang
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy paramiko jinja2 pydantic
python app.py
```

The backend API will be available at `http://localhost:8000`.

API documentation is available at `http://localhost:8000/docs` (Swagger UI).

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## Prerequisites

| Requirement  | Version     | Notes                          |
| ------------ | ----------- | ------------------------------ |
| Python       | 3.10+       | Backend runtime                |
| Node.js      | 18+         | Frontend build & dev           |
| SSH Access   | -           | Required for target GPU servers|
| das-start CLI| -           | Required on target servers     |
| rsync        | -           | Required on target servers     |

## Configuration

### SSH Credentials

Each GPU server must be registered with valid SSH credentials through the web interface:

- **IP Address**: Server IP or hostname
- **SSH User**: Remote username
- **Auth Method**: Password or SSH key
- **SSH Port**: Default 22 (customizable)

### Database

The application uses SQLite by default. The database file `deploy_platform.db` is created automatically on first run in the `backend/` directory.

### Deployment Template

The `deploy_chat.yaml` template is located at `backend/templates/deploy_chat.yaml.j2`. Modify it if your deployment configuration requirements change.

## Feature Summary

### Server Management
- Add/edit/remove GPU servers
- Auto-detect GPU count via SSH
- Online/offline status monitoring
- GPU memory usage visualization

### Model Registry
- Register models with name, path, GPU requirements, and size
- Models stored in central directory for syncing

### Image Version Management
- Track image versions (e.g., R26C10)
- Select image version during deployment

### Deployment Workflow
1. Select target server
2. Select specific GPUs (0, 1, etc.)
3. Select model from registry
4. Select image version
5. Specify port number
6. Click deploy

### Automated Deployment Pipeline
1. GPU availability validation
2. Port conflict check
3. Model existence check on target
4. Automatic `rsync` if model not present
5. Jinja2 YAML generation
6. YAML upload to target server
7. `das-start start deploy_chat.yaml` execution
8. Deployment status recording

## API Reference

### Servers
- `GET /api/servers` - List all servers
- `POST /api/servers` - Create server
- `GET /api/servers/{id}` - Get server
- `PUT /api/servers/{id}` - Update server
- `DELETE /api/servers/{id}` - Delete server
- `POST /api/servers/auto-setup` - Auto-setup server

### Models
- `GET /api/models` - List all models
- `POST /api/models` - Create model
- `GET /api/models/{id}` - Get model
- `PUT /api/models/{id}` - Update model
- `DELETE /api/models/{id}` - Delete model

### Deployments
- `GET /api/deployments` - List all deployments
- `POST /api/deployments` - Create deployment
- `GET /api/deployments/{id}` - Get deployment
- `DELETE /api/deployments/{id}` - Delete deployment

### Image Versions
- `GET /api/image-versions` - List image versions
- `POST /api/image-versions` - Create image version
- `GET /api/image-versions/{id}` - Get image version
- `PUT /api/image-versions/{id}` - Update image version
- `DELETE /api/image-versions/{id}` - Delete image version

### GPU Status
- `GET /api/gpu-status?server_id={id}` - Get GPU status

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   FastAPI    │────▶│  SQLite DB   │
│ (React+Vite) │     │   Backend    │     │              │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ SSH/Paramiko │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ GPU Servers  │
                    │  + das-start │
                    └──────────────┘
```

## Known Issues & Limitations

1. **No Real-Time Logs**: Deployment logs are not streamed via WebSocket (planned for v0.0.2)
2. **Manual Port Allocation**: Users must manually specify port numbers
3. **No Auto-Restart**: Failed deployments require manual intervention
4. **SQLite Only**: No PostgreSQL support yet (upgrade planned)
5. **No Auth System**: No user authentication or multi-tenant support
6. **No Consul Monitoring**: Consul registration status not visible in UI

## Roadmap (Phase 2)

- [ ] WebSocket real-time deployment log streaming
- [ ] Consul service health monitoring dashboard
- [ ] Automatic port allocation
- [ ] Deployment auto-restart on failure
- [ ] PostgreSQL database support
- [ ] User authentication & permissions
- [ ] Image pre-warming
- [ ] Multi image registry support

## Support

For issues and feature requests, please create an issue in the repository.
