# 给 Cursor 的开发计划（GPU 模型部署平台 MVP）

你现在需要开发一个：

> 多 GPU 服务器模型部署平台（MVP）

目标：

通过 Web 页面：

* 选择服务器
* 选择 GPU
* 选择镜像版本
* 选择模型
* 自动传输模型
* 自动生成 deploy_chat.yaml
* 自动执行 das-start
* 自动注册 Consul

实现：

> 一键部署模型服务。

当前阶段：

* 不做 Kubernetes
* 不做复杂调度
* 不做多租户
* 不做权限系统

只做：

> 内部团队高效部署工具。

---

# 一、整体技术栈（固定）

## 前端

```text
React
Vite
Ant Design
TypeScript
```

---

## 后端

```text
FastAPI
SQLAlchemy
Jinja2
Paramiko
```

---

## 数据库

```text
SQLite
```

后期再升级 PostgreSQL。

---

## 部署执行

固定使用：

```bash
das-start start deploy_chat.yaml
```

---

# 二、第一阶段目标（必须先完成）

# MVP 核心功能

必须实现：

## 1. 服务器管理

支持：

* 添加服务器
* 修改服务器
* 删除服务器
* 查看服务器 GPU 状态

字段：

```text
名称
IP
SSH 用户
SSH 密钥
GPU 数量
状态
```

---

## 2. 模型管理

支持：

* 添加模型
* 模型路径
* 模型需要 GPU 数
* 模型大小

字段：

```text
模型名
模型目录
GPU需求
模型大小
```

---

## 3. 创建部署

页面需要：

| 字段           | 说明          |
| ------------ | ----------- |
| 服务名          | hn-chat-v4  |
| 镜像版本         | R26C10      |
| 目标服务器        | gpu-01      |
| GPU          | 0,1         |
| 模型           | Qwen3.5-35B |
| Port         | 34001       |
| Consul Host  | 自动选择        |
| Consul Token | 自动填充        |

---

## 4. 自动生成 deploy_chat.yaml

必须：

* 使用 Jinja2 模板
* 不允许用户手写 YAML
* 前端仅填写参数

---

## 5. 自动同步模型

逻辑：

```text
检查目标机器是否存在模型
不存在 → rsync 自动同步
存在 → 跳过
```

必须使用：

```bash
rsync
```

不要使用 scp。

---

## 6. 自动部署

流程：

```text
上传 deploy_chat.yaml
SSH 执行：

das-start start deploy_chat.yaml
```

---

## 7. 部署列表

展示：

| 服务名 | 服务器 | GPU | 状态 | Port |
| --- | --- | --- | -- | ---- |

支持：

* 删除
* 重启
* 查看 YAML
* 查看日志

---

# 三、推荐目录结构（必须按这个做）

# backend

```text
backend/
├── app.py
├── api/
│   ├── server.py
│   ├── model.py
│   ├── deploy.py
│   └── status.py
├── services/
│   ├── ssh_service.py
│   ├── deploy_service.py
│   ├── model_sync_service.py
│   ├── yaml_service.py
│   └── gpu_service.py
├── templates/
│   └── deploy_chat.yaml.j2
├── database/
├── models/
└── utils/
```

---

# frontend

```text
frontend/
├── src/
│   ├── pages/
│   │   ├── DeployPage
│   │   ├── ServerPage
│   │   ├── ModelPage
│   │   └── StatusPage
│   ├── api/
│   ├── components/
│   └── types/
```

---

# 四、数据库设计（必须先完成）

# server 表

```sql
id
name
ip
ssh_user
ssh_key
status
gpu_count
created_at
```

---

# model 表

```sql
id
name
path
gpu_required
size
created_at
```

---

# deployment 表

```sql
id
service_name
server_id
model_id
image
port
gpus
status
yaml_content
created_at
```

---

# 五、deploy_chat.yaml 模板方案

必须使用：

```text
templates/deploy_chat.yaml.j2
```

模板变量：

