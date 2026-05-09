# LiuGuang - GPU Model Deployment Platform

> Turn model deployment from 30 minutes to 30 seconds.

LiuGuang (流光) is an internal web platform for one-click deployment of AI models onto GPU servers. It simplifies the entire workflow: pick a server, select GPUs, choose a model and image version, and let the platform handle model syncing, YAML generation, and deployment execution.

## Features

- **Server Management**: Add, edit, and remove GPU servers with SSH connectivity
- **GPU Status Monitoring**: Real-time GPU memory usage visualization via `nvidia-smi`
- **Model Registry**: Register models with path, GPU requirements, and size metadata
- **One-Click Deployment**: Form-based deployment with GPU selection and automatic validation
- **Automatic YAML Generation**: Jinja2 template renders `deploy_chat.yaml` automatically
- **Model Syncing**: Automatic `rsync` model transfer to target servers
- **Image Version Management**: Track and select deployment image versions

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React, Vite, Ant Design, TypeScript |
| Backend    | FastAPI, SQLAlchemy, Jinja2         |
| Database   | SQLite                              |
| SSH        | Paramiko                            |
| Deployment | `das-start start deploy_chat.yaml`  |

## Project Structure

```
├── backend/
│   ├── app.py              # FastAPI application entry point
│   ├── api/                # API routes (server, model, deploy, image)
│   ├── services/           # Business logic (SSH, deploy, GPU, YAML)
│   ├── database/           # SQLAlchemy models & DB setup
│   └── templates/          # Jinja2 deploy template
├── frontend/
│   ├── src/
│   │   ├── pages/          # Deploy, Server, Model, Status pages
│   │   ├── components/     # Layout, Header, Sidebar, Logo
│   │   └── App.tsx         # App root & routing
│   └── package.json
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- SSH access to target GPU servers

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy paramiko jinja2 pydantic
python app.py
```

Backend runs on `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Usage

1. **Add Servers**: Register GPU servers with SSH credentials
2. **Add Models**: Register model paths with GPU requirements
3. **Add Image Versions**: Register deployment image versions
4. **Deploy**: Select server, GPUs, model, image version, and port → click deploy

The platform will:

1. Validate GPU availability and port conflicts
2. Check if model exists on target server
3. Sync model via `rsync` if needed
4. Generate `deploy_chat.yaml` from template
5. Upload YAML and execute `das-start start deploy_chat.yaml`
6. Record deployment status in database

## API Endpoints

| Method | Path                         | Description              |
| ------ | ---------------------------- | ------------------------ |
| GET    | `/api/servers`               | List all servers         |
| POST   | `/api/servers`               | Create server            |
| GET    | `/api/servers/{id}`          | Get server details       |
| PUT    | `/api/servers/{id}`          | Update server            |
| DELETE | `/api/servers/{id}`          | Delete server            |
| GET    | `/api/models`                | List all models          |
| POST   | `/api/models`                | Create model             |
| GET    | `/api/deployments`           | List all deployments     |
| POST   | `/api/deployments`           | Create deployment        |
| GET    | `/api/image-versions`        | List image versions      |
| POST   | `/api/image-versions`        | Create image version     |
| GET    | `/api/gpu-status`            | Get GPU status by server |

## Configuration

### Backend Configuration

Database and SSH settings are configured in:

- `backend/database/models.py` - Database URL (default: SQLite)
- `backend/services/ssh_service.py` - SSH connection handling

### Deployment Template

The `deploy_chat.yaml` template lives at `backend/templates/deploy_chat.yaml.j2` and uses Jinja2 variables for image, GPUs, model path, port, and Consul settings.

## Roadmap

### Phase 2 (Planned)

- [ ] WebSocket real-time deployment logs
- [ ] Consul service health monitoring
- [ ] Automatic port allocation
- [ ] Auto-restart on failure
- [ ] Multi image registry support
- [ ] Image pre-warming

## License

Internal use only.
