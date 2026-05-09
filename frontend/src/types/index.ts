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
  image: string;
  port: number;
  gpus: string;
  status: string;
  yaml_content: string;
  created_at: string;
}
