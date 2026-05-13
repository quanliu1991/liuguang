export type Server = {
  id: number;
  name: string;
  ip: string;
  ssh_user: string;
  ssh_password: string | null;
  ssh_port: number;
  ssh_key: string | null;
  status: string;
  gpu_count: number;
  gpu_available: number;
  created_at: string;
}

export type GpuInfo = {
  gpu: number;
  used: number;
  total: number;
  free: boolean;
}

export type Model = {
  id: number;
  name: string;
  path: string;
  key_path: string | null;
  gpu_required: number;
  size: string;
  created_at: string;
}

export type Deployment = {
  id: number;
  service_name: string;
  server_id: number;
  model_id: number;
  model_name: string;
  image: string;
  port: number;
  gpus: string;
  status: string;
  yaml_content: string;
  from_source: string;
  detected_model_name: string;
  created_at: string;
}

// Digital Twin Types
export type ModelServiceHistory = {
  timestamps: string[];
  qps: number[];
  tps: number[];
  concurrency: number[];
}

export type ModelService = {
  service_name: string;
  model: string;
  qps: number;
  tps: number;
  concurrency: number;
  request_count: number;
  token_speed: number;
  p95_latency: number;
  avg_generate_speed: number;
  kv_cache: number;
  running: number;
  tp_group: string | null;
  history: ModelServiceHistory;
}

export type GpuTwin = {
  index: number;
  name: string;
  memory_used: number;
  memory_total: number;
  gpu_util: number;
  kv_cache: number;
  temperature: number;
  power: number;
  services: ModelService[];
}

export type ServerTwin = {
  name: string;
  status: 'online' | 'offline' | 'warning';
  gpu_count: number;
  gpu_online: number;
  memory_used: number;
  memory_total: number;
  current_qps: number;
  current_tps: number;
  models: string[];
  gpus: GpuTwin[];
}

export type DigitalTwinData = {
  servers: ServerTwin[];
}

export type ResourceSummary = {
  total_gpus: number;
  gpu_utilization: number;
  total_memory_used: number;
  total_memory: number;
  current_requests: number;
  current_concurrency: number;
  current_tps: number;
  current_qps: number;
  token_output_speed: number;
  online_models: number;
}

export type FragmentAlert = {
  gpu_index: number;
  server_name: string;
  memory_remaining: number;
  suggestion: string;
}

export type ScheduleSuggestion = {
  type: 'migration' | 'scale_down' | 'consolidation' | 'idle';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}
