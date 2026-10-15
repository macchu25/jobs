import { create } from 'zustand';
import {
  ClassifierConfig,
  ClassificationRule,
  ColorThreshold,
  HistoryItem,
  LogMessage,
  DetectionResult,
} from '../types/classifier';
import { DEFAULT_CLASSIFIER_CONFIG } from '../utils/classifierDefaults';

interface CounterState {
  TOTAL: number;
  GATE_1: number;
  GATE_2: number;
  GATE_3: number;
  GATE_4: number;
  GATE_5: number;
  REJECT: number;
}

interface ClassifierStoreState {
  config: ClassifierConfig;
  counters: CounterState;
  history: HistoryItem[];
  logs: LogMessage[];
  cameraActive: boolean;
  plcStatus: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'SIMULATOR';
  fastMode: boolean;
  simMode: boolean;
  feedMode: 'webcam' | 'simulation' | 'upload' | 'python' | 'virtual';
  isDistrictModalOpen: boolean;

  // Live detection card values
  liveDetection: {
    qr_data: string;
    color: string;
    color_confidence: number;
    gate_id: number;
    plc_signal_value: number;
    rule_name: string;
  };

  // Actions
  setCameraActive: (active: boolean) => void;
  setPlcStatus: (status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'SIMULATOR') => void;
  setFastMode: (fast: boolean) => void;
  setSimMode: (sim: boolean) => void;
  setFeedMode: (mode: 'webcam' | 'simulation' | 'upload' | 'python' | 'virtual') => void;
  setCounters: (counters: Partial<CounterState>) => void;
  setIsDistrictModalOpen: (open: boolean) => void;

  updateColorConfig: (colorName: string, config: ColorThreshold) => void;
  updatePlcConfig: (plc: ClassifierConfig['plc']) => void;
  updateRules: (rules: ClassificationRule[]) => void;

  setLiveDetection: (data: Partial<ClassifierStoreState['liveDetection']>) => void;
  recordClassification: (detection: DetectionResult) => void;
  sendManualSignal: (val: number) => void;
  resetCounters: () => void;
  addLog: (level: 'INFO' | 'WARN' | 'ERROR', text: string) => void;
  clearLogs: () => void;
}

const STORAGE_KEY = 'hmi_classifier_config_v1';

function loadInitialConfig(): ClassifierConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_CLASSIFIER_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_CLASSIFIER_CONFIG;
}

