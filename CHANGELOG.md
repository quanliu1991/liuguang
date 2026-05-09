# Changelog

## [v0.0.1] - 2026-05-09

### Initial Release - MVP

#### Features

- **Server Management**: CRUD operations for GPU servers with SSH credentials (user/password/key-based auth)
- **GPU Status Monitoring**: Real-time GPU memory usage collection via `nvidia-smi`
- **Model Registry**: Register models with path, GPU requirements, and size metadata
- **Image Version Management**: Track deployment image versions with version tagging
- **One-Click Deployment**: Form-based deployment with server, GPU, model, and image selection
- **Automatic YAML Generation**: Jinja2 template renders `deploy_chat.yaml` from deployment parameters
- **Model Syncing**: Automatic `rsync` model transfer to target servers
- **Deployment Execution**: Automatic `das-start start deploy_chat.yaml` via SSH
- **Deployment Tracking**: Record all deployments with status in SQLite database
- **GPU Visualization**: Frontend displays GPU memory usage for informed selection

#### Tech Stack

- Frontend: React 19, Vite 8, Ant Design 6, TypeScript, TailwindCSS, Framer Motion, Lucide Icons
- Backend: FastAPI, SQLAlchemy, Jinja2, Paramiko
- Database: SQLite
- Deployment: das-start CLI tool

#### Architecture

- Service-layer architecture with clear separation between API routes and business logic
- Unified SSH service abstraction via Paramiko
- Jinja2-based YAML templating (no hardcoded deploy configs)
- SQLite database with SQLAlchemy ORM

#### Known Limitations

- No WebSocket real-time log streaming
- No Consul health monitoring UI
- Manual port allocation
- No auto-restart on deployment failure
- Single SQLite database (PostgreSQL upgrade planned)
- No multi-tenant or permission system
