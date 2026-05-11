# 流光 (Liuguang) AI 算力部署平台 v0.0.2

> **发布日期**: 2026-05-11
> **版本标签**: `v0.0.2`
> **定位**: AI 算力 · 模型 · 服务 中枢

---

## 一、版本亮点

### 1. 异步部署 + 实时进度追踪

v0.0.1 中部署操作是同步阻塞的，前端需要等待整个流程完成。v0.0.2 将其改造为**后台线程异步执行**，同时提供 **SSE 实时进度推送**，前端以步骤化进度条 + 日志流的形式展示部署过程。

**部署步骤可视化**（共 14 步）：

```
初始化 → 校验 GPU → 检查端口 → 检查模型 → 打包模型 → 上传模型 → 解压模型
→ 模型就绪 → 同步 Key → 生成配置 → 上传配置 → 启动服务 → 部署成功
```

每一步都有独立状态反馈，失败可精确定位。

### 2. 自动容器扫描与部署补录

新增容器扫描服务，可以**自动发现服务器上已经运行的 GPU 容器**，提取模型路径、端口、GPU 使用等信息，并与系统内的模型库自动匹配，补录为部署记录。

**扫描流程**：

1. 通过 `nvidia-smi` 获取所有使用 GPU 的进程
2. 通过 PID 查找所属 Docker/containerd 容器
3. `docker inspect` 获取完整容器配置
4. 解析启动命令/脚本提取端口、模型路径
5. 与系统模型库自动匹配
6. 创建或同步部署记录
7. 清理已不存在容器的过期记录

**调度方式**：

- **定时扫描**: 应用启动后每小时自动全量扫描所有服务器
- **手动扫描**: 通过 `POST /api/deployments/scan` 随时触发

### 3. 部署页面拆分重构

原来的单页面 `DeployPage` 拆分为两个独立页面：

- **创建部署** (`/deploy`): 表单页，包含服务器选择、GPU 实时状态、模型选择、镜像版本、部署进度展示
- **部署列表** (`/status`): 列表页，支持按服务器/模型筛选，可快速查看 YAML 配置和实时日志

### 4. 数据模型优化

- `Deployment` 新增 `from_source` 字段（`manual` / `scanned`），区分手动创建和扫描补录
- `Deployment` 新增 `detected_model_name` 字段，记录从容器实际检测到的模型名
- 服务名唯一约束从 `service_name` 改为 `(server_id, service_name)` 联合唯一，允许不同服务器上同名服务共存

---

## 二、功能清单


| 模块        | 功能          | 说明                            |
| --------- | ----------- | ----------------------------- |
| **服务器管理** | 添加/编辑/删除服务器 | 输入自动去空格                       |
|           | 健康检查        | SSH 连通性检测                     |
|           | GPU 检测      | 自动探测 GPU 数量和可用状态              |
|           | 自动配置        | 一键完成 Docker、Consul 等基础环境配置    |
| **模型管理**  | 模型注册/编辑/删除  | 维护模型名称、路径等信息                  |
| **镜像版本**  | 镜像版本 CRUD   | 管理不同版本的推理镜像                   |
| **创建部署**  | 异步部署        | 后台线程执行，不阻塞界面                  |
|           | 实时进度        | SSE 推送 14 步进度，失败可定位           |
|           | 实时日志        | SSE 流式输出容器日志，自动高亮错误           |
|           | YAML 查看     | 部署完成后可查看生成的 YAML 配置           |
|           | GPU 实时状态    | 选择服务器后显示各 GPU 显存占用            |
| **部署列表**  | 列表展示        | 服务名、服务器、模型、GPU、状态、端口          |
|           | 筛选          | 按服务器/模型名称过滤                   |
|           | 查看 YAML     | 弹窗展示部署配置                      |
|           | 查看日志        | 实时日志流                         |
|           | 删除          | 停止并删除容器及部署记录                  |
| **容器扫描**  | 定时扫描        | 每小时自动扫描所有服务器                  |
|           | 手动扫描        | `POST /api/deployments/scan`  |
|           | 自动匹配        | 从容器挂载路径、环境变量、启动命令中提取模型信息并自动匹配 |
|           | 状态同步        | 更新已有部署的状态和 GPU 信息             |
|           | 过期清理        | 自动删除已停止容器的扫描记录                |


---

## 三、快速开始

### 环境要求

- **后端**: Python 3.10+
- **前端**: Node.js 18+
- **数据库**: SQLite（开箱即用）

