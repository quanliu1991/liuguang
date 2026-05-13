你现在是一名 AI Infra 架构师 + 数字孪生系统设计师 + AI 推理平台产品经理。

请为「流光 LIUGUANG」设计并实现：

# GPU / NPU 数字孪生资源治理系统

（AI Infra Digital Twin Resource Governance）

目标：

构建一个：

“面向 AI 推理服务的 GPU 数字孪生控制中心”

让用户能够：

- 实时查看每台服务器
- 实时查看每张 GPU 卡
- 查看每张卡运行了哪些模型服务
- 查看每个模型服务的：
  - QPS
  - TPS
  - 并发数
  - 请求数
  - Token 使用量
  - 显存占用
  - GPU 利用率
  - KV Cache 占用
  - 请求时间分布
  - 请求峰值变化
- 观察 GPU 资源碎片化
- 分析 GPU 利用率
- 发现资源浪费
- 辅助模型调度
- 提高 GPU 利用率

这是：

整个「流光」平台最核心的能力之一。

━━━━━━━━━━━━━━━━━━━

# 一、系统定位（非常重要）

━━━━━━━━━━━━━━━━━━━

这不是：

- 普通监控面板
- Grafana
- 运维后台

而是：

# AI 推理基础设施数字孪生系统

需要体现：

- AI 算力流动
- 模型服务分布
- GPU 资源占用
- 请求洪流
- 推理负载变化
- Token 流动
- 模型协同推理

整体气质：

- Apple Vision Pro
- Linear
- Vercel
- NVIDIA Omniverse
- AI Infra OS

风格：

- 极简
- 高级
- 科技感
- 流光感
- 东方未来感
- 白色体系
- 微蓝能量流

不要：

- 黑色大屏
- 运维监控风
- 传统图表堆积
- 土味监控 UI

━━━━━━━━━━━━━━━━━━━

# 二、核心页面设计

━━━━━━━━━━━━━━━━━━━

新增页面：

# 「算力数字孪生」

英文：

Compute Digital Twin

副标题：

实时感知模型、请求与算力的流动

━━━━━━━━━━━━━━━━━━━

# 三、页面整体布局

━━━━━━━━━━━━━━━━━━━

整体布局：

┌─────────────────────────────────┐
│ Header                          │
├────────────┬────────────────────┤
│ 服务器星图 │ GPU 数字孪生主区域 │
└────────────┴────────────────────┘

左侧：

服务器节点区

右侧：

GPU 数字孪生区

顶部：

全局资源总览

━━━━━━━━━━━━━━━━━━━

# 四、顶部全局资源总览（重要）

━━━━━━━━━━━━━━━━━━━

展示：

- GPU 总数
- GPU 使用率
- 总显存占用
- 当前总请求数
- 当前总并发
- 当前 TPS
- 当前 QPS
- Token 输出速度
- 在线模型服务数

展示风格：

- 极简卡片
- 半透明
- 大数字
- 微动画
- Apple 风格

━━━━━━━━━━━━━━━━━━━

# 五、左侧服务器数字孪生节点

━━━━━━━━━━━━━━━━━━━

每台服务器：

# 算力节点卡片

例如：

━━━━━━━━━━━━━━
118-4090-5卡

ONLINE

GPU:
5 / 5

Memory:
410GB / 480GB

Current QPS:
324

Current TPS:
12874

Models:
Qwen3.5-35B
Embedding
━━━━━━━━━━━━━━

要求：

- 毛玻璃
- 微发光
- hover 浮动
- 选中蓝色边框
- 状态灯
- 实时数据跳动

━━━━━━━━━━━━━━━━━━━

# 六、GPU 数字孪生主区域（核心）

━━━━━━━━━━━━━━━━━━━

点击服务器后：

展示：

# GPU 拓扑数字孪生

例如：

┌────────────────────┐
│ GPU0 GPU1 GPU2     │
│ GPU3 GPU4 GPU5     │
└────────────────────┘

但：

不是普通方块。

而是：

# AI 算力芯片模块

━━━━━━━━━━━━━━━━━━━

# 七、GPU 卡片设计（最核心）

━━━━━━━━━━━━━━━━━━━

每张 GPU：

┌────────────────────────────┐
│ GPU0                L20    │
│ █████████░ 72 / 96 GB      │
│ GPU Util      87%          │
│ KV Cache      68%          │
│ Temperature   71°C         │
│ Power         268W         │
│                              │
│ Running Services            │
│ ────────────────────────   │
│ hn-chat-v4                  │
│ Qwen3.5-35B                 │
│ QPS: 84                     │
│ TPS: 5421                   │
│ Concurrency: 132            │
│                              │
│ hn-rerank                   │
│ BGE-Reranker                │
│ QPS: 12                     │
└────────────────────────────┘

要求：

- 芯片科技感
- 半透明
- 大圆角
- 微蓝能量条
- 显存热力
- hover 微发光
- GPU 热力动态变化

━━━━━━━━━━━━━━━━━━━

# 八、模型服务数字孪生（重点）

━━━━━━━━━━━━━━━━━━━

GPU 卡片内部：

每个模型服务：

需要显示：

# 模型服务实时运行状态

包括：

- 服务名
- 模型名
- QPS
- TPS
- 并发
- 请求量
- Token 输出
- P95 延迟
- 平均生成速度
- KV Cache 占用
- Running

━━━━━━━━━━━━━━━━━━━

# 九、时间维度分析（重要）

━━━━━━━━━━━━━━━━━━━

每个模型服务：

支持：

# 时间序列分析

展示：

- QPS 随时间变化
- TPS 随时间变化
- 并发变化
- 请求峰值
- Token 输出速度变化

图表要求：

- 极简
- 浅色
- 微发光
- 平滑曲线

不要：