function saveConfig(cfg: ClassifierConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

export const useClassifierStore = create<ClassifierStoreState>((set, get) => {
  const initialConfig = loadInitialConfig();

  // Create initial log message
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const initialLog: LogMessage = {
    id: 'log_init',
    time: timeStr,
    level: 'INFO',
    text: 'Hệ thống Phân loại Sản phẩm QR & Màu sắc đã sẵn sàng. Chế độ Mô phỏng PLC: BẬT.',
  };

  let lastTriggerTime = 0;

  return {
    config: initialConfig,
    counters: {
      TOTAL: 0,
      GATE_1: 0,
      GATE_2: 0,
      GATE_3: 0,
      GATE_4: 0,
      GATE_5: 0,
      REJECT: 0,
    },
    history: [],
    logs: [initialLog],
    cameraActive: true,
    plcStatus: 'SIMULATOR',
    fastMode: initialConfig.system.high_speed_conveyor_mode,
    simMode: initialConfig.plc.simulation_mode,
    feedMode: 'python', // Default to Python Live Stream from backend
    isDistrictModalOpen: false,

    liveDetection: {
      qr_data: 'N/A',
      color: 'UNKNOWN',
      color_confidence: 0,
      gate_id: 0,
      plc_signal_value: 0,
      rule_name: 'Đang chờ sản phẩm...',
    },

    setCameraActive: (active) => {
      set({ cameraActive: active });
      const t = new Date().toTimeString().split(' ')[0];
      get().addLog(
        active ? 'INFO' : 'WARN',
        active ? 'Đã khởi chạy luồng thu nạp hình ảnh.' : 'Đã dừng luồng thu nạp hình ảnh.'
      );
    },

    setPlcStatus: (status) => set({ plcStatus: status }),

    setFastMode: (fast) => {
      const { config } = get();
      const updated = {
        ...config,
        system: {
          ...config.system,
          high_speed_conveyor_mode: fast,
          detection_confidence_frames: fast ? 1 : 3,
        },
      };
      saveConfig(updated);
      set({ config: updated, fastMode: fast });
      get().addLog(
        'INFO',
        fast
          ? 'Đã BẬT Chế độ Băng Chuyền Siêu Tốc (Bắt tín hiệu tức thì 1-Frame, Cooldown 0.5s).'
          : 'Đã BẬT Chế độ Lọc Nhiễu (Yêu cầu 3-Frame ổn định).'
      );
    },

    setSimMode: (sim) => {
      const { config } = get();
      const updated = {
        ...config,
        plc: { ...config.plc, simulation_mode: sim },
      };
      saveConfig(updated);
      set({
        config: updated,
        simMode: sim,
        plcStatus: sim ? 'SIMULATOR' : 'ONLINE',
      });
      get().addLog(
        'INFO',
        sim
          ? 'Đã BẬT trình Giả lập PLC (PLC Simulator Mode).'
          : 'Đã chuyển sang kết nối PLC Thật (Hardware PLC Modbus TCP).'
      );
    },

    setFeedMode: (feedMode) => {
      set({ feedMode });
      get().addLog(
        'INFO',
        feedMode === 'python'
          ? 'Đã chuyển sang nguồn: Luồng Trực Tiếp từ Python OpenCV (Live Stream 30 FPS).'
          : feedMode === 'webcam'
          ? 'Đã chuyển sang nguồn: Webcam Trình Duyệt Web (Browser Webcam).'
          : feedMode === 'simulation'
          ? 'Đã chuyển sang nguồn: Mô Phỏng Băng Chuyền Ảo (Conveyor Simulator).'
          : 'Đã chuyển sang nguồn: Tải Ảnh / Video Kiểm Thử.'
      );
    },

    setCounters: (newCounters) => {
      set((state) => ({
        counters: { ...state.counters, ...newCounters },
      }));
    },

    setIsDistrictModalOpen: (open) => set({ isDistrictModalOpen: open }),

    updateColorConfig: (colorName, colorThreshold) => {
      const { config } = get();
      const updated = {
        ...config,
        colors: {
          ...config.colors,
          [colorName]: colorThreshold,
        },
      };
      saveConfig(updated);
      set({ config: updated });
      get().addLog('INFO', `Đã cập nhật cấu hình ngưỡng màu HSV cho [${colorName}].`);
    },

    updatePlcConfig: (plc) => {
      const { config } = get();
      const updated = { ...config, plc };
      saveConfig(updated);
      set({ config: updated });
      get().addLog('INFO', `Đã lưu cấu hình PLC Modbus TCP: IP=${plc.ip}, Port=${plc.port}`);
    },

    updateRules: (rules) => {
      const { config } = get();
      const updated = { ...config, rules };
      saveConfig(updated);
      set({ config: updated });
      get().addLog('INFO', `Đã cập nhật Bảng Quy tắc Phân loại (${rules.length} quy tắc).`);
    },

    setLiveDetection: (data) => {
      set((state) => ({
        liveDetection: { ...state.liveDetection, ...data },
      }));
    },

    recordClassification: (detection) => {
      const nowMs = Date.now();
      // Debounce cooldown 0.5s matching python logic
      if (nowMs - lastTriggerTime < 500) {
        return;
      }
      lastTriggerTime = nowMs;

      const { gate_id, qr_data, color, plc_signal_value } = detection;
      const t = new Date().toTimeString().split(' ')[0];

      // Update counters
      set((state) => {
        const counters = { ...state.counters };
        counters.TOTAL += 1;
        if (gate_id === 1) counters.GATE_1 += 1;
        else if (gate_id === 2) counters.GATE_2 += 1;
        else if (gate_id === 3) counters.GATE_3 += 1;
        else if (gate_id === 4) counters.GATE_4 += 1;
        else if (gate_id === 5) counters.GATE_5 += 1;
        else counters.REJECT += 1;

        const newHistoryItem: HistoryItem = {
          id: `hist_${nowMs}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: t,
          qr_data: qr_data || 'N/A',
          color: color || 'UNKNOWN',
          gate_id,
          plc_signal_value,
        };

        const updatedHistory = [newHistoryItem, ...state.history].slice(0, 50);

        return { counters, history: updatedHistory };
      });

      // Sync with HMI conveyor flow diverters
      try {
        import('./hmiStore').then(({ useHmiStore }) => {
          useHmiStore.getState().triggerGateSort(gate_id);
        });
      } catch {}

      // Simulated PLC Register Log
      const regAddr = get().config.plc.register_address;
      get().addLog(
        'INFO',
        `[QUÉT TỐC ĐỘ CAO] Phát hiện QR: ${qr_data} | Màu: ${color} -> Kích hoạt Cửa ${gate_id} (Sig: ${plc_signal_value})`
      );
      get().addLog(
        'INFO',
        `[SIMULATOR GIẢ LẬP] Đã ghi nhận Holding Register ${regAddr} = ${plc_signal_value}`
      );
    },

    sendManualSignal: (val) => {
      const reg = get().config.plc.register_address;
      get().addLog('INFO', `[Thủ công] Đã gửi tín hiệu ${val} tới PLC Holding Register ${reg}`);
      
      // Gửi tín hiệu xuống Backend Python / PLC
      fetch(`/api/trigger/${val}`, { method: 'POST' }).catch(() => {});

      try {
        import('./hmiStore').then(({ useHmiStore }) => {
          useHmiStore.getState().triggerGateSort(val);
        });
      } catch {}
    },

    resetCounters: () => {
      set({
        counters: {
          TOTAL: 0,
          GATE_1: 0,
          GATE_2: 0,
          GATE_3: 0,
          GATE_4: 0,
          GATE_5: 0,
          REJECT: 0,
        },
        history: [],
      });
      // Gửi lệnh reset xuống Backend Python
      fetch('/api/reset_counters', { method: 'POST' }).catch(() => {});
      get().addLog('INFO', 'Đã reset tất cả bộ đếm sản phẩm và danh sách lịch sử.');
    },

    addLog: (level, text) => {
      const t = new Date().toTimeString().split(' ')[0];
      const newLog: LogMessage = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        time: t,
        level,
        text,
      };
      set((state) => ({
        logs: [...state.logs, newLog].slice(-200), // Keep last 200 logs
      }));
    },

    clearLogs: () => {
      set({ logs: [] });
    },
  };
});