### 启动后端

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动服务
python app.py
```

后端服务默认运行在 `http://localhost:8000`

### 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务
npm run dev
```

前端默认运行在 `http://localhost:5173`

### 基础使用流程

#### Step 1: 添加服务器

1. 进入「服务器管理」页面
2. 点击「添加服务器」，填写：名称、IP、SSH 用户、SSH Key（或密码）、SSH 端口
3. 保存后可点击「健康检查」验证连通性
4. 点击「GPU 检测」自动探测 GPU 资源

#### Step 2: 注册模型

1. 进入「模型管理」页面
2. 添加模型：名称、模型路径
3. 模型路径需与服务器上实际存放路径一致，用于扫描时自动匹配

#### Step 3: 管理镜像版本

1. 进入「镜像版本」页面
2. 添加推理镜像：名称、镜像地址、版本号

#### Step 4: 创建部署

1. 进入「创建部署」页面
2. 选择目标服务器，确认 GPU 资源可用
3. 选择模型和镜像版本
4. 填写服务名、端口、GPU 分配
5. 点击「开始部署」，观察实时进度

#### Step 5: 查看部署

1. 进入「部署列表」页面
2. 可按服务器或模型筛选
3. 点击「YAML」查看配置，「日志」查看实时日志

### 手动触发容器扫描

```bash
curl -X POST http://localhost:8000/api/deployments/scan
```

返回示例：

```json
{
  "scanned": 5,
  "added": 2,
  "synced": 3,
  "skipped": 0,
  "removed": 1,
  "errors": []
}
```

---

## 四、API 参考

### 部署相关


| 方法       | 路径                                             | 说明           |
| -------- | ---------------------------------------------- | ------------ |
| `GET`    | `/api/deployments`                             | 获取所有部署列表     |
| `POST`   | `/api/deployments`                             | 创建部署（异步）     |
| `DELETE` | `/api/deployments/{deploy_id}`                 | 删除部署         |
| `GET`    | `/api/deployments/{deploy_id}/yaml`            | 获取部署 YAML 配置 |
| `GET`    | `/api/deployments/{deploy_id}/logs`            | SSE 实时日志流    |
| `GET`    | `/api/deployments/{deploy_id}/progress`        | 获取部署进度（JSON） |
| `GET`    | `/api/deployments/{deploy_id}/progress/stream` | SSE 部署进度流    |
| `POST`   | `/api/deployments/scan`                        | 手动触发全量容器扫描   |


### 服务器相关


| 方法       | 路径                                      | 说明        |
| -------- | --------------------------------------- | --------- |
| `GET`    | `/api/servers`                          | 获取所有服务器   |
| `POST`   | `/api/servers`                          | 添加服务器     |
| `PUT`    | `/api/servers/{server_id}`              | 更新服务器     |
| `DELETE` | `/api/servers/{server_id}`              | 删除服务器     |
| `GET`    | `/api/servers/{server_id}/gpu-status`   | 获取 GPU 状态 |
| `POST`   | `/api/servers/{server_id}/auto-setup`   | 自动配置服务器   |
| `POST`   | `/api/servers/{server_id}/health-check` | 健康检查      |
| `POST`   | `/api/servers/{server_id}/detect-gpu`   | GPU 检测    |


---

## 五、技术栈

**后端**:

- FastAPI + SQLAlchemy + SQLite
- Paramiko（SSH 远程执行）
- 后台线程 + SSE 实现异步部署和实时推送
- 定时调度（threading.Timer）

**前端**:

- React 18 + TypeScript
- Ant Design 5
- TailwindCSS + Framer Motion
- Lucide Icons
- EventSource（SSE 客户端）

---

## 六、变更日志

```
v0.0.2 (2026-05-11)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[新增] 异步部署，后台线程执行，不阻塞请求
[新增] SSE 实时部署进度推送（14 步进度条）
[新增] SSE 实时日志流，自动高亮错误
[新增] 容器扫描服务，自动发现 GPU 容器并补录部署
[新增] 定时扫描调度器（每小时）
[新增] 手动扫描端点 POST /api/deployments/scan
[新增] from_source 字段区分手动创建/扫描补录
[新增] detected_model_name 字段记录实际检测到的模型名
[优化] 服务名唯一约束改为 (server_id, service_name) 联合唯一
[优化] 部署页面拆分为创建部署 + 部署列表两页
[优化] 部署列表支持按服务器/模型筛选
[优化] 服务器输入字段自动去除首尾空格
[修复] 数据库兼容旧表结构自动迁移
```