```yaml
image: {{ image }}

require:
  gpus:
    device: {{ gpus }}

volumes:
  - {{ model_path }}:/workspace/model

environment:
  - MODEL=/workspace/model
  - PORT={{ port }}
  - TENSOR_PARALLEL_SIZE={{ tp_size }}

  - CONSUL_HOST={{ consul_host }}
  - CONSUL_TOKEN={{ consul_token }}
```

---

# 六、部署执行逻辑（必须严格按流程）

# deploy_service.py

部署流程：

```text
1. 校验 GPU 是否空闲
2. 校验 Port 是否占用
3. 检查模型是否存在
4. rsync 模型
5. 渲染 YAML
6. 上传 YAML
7. 执行 das-start
8. 更新数据库状态
```

---

# 七、GPU 状态采集（必须做）

通过 SSH 执行：

```bash
nvidia-smi \
--query-gpu=index,memory.used,memory.total \
--format=csv,noheader
```

解析后返回：

```json
[
  {
    "gpu": 0,
    "used": 72,
    "total": 80,
    "free": false
  }
]
```

前端必须显示 GPU 使用情况。

---

# 八、SSH 服务实现要求

必须封装：

# ssh_service.py

提供：

```python
exec_command()
upload_file()
file_exists()
mkdir()
```

统一使用 Paramiko。

不要到处直接写 SSH 逻辑。

---

# 九、rsync 模型同步方案

模型中央目录：

```text
/storage/models/
```

目标服务器目录：

```text
/opt/models/
```

同步命令：

```bash
rsync -avz \
/storage/models/Qwen3.5-35B \
gpu-01:/opt/models/
```

---

# 十、前端页面要求

# 1. 部署页面

必须：

* 表单化
* 下拉选择
* GPU 可视化选择
* 自动校验 GPU 数量

---

# 2. 部署列表

必须：

* 表格展示
* 状态标签
* 支持刷新
* 支持查看 YAML

---

# 3. 服务器页面

必须：

* 展示 GPU 状态
* 展示在线状态
* 展示运行容器数量

---

# 十一、阶段开发计划（严格按顺序）

# 第一周

## Day1

完成：

* FastAPI 初始化
* React 初始化
* SQLite 初始化
* 数据库表结构

---

## Day2

完成：

* 服务器 CRUD
* 模型 CRUD
* 前端基础页面

---

## Day3

完成：

* YAML 模板渲染
* SSH 服务
* deploy API

---

## Day4

完成：

* rsync 模型同步
* das-start 自动执行
* 部署状态记录

---

## Day5

完成：

* GPU 状态采集
* 前端 GPU 展示
* 联调部署

---

# 十二、第二阶段（后续再做）

第二阶段不要提前做。

后面再增加：

* WebSocket 实时日志
* Consul 服务状态
* 自动端口分配
* 健康检查
* 自动重启
* 多镜像仓库
* 镜像自动预热

---

# 十三、代码要求（非常重要）

必须：

* 服务层解耦
* 不允许业务逻辑写在 API 层
* YAML 必须模板化
* SSH 必须统一封装
* 所有部署动作必须记录数据库
* 所有异常必须日志化

不要：

* 直接 shell 拼接字符串
* 把 SSH 写到 API 里
* 把 YAML 写死
* 前端直接拼 deploy_chat.yaml

---

# 十四、MVP 成功标准

当下面流程能成功：

```text
打开 Web 页面
→ 选择服务器
→ 选择 GPU
→ 选择模型
→ 点击部署
→ 自动同步模型
→ 自动生成 YAML
→ 自动执行 das-start
→ 服务启动成功
→ Consul 注册成功
```

就算 MVP 成功。

---

# 十五、重要原则（必须遵守）

当前目标不是：

* Kubernetes
* 云原生
* GPU 调度平台
* 分布式编排

当前目标是：

> 让团队部署模型从 30 分钟变成 30 秒。

优先：

* 简单
* 稳定
* 好维护
* 易扩展

不要过度设计。
