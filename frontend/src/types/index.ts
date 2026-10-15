export interface MachineStatus {
  plcConnected: boolean;
  plcStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'ERROR';
  mode: 'simulation' | 'real';
  machineMode: 'AUTO' | 'MANUAL';
  machineState: 'IDLE' | 'RUNNING' | 'SORTING' | 'DISPENSING' | 'ALARM' | 'EMERGENCY STOP';
  conveyorRunning: boolean;
  emergencyStop: boolean;
  realWritesEnabled: boolean;
  activeAlarmCount: number;
  lastUpdate: string;
}

export interface Bin {
  id: string;
  name: string;
  productCode: string;
  productName: string;
  quantity: number;
  capacity: number;
  status: 'EMPTY' | 'LOW' | 'AVAILABLE' | 'FULL' | 'ERROR' | 'DISABLED';
  sensorActive: boolean;
  busy: boolean;
  pusherExtended: boolean;
  colorHex?: string;
  qrKeyword?: string;
  plcSignal?: number;
  gateNumber?: number;
  remaining?: number;
  fillPercent?: number;
}

export interface Sensor {
  id: string;
  name: string;
  active: boolean;
  updatedAt: string;
}

export interface Actuator {
  id: string;
  name: string;
  state: 'RETRACTED' | 'EXTENDED' | 'RUNNING' | 'STOPPED' | string;
  updatedAt: string;
}

export interface Alarm {
  id: string;
  code: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  source: string;
  active: boolean;
  acknowledged: boolean;
  createdAt: string;
  acknowledgedAt?: string;
  clearedAt?: string;
}

export interface Command {
  id: string;
  type: string;
  binId?: string;
  status: 'PENDING' | 'VALIDATING' | 'SENT_TO_PLC' | 'RUNNING' | 'WAITING_CONFIRMATION' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface EventLog {
  id: string;
  timestamp: string;
  eventType: string;
  source: string;
  binId?: string;
  product?: string;
  description: string;
  commandId?: string;
  result: string;
}

export interface SystemSnapshot {
  serverTime: string;
  plcStatus: string;
  mode: 'simulation' | 'real';
  machine: MachineStatus;
  conveyorRunning: boolean;
  bins: Bin[];
  sensors: Sensor[];
  actuators: Actuator[];
  alarms: Alarm[];
  activeCommands: Command[];
  serverUptimeSecs: number;
}

export interface PublicConfig {
  plcMode: string;
  plcProtocol: string;
  plcHost: string;
  plcPort: number;
  pollIntervalMs: number;
  enableRealPLCWrites: boolean;
  authEnabled: boolean;
  serverVersion: string;
  environment: string;
}

export interface User {
  id: string;
  username: string;
  role: 'VIEWER' | 'OPERATOR' | 'ADMIN';
}
