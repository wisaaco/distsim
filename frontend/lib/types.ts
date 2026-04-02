export interface Session {
  id: string;
  name: string;
  template: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  machines: Machine[];
  connections: Connection[];
  created_at: string;
}

export interface Machine {
  id: string;
  hostname: string;
  ip: string;
  container_id: string;
  status: 'running' | 'stopped' | 'error';
  services: ServiceInst[];
  session_id: string;
  position_x: number;
  position_y: number;
}

export interface ServiceInst {
  id: string;
  type: string;
  status: 'pending' | 'installing' | 'running' | 'stopped' | 'error';
  installed: boolean;
}

export interface ServiceDef {
  type: string;
  display_name: string;
  icon: string;
  category: string;
  image: string;
  default_port: number;
  exposes: PortSpec[];
  consumes: string[];
}

export interface PortSpec {
  port: number;
  protocol: string;
  role: string;
}

export interface Connection {
  id: string;
  session_id: string;
  from_node: string;
  from_service: string;
  to_node: string;
  to_service: string;
  protocol: string;
  status: string;
}

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  machines: TemplateMachine[];
  connections: TemplateConnection[];
}

export interface TemplateMachine {
  hostname: string;
  image: string;
  services: string[];
}

export interface TemplateConnection {
  from_hostname: string;
  from_service: string;
  to_hostname: string;
  to_service: string;
  protocol: string;
}

export interface ExecRequest {
  command: string;
}

export interface ExecResult {
  output: string;
  exit_code: number;
}

export interface WriteFileRequest {
  path: string;
  content: string;
}

export interface CreateSessionRequest {
  name: string;
  template: string;
}

export interface AddMachineRequest {
  hostname: string;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export interface ChaosEvent {
  id: string;
  session_id: string;
  machine_id: string;
  action: string;
  params: Record<string, string>;
  status: 'active' | 'reverted';
  created_at: string;
}

export interface MachineStatus {
  machine_id: string;
  hostname: string;
  container_running: boolean;
}

export type MachineHealth = 'healthy' | 'down' | 'degraded' | 'unknown';