- Grafana 风
- 黑色图

使用：

ECharts

━━━━━━━━━━━━━━━━━━━

# 十、GPU 资源碎片分析（高级功能）

━━━━━━━━━━━━━━━━━━━

系统需要自动分析：

# GPU 资源碎片化

例如：

GPU0:
72GB used
24GB remain

但：

剩余显存无法部署目标模型。

系统需要：

# 智能分析资源浪费

展示：

━━━━━━━━━━━━━━
资源碎片告警

GPU3:
剩余 18GB

GPU4:
剩余 22GB

建议：
迁移 embedding 服务
可释放完整 GPU
━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━

# 十一、GPU 协同推理关系（高级感）

━━━━━━━━━━━━━━━━━━━

如果：

多个 GPU 属于同一个 TP Group：

例如：

Qwen3.5-72B TP=4

GPU0 GPU1 GPU2 GPU3

则：

自动生成：

# GPU 协同拓扑

要求：

- 流光连接线
- 动态粒子
- 神经网络感
- AI 推理流动感

使用：

ReactFlow

━━━━━━━━━━━━━━━━━━━

# 十二、请求流数字孪生（高级功能）

━━━━━━━━━━━━━━━━━━━

系统需要：

# 实时请求流可视化

例如：

Client
 ↓
Gateway
 ↓
Qwen3.5-35B
 ↓
GPU0 GPU1 GPU2 GPU3

展示：

- 请求流向
- Token 流向
- 请求洪峰
- 推理热点

效果：

- 微流光动画
- 神经网络感
- AI 数据流动感

━━━━━━━━━━━━━━━━━━━

# 十三、数据采集架构（必须设计）

━━━━━━━━━━━━━━━━━━━

数据来源：

- nvidia-smi
- dcgm-exporter（不依赖）
- docker stats
- vLLM metrics
- consul（不依赖）
- deploy_chat.yaml
- Prometheus（不依赖）

━━━━━━━━━━━━━━━━━━━

# 十四、vLLM 指标采集（重点）

━━━━━━━━━━━━━━━━━━━

需要采集：

# 推理指标

包括：

- running_requests
- waiting_requests
- tokens_per_second
- prompt_tokens
- generation_tokens
- kv_cache_usage
- batch_size
- request_latency
- queue_latency

来源：

Prometheus metrics endpoint

例如：

```text
http(s)://host:port/metrics
```

━━━━━━━━━━━━━━━━━━━

# 十五、后端数据模型（必须）

━━━━━━━━━━━━━━━━━━━

后端统一返回：

```
{
  "servers": [
    {
      "name": "118-4090-5卡",
      "status": "online",
      "gpus": [
        {
          "index": 0,
          "name": "RTX4090",
          "memory_used": 72,
          "memory_total": 96,
          "gpu_util": 87,
          "kv_cache": 68,
          "temperature": 71,
          "power": 268,
          "services": [
            {
              "service_name": "hn-chat-v4",
              "model": "Qwen3.5-35B",
              "qps": 84,
              "tps": 5421,
              "concurrency": 132,
              "request_count": 182394,
              "token_speed": 8451,
              "p95_latency": 1.24,
              "avg_generate_speed": 48,
              "running": 32,
              "tp_group": "group-1",
              "history": {
                "qps": [],
                "tps": [],
                "concurrency": []
              }
            }
          ]
        }
      ]
    }
  ]
}
```

━━━━━━━━━━━━━━━━━━━

# 十六、实时数据系统（必须）

━━━━━━━━━━━━━━━━━━━

必须：

实时刷新。

方案：

- WebSocket  

- 2 秒刷新  

- Zustand Store  

- 平滑动画更新  


不要：

页面闪烁。

━━━━━━━━━━━━━━━━━━━

# 十七、资源调度建议系统（高级功能）

━━━━━━━━━━━━━━━━━━━

系统需要：

# 自动生成资源优化建议

例如：

- GPU0 利用率长期低于 20%  

- embedding 服务可迁移  

- 某模型可 TP 缩容  

- 某 GPU 显存碎片严重  

- 某服务 QPS 长期过低  


生成：

# AI 调度建议

━━━━━━━━━━━━━━━━━━━

# 十八、技术栈（必须）

━━━━━━━━━━━━━━━━━━━

前端：

- React  

- TypeScript  

- TailwindCSS  

- Framer Motion  

- ReactFlow  

- Zustand  

- ECharts  


后端：

- FastAPI  

- WebSocket  

- Prometheus Client  

- SQLite/PostgreSQL  


━━━━━━━━━━━━━━━━━━━

# 十九、动画要求

━━━━━━━━━━━━━━━━━━━

必须：

- GPU 热力动态变化  

- 请求流动画  

- 流光连接  

- 数字滚动  

- 页面淡入  

- hover 微浮动  


但：

克制。

不要：

- 光污染  

- 赛博朋克  

- 黑色大屏  


━━━━━━━━━━━━━━━━━━━

# 二十、最终输出要求

━━━━━━━━━━━━━━━━━━━

请直接生成：

1. 完整页面 Layout  

2. 数字孪生 Dashboard  

3. GPUCard.tsx  

4. ModelServiceCard.tsx  

5. GPU 拓扑组件  

6. 请求流组件  

7. ECharts 时间序列图  

8. WebSocket 实时数据  

9. Zustand Store  

10. ReactFlow GPU 网络  

11. Tailwind 全局主题  

12. Framer Motion 动画  

13. Mock Data  

14. FastAPI WebSocket 示例  

15. Prometheus 指标采集示例  


要求：

- 可直接运行  

- 真实 AI Infra SaaS 水平  

- 极强高级感  

- 接近真实 AI 推理控制中心  

- 有“流光”品牌气质  

- 有 AI 算力中枢的未来感

