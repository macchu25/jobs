import { create } from 'zustand';
import { Bin, MachineStatus, Sensor, Actuator, Alarm, Command, PublicConfig, SystemSnapshot } from '../types';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

interface HmiState {
  wsConnected: boolean;
  lastUpdate: string | null;
  machine: MachineStatus;
  bins: Bin[];
  sensors: Sensor[];
  actuators: Actuator[];
  alarms: Alarm[];
  activeCommands: Command[];
  config: PublicConfig | null;
  toasts: Toast[];
  isMobileSidebarOpen: boolean;

  // Actions
  setMobileSidebarOpen: (open: boolean) => void;
  setWsConnected: (connected: boolean) => void;
  applySnapshot: (snapshot: SystemSnapshot) => void;
  updateMachine: (status: MachineStatus) => void;
  updatePLCStatus: (connected: boolean, status: MachineStatus['plcStatus']) => void;
  updateConveyor: (running: boolean) => void;
  updateBin: (bin: Bin) => void;
  updateBins: (bins: Bin[]) => void;
  addBin: (bin: Bin) => void;
  deleteBin: (binId: string) => void;
  resetBinQuantity: (binId: string) => void;
  restoreDefaultBins: () => void;
  triggerGateSort: (gateId: number) => void;
  updateSensor: (sensor: Sensor) => void;
  updateActuator: (actuator: Actuator) => void;
  addAlarm: (alarm: Alarm) => void;
  updateAlarm: (alarm: Alarm) => void;
  clearAlarm: (alarm: Alarm) => void;
  addCommand: (cmd: Command) => void;
  updateCommand: (cmd: Command) => void;
  setConfig: (config: PublicConfig) => void;
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

const initialMachineStatus: MachineStatus = {
  plcConnected: true,
  plcStatus: 'CONNECTED',
  mode: 'simulation',
  machineMode: 'AUTO',
  machineState: 'RUNNING',
  conveyorRunning: true,
  emergencyStop: false,
  realWritesEnabled: true,
  activeAlarmCount: 0,
  lastUpdate: new Date().toISOString(),
};

export const DEFAULT_DA_NANG_BINS: Bin[] = [
  {
    id: 'GATE_1',
    gateNumber: 1,
    name: 'Cửa 1 - Q. Hải Châu',
    productCode: 'DISTRICT_HAI_CHAU',
    productName: 'Quận Hải Châu (Màu Đỏ)',
    colorHex: '#FF3B30',
    plcSignal: 1,
    qrKeyword: 'HAI_CHAU',
    quantity: 0,
    capacity: 100,
    status: 'AVAILABLE',
    sensorActive: false,
    busy: false,
    pusherExtended: false,
  },
  {
    id: 'GATE_2',
    gateNumber: 2,
    name: 'Cửa 2 - Q. Thanh Khê',
    productCode: 'DISTRICT_THANH_KHE',
    productName: 'Quận Thanh Khê (Màu Xanh lá)',
    colorHex: '#34C759',
    plcSignal: 2,
    qrKeyword: 'THANH_KHE',
    quantity: 0,
    capacity: 100,
    status: 'AVAILABLE',
    sensorActive: false,
    busy: false,
    pusherExtended: false,
  },
  {
    id: 'GATE_3',
    gateNumber: 3,
    name: 'Cửa 3 - Q. Liên Chiểu',
    productCode: 'DISTRICT_LIEN_CHIEU',
    productName: 'Quận Liên Chiểu (Màu Xanh dương)',
    colorHex: '#007AFF',
    plcSignal: 3,
    qrKeyword: 'LIEN_CHIEU',
    quantity: 0,
    capacity: 100,
    status: 'AVAILABLE',
    sensorActive: false,
    busy: false,
    pusherExtended: false,
  },
  {
    id: 'GATE_4',
    gateNumber: 4,
    name: 'Cửa 4 - Q. Ngũ Hành Sơn',
    productCode: 'DISTRICT_NGU_HANH_SON',
    productName: 'Quận Ngũ Hành Sơn (Màu Cam)',
    colorHex: '#FF9500',
    plcSignal: 4,
    qrKeyword: 'NGU_HANH_SON',
    quantity: 0,
    capacity: 100,
    status: 'AVAILABLE',
    sensorActive: false,
    busy: false,
    pusherExtended: false,
  },
  {
    id: 'GATE_5',
    gateNumber: 5,
    name: 'Cửa 5 - Q. Cẩm Lệ',
    productCode: 'DISTRICT_CAM_LE',
    productName: 'Quận Cẩm Lệ (Màu Tím)',
    colorHex: '#AF52DE',
    plcSignal: 5,
    qrKeyword: 'CAM_LE',
    quantity: 0,
    capacity: 100,
    status: 'AVAILABLE',
    sensorActive: false,
    busy: false,
    pusherExtended: false,
  },
  {
    id: 'GATE_REJECT',
    gateNumber: 99,
    name: 'Cửa Loại - Reject',
    productCode: 'REJECT',
    productName: 'Sản Phẩm Lỗi / Không QR (Sig: 99)',
    colorHex: '#FF453A',
    plcSignal: 99,
    qrKeyword: 'NONE',
    quantity: 0,
    capacity: 100,
    status: 'AVAILABLE',
    sensorActive: false,
    busy: false,
    pusherExtended: false,
  },
];

export const DEFAULT_SENSORS: Sensor[] = [
  { id: 'input_sensor', name: 'Infeed Presence Sensor', active: false, updatedAt: new Date().toISOString() },
  { id: 'output_sensor', name: 'Outfeed Presence Sensor', active: false, updatedAt: new Date().toISOString() },
];

export const useHmiStore = create<HmiState>((set, get) => ({
  wsConnected: true,
  lastUpdate: null,
  machine: initialMachineStatus,
  bins: DEFAULT_DA_NANG_BINS,
  sensors: DEFAULT_SENSORS,
  actuators: [],
  alarms: [],
  activeCommands: [],
  config: null,
  toasts: [],
  isMobileSidebarOpen: false,

  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),

  setWsConnected: (connected) =>
    set({
      wsConnected: connected,
      lastUpdate: new Date().toLocaleTimeString(),
    }),

  applySnapshot: (snap) =>
    set({
      machine: snap.machine,
      bins: snap.bins && snap.bins.length > 0 ? snap.bins : get().bins,
      sensors: snap.sensors && snap.sensors.length > 0 ? snap.sensors : get().sensors,
      actuators: snap.actuators || [],
      alarms: snap.alarms || [],
      activeCommands: snap.activeCommands || [],
      lastUpdate: new Date().toLocaleTimeString(),
    }),

  updateMachine: (status) =>
    set({
      machine: status,
      lastUpdate: new Date().toLocaleTimeString(),
    }),

  updatePLCStatus: (connected, status) =>
    set((state) => ({
      machine: {
        ...state.machine,
        plcConnected: connected,
        plcStatus: status,
        lastUpdate: new Date().toISOString(),
      },
      lastUpdate: new Date().toLocaleTimeString(),
    })),

  updateConveyor: (running) =>
    set((state) => ({
      machine: {
        ...state.machine,
        conveyorRunning: running,
        machineState: running ? 'RUNNING' : 'IDLE',
        lastUpdate: new Date().toISOString(),
      },
      lastUpdate: new Date().toLocaleTimeString(),
    })),

  updateBin: (updatedBin) =>
    set((state) => ({
      bins: state.bins.map((b) => (b.id === updatedBin.id ? { ...b, ...updatedBin } : b)),
      lastUpdate: new Date().toLocaleTimeString(),
    })),

  updateBins: (bins) =>
    set({
      bins,
      lastUpdate: new Date().toLocaleTimeString(),
    }),

  addBin: (newBin) =>
    set((state) => ({
      bins: [...state.bins.filter((b) => b.id !== newBin.id), newBin],
      lastUpdate: new Date().toLocaleTimeString(),
    })),

  deleteBin: (binId) =>
    set((state) => ({
      bins: state.bins.filter((b) => b.id !== binId),
      lastUpdate: new Date().toLocaleTimeString(),
    })),

  resetBinQuantity: (binId) =>
    set((state) => ({
      bins: state.bins.map((b) => (b.id === binId ? { ...b, quantity: 0, status: 'AVAILABLE' } : b)),
      lastUpdate: new Date().toLocaleTimeString(),
    })),

  restoreDefaultBins: () =>
    set({
      bins: DEFAULT_DA_NANG_BINS,
      lastUpdate: new Date().toLocaleTimeString(),
    }),

  triggerGateSort: (gateId) => {
    // Map gateId (1..5, 99) to bin index or id
    let targetId = 'GATE_REJECT';
    if (gateId >= 1 && gateId <= 5) {
      targetId = `GATE_${gateId}`;
    }

    // 1. Activate infeed sensor and extend pusher on corresponding gate
    set((state) => ({
      sensors: state.sensors.map((s) =>
        s.id === 'input_sensor' ? { ...s, active: true } : s
      ),
      bins: state.bins.map((b) =>
        b.id === targetId
          ? {
              ...b,
              quantity: b.quantity + 1,
              sensorActive: true,
              pusherExtended: true,
              busy: true,
            }
          : b
      ),
      machine: {
        ...state.machine,
        conveyorRunning: true,
        machineState: 'SORTING',
      },
    }));

    // 2. Retract pusher after 1.2s and reset sensors
    setTimeout(() => {
      set((state) => ({
        sensors: state.sensors.map((s) => ({ ...s, active: false })),
        bins: state.bins.map((b) =>
          b.id === targetId
            ? {
                ...b,
                sensorActive: false,
                pusherExtended: false,
                busy: false,
              }
            : b
        ),
        machine: {
          ...state.machine,
          machineState: 'RUNNING',
        },
      }));
    }, 1200);
  },

  updateSensor: (sensor) =>
    set((state) => ({
      sensors: state.sensors.map((s) => (s.id === sensor.id ? sensor : s)),
      lastUpdate: new Date().toLocaleTimeString(),
    })),

  updateActuator: (actuator) =>
    set((state) => ({
      actuators: state.actuators.map((a) => (a.id === actuator.id ? actuator : a)),
      lastUpdate: new Date().toLocaleTimeString(),
    })),

  addAlarm: (alarm) =>
    set((state) => {
      if (state.alarms.some((a) => a.id === alarm.id)) return state;
      return {
        alarms: [alarm, ...state.alarms],
        machine: {
          ...state.machine,
          activeAlarmCount: state.machine.activeAlarmCount + (alarm.active ? 1 : 0),
        },
      };
    }),

  updateAlarm: (alarm) =>
    set((state) => ({
      alarms: state.alarms.map((a) => (a.id === alarm.id ? alarm : a)),
      machine: {
        ...state.machine,
        activeAlarmCount: state.alarms.filter((a) => a.active).length,
      },
    })),

  clearAlarm: (alarm) =>
    set((state) => {
      const updated = state.alarms.filter((a) => a.id !== alarm.id);
      return {
        alarms: updated,
        machine: {
          ...state.machine,
          activeAlarmCount: updated.filter((a) => a.active).length,
        },
      };
    }),

  addCommand: (cmd) =>
    set((state) => ({
      activeCommands: [cmd, ...state.activeCommands],
    })),

  updateCommand: (cmd) =>
    set((state) => ({
      activeCommands: state.activeCommands.map((c) => (c.id === cmd.id ? cmd : c)),
    })),

  setConfig: (config) => set({ config }),

  addToast: (type, message) => {
    const toast: Toast = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: Date.now(),
    };
    set((state) => ({ toasts: [...state.toasts, toast] }));
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
