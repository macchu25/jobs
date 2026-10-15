import { Bin, Command, MachineStatus, PublicConfig, Alarm, EventLog, SystemSnapshot } from '../types';

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: { code: 'NETWORK_ERROR', message: 'Failed to parse server response' }
  }));

  if (!json.success || !response.ok) {
    const message = json.error?.message || `HTTP ${response.status}: Request failed`;
    const error = new Error(message);
    (error as any).code = json.error?.code || 'UNKNOWN_ERROR';
    (error as any).status = response.status;
    throw error;
  }

  return json.data as T;
}

export const apiService = {
  // Machine & Health
  getHealth: () => request<{ status: string; plc: boolean; uptime: number; websocketClients: number }>('/health'),
  getStatus: () => request<SystemSnapshot>('/status'),
  getPublicConfig: () => request<PublicConfig>('/config/public'),

  // Direct PLC Control & Configuration
  getPlcConfig: () => request<{
    ip: string;
    port: number;
    slave_id: number;
    register_address: number;
    simulation_mode: boolean;
    auto_reconnect: boolean;
    connected: boolean;
    last_error: string;
  }>('/plc/config'),
  connectPlc: (params?: { ip?: string; port?: number; slave_id?: number; register_address?: number; simulation_mode?: boolean }) =>
    request<any>('/plc/connect', {
      method: 'POST',
      body: params ? JSON.stringify(params) : undefined,
    }),
  disconnectPlc: () => request<{ success: boolean }>('/plc/disconnect', { method: 'POST' }),
  writePlcRegister: (register: number, value: number) =>
    request<{ success: boolean; register: number; value: number; error: string }>('/plc/write', {
      method: 'POST',
      body: JSON.stringify({ register, value }),
    }),

  // Bins & Dispensing (Full CRUD)
  getBins: () => request<Bin[]>('/bins'),
  callItem: (binId: string) => request<Command>(`/bins/${binId}/call`, { method: 'POST' }),
  createBin: (bin: Record<string, any>) => request<Bin>('/bins', {
    method: 'POST',
    body: JSON.stringify(bin)
  }),
  updateBin: (binId: string, bin: Record<string, any>) => request<Bin>(`/bins/${binId}`, {
    method: 'PUT',
    body: JSON.stringify(bin)
  }),
  deleteBin: (binId: string) => request<Bin>(`/bins/${binId}`, {
    method: 'DELETE'
  }),
  resetBin: (binId: string) => request<{ success: boolean }>(`/bins/${binId}/reset`, {
    method: 'POST'
  }),
  restoreDefaultBins: () => request<Bin[]>('/bins/restore_defaults', {
    method: 'POST'
  }),

  // Conveyor & Machine
  startConveyor: () => request<{ conveyor: string }>('/conveyor/start', { method: 'POST' }),
  stopConveyor: () => request<{ conveyor: string }>('/conveyor/stop', { method: 'POST' }),
  setMachineAuto: () => request<{ machineMode: string }>('/machine/auto', { method: 'POST' }),
  setMachineManual: () => request<{ machineMode: string }>('/machine/manual', { method: 'POST' }),
  setMode: (mode: 'simulation' | 'real') => request<{ mode: string }>('/mode', {
    method: 'POST',
    body: JSON.stringify({ mode })
  }),

  // Manual Pusher
  pushBin: (binId: string) => request<{ status: string }>(`/manual/bins/${binId}/push`, { method: 'POST' }),
  retractBin: (binId: string) => request<{ status: string }>(`/manual/bins/${binId}/retract`, { method: 'POST' }),

  // Alarms
  getAlarms: (activeOnly = false) => request<Alarm[]>(`/alarms${activeOnly ? '?active=true' : ''}`),
  ackAlarm: (id: string) => request<Alarm>(`/alarms/${id}/ack`, { method: 'POST' }),
  resetAlarms: () => request<{ message: string }>('/alarms/reset', { method: 'POST' }),

  // History & Commands
  getHistory: (params: { limit?: number; type?: string; bin?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.type) query.set('type', params.type);
    if (params.bin) query.set('bin', params.bin);
    return request<EventLog[]>(`/history?${query.toString()}`);
  },
  getCommands: (limit = 50) => request<Command[]>(`/commands?limit=${limit}`),

  // Simulation controls
  simAddRandom: () => request<{ status: string }>('/simulation/items/random', { method: 'POST' }),
  simAddProduct: (productCode: string) => request<{ status: string }>('/simulation/items', {
    method: 'POST',
    body: JSON.stringify({ productCode })
  }),
  simJam: () => request<{ status: string }>('/simulation/jam', { method: 'POST' }),
  simDisconnect: () => request<{ status: string }>('/simulation/plc-disconnect', { method: 'POST' }),
  simReset: () => request<{ simulation: string }>('/simulation/reset', { method: 'POST' }),
  simStartAuto: () => request<{ simulation: string }>('/simulation/start', { method: 'POST' }),
  simStopAuto: () => request<{ simulation: string }>('/simulation/stop', { method: 'POST' }),
};
