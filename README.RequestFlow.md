你现在是一名 AI Infra 数字孪生交互设计师 + React 高级前端工程师。

请继续升级「流光 LIUGUANG」中的：

# Request Flow（请求流数字孪生）

模块。

当前问题：

Request Flow 还停留在：

- 普通请求流图
- Client → Gateway → Model
- 信息层级太浅
- GPU 资源感知不足

现在需要：

把它升级为：

# AI 算力资源流动总览（Compute Resource Flow）

它的职责：

不是展示 API 调用链。

而是：

# 宏观展示：

- 所有服务器
- 所有 GPU
- GPU 空闲率
- GPU 显存占用
- 模型服务分布
- 算力资源状态
- 推理服务负载

让用户：

一眼看清：

整个集群当前算力资源流动情况。

━━━━━━━━━━━━━━━━━━━
# 一、模块位置调整（必须）
━━━━━━━━━━━━━━━━━━━

当前：

Request Flow 在错误位置。

现在要求：

# 放到数字孪生页面 Header 下方

布局：

┌──────────────────────────────┐
│ Header                       │
├──────────────────────────────┤
│ Request Flow（新）           │
├─────────────┬────────────────┤
│ Server List │ GPU Topology   │
└─────────────┴────────────────┘

━━━━━━━━━━━━━━━━━━━
# 二、Request Flow 新定位（重要）
━━━━━━━━━━━━━━━━━━━

模块名称：

# Compute Resource Flow

中文：

# 算力资源流

不是：

Client / Gateway 请求链。

而是：

# AI 算力资源总览图

━━━━━━━━━━━━━━━━━━━
# 三、必须移除 Client 和 Gateway
━━━━━━━━━━━━━━━━━━━

当前：

Client → Gateway → GPU

错误。

现在：

# 去掉：

- Client
- Gateway

只保留：

# 服务器节点 + GPU 节点

例如：

━━━━━━━━━━━━━━
118-4090-5卡
━━━━━━━━━━━━━━
 ↓
GPU0 GPU1 GPU2 GPU3 GPU4

━━━━━━━━━━━━━━
63-L20-6卡
━━━━━━━━━━━━━━
 ↓
GPU0 GPU1 GPU2 GPU3 GPU4 GPU5

━━━━━━━━━━━━━━━━━━━
# 四、整体视觉（重要）
━━━━━━━━━━━━━━━━━━━

这个模块：

像：

# AI 算力星图

而不是：

流程图。

整体视觉：

- 微蓝流光
- 算力节点网络
- GPU 热力
- AI Infra 感
- 东方未来感

参考：

- NVIDIA Omniverse
- Neural Network
- 星图
- AI 拓扑网络

不要：

- 传统流程图
- BPMN 风格
- 运维图

━━━━━━━━━━━━━━━━━━━
# 五、节点设计（非常重要）
━━━━━━━━━━━━━━━━━━━

每个服务器：

是：

# 算力主节点

例如：

┌────────────────┐
│ 118-4090-5卡   │
│ GPU: 5         │
│ Used: 4        │
│ GPU NAME: 4090 │ 
└────────────────┘

视觉：

- 毛玻璃
- 微发光
- hover 漂浮
- 状态灯
- 微动态边框

━━━━━━━━━━━━━━━━━━━
# 六、GPU 区域（重点）
━━━━━━━━━━━━━━━━━━━

每个服务器下面：

展示：

# GPU 矩阵区域

例如：

┌──────────────┐
│ GPU0 GPU1    │
│ GPU2 GPU3    │
│ GPU4         │
└──────────────┘

每个 GPU：

需要：

- 显存热力颜色
- GPU Util 热力
- 微动态能量条
- hover 发光

━━━━━━━━━━━━━━━━━━━
# 七、GPU 颜色规范
━━━━━━━━━━━━━━━━━━━

显存占用：

绿色：
低占用

蓝色：
正常

橙色：
高占用

红色：
接近爆显存

例如：

```text id="w5zj9n"
12 / 96GB → 绿色
48 / 96GB → 蓝色
82 / 96GB → 橙色
94 / 96GB → 红色
━━━━━━━━━━━━━━━━━━━

# 八、Hover 节点信息（重点）

━━━━━━━━━━━━━━━━━━━

# 当鼠标悬停服务器节点：

显示：

# 详细信息浮层卡片

例如：

━━━━━━━━━━━━━━  
118-4090-5卡

ONLINE

GPU:  
5 / 5

Memory:  
420GB / 480GB

Models:  
Qwen3.5-35B  
Embedding  
Rerank

Running Services:  
12  
━━━━━━━━━━━━━━

要求：

- 毛玻璃浮层
- 微动画
- 白色透明
- 高级 Tooltip 风格

━━━━━━━━━━━━━━━━━━━

# 九、Hover GPU 信息（重点）

━━━━━━━━━━━━━━━━━━━

# 当鼠标悬停 GPU 区域：

显示：

# GPU Detail Tooltip

例如：


┌────────────────────────────┐
│ GPU0                L20    │
│ █████████░ 72 / 96 GB      │
│ GPU Util      87%          |
│ Temperature   71°C         │
│ Power         268W         │
│                              │
│ Running Services            │
│ ────────────────────────   │
│ hn-chat-v4                  │
│ Qwen3.5-35B                 │
│ running 6                  │
│                              │
│ hn-rerank                   │
│ BGE-Reranker                │
└────────────────────────────┘

要求：

- 高级浮层
- 微动态
- 显存热力条
- 芯片风格

━━━━━━━━━━━━━━━━━━━

# 十、点击节点交互（核心）

━━━━━━━━━━━━━━━━━━━

# 当点击服务器节点：

下方：

# 自动更新：

@frontend/src/pages/DigitalTwinPage/components/GpuTopology.tsx

展示：

# 该服务器详细 GPU 芯片矩阵

━━━━━━━━━━━━━━━━━━━

# 十一、GpuTopology.tsx 升级（重点）

━━━━━━━━━━━━━━━━━━━

当前：

GpuTopology 太简单。

现在：

升级为：

# GPU 芯片矩阵数字孪生

例如：

┌────────────────────────────┐  
│ GPU0 GPU1 GPU2 │  
│ GPU3 GPU4 GPU5 │  
└────────────────────────────┘

但：

每个 GPU：

是：

# AI 芯片模块

显示：

- GPU 型号
- 显存
- Util
- Temperature
- Running Service
- Running request

━━━━━━━━━━━━━━━━━━━

# 十二、GPU 协同关系（高级）

━━━━━━━━━━━━━━━━━━━

如果：

多个 GPU 属于同一个 Group：

例如：

Qwen3.5-72B TP=4

GPU0 GPU1 GPU2 GPU3

则：

自动绘制：

# GPU 协同连接线

效果：

- 蓝色流光
- 微动态粒子
- 神经网络感

使用：

ReactFlow

━━━━━━━━━━━━━━━━━━━

# 十三、状态管理（必须）

━━━━━━━━━━━━━━━━━━━

新增：

# selectedServer store

使用：

Zustand

结构：

```

```

```
{
  selectedServerId: string
  setSelectedServer: () => void
}
```

━━━━━━━━━━━━━━━━━━━

# 十四、数据结构（必须）

━━━━━━━━━━━━━━━━━━━

Request Flow：

需要使用：

```

```

```
interface ServerNode {
  id: string
  name: string
  gpuCount: number
  memoryUsed: number
  memoryTotal: number
  running: number
  gpus: GPUNode[]
}

interface GPUNode {
  index: number
  name: string
  memoryUsed: number
  memoryTotal: number
  utilization: number
  temperature: number
  services: ModelService[]
}
```

━━━━━━━━━━━━━━━━━━━

# 十五、技术要求

━━━━━━━━━━━━━━━━━━━

必须：

- React  

- TypeScript  

- TailwindCSS  

- Framer Motion  

- ReactFlow  

- Zustand  


Tooltip：

- Floating UI  

- Radix UI  


━━━━━━━━━━━━━━━━━━━

# 十六、动画要求

━━━━━━━━━━━━━━━━━━━

必须：

- hover 漂浮  

- GPU 热力变化  

- 流光边框  

- tooltip 淡入  

- 节点 hover 发光  


但：

克制。

不要：

- 光污染  

- 赛博朋克  

- 黑色监控风  


━━━━━━━━━━━━━━━━━━━

# 十七、最终输出要求

━━━━━━━━━━━━━━━━━━━

请直接生成：

1. 新版 RequestFlow.tsx  

2. ComputeResourceFlow.tsx  

3. ServerNode.tsx  

4. GPUHoverCard.tsx  

5. ServerHoverCard.tsx  

6. selectedServer Zustand Store  

7. 升级版 GpuTopology.tsx  

8. GPU 芯片矩阵  

9. ReactFlow GPU 连接  

10. Tailwind 样式  

11. Framer Motion 动画  


要求：

- 可直接运行  

- 高级 AI Infra 气质  

- 接近真实 AI 数字孪生平台  

- 有“流光”品牌感  

- 极简 + 高级 + 科技感

