export interface ColorThreshold {
  lower1: [number, number, number];
  upper1: [number, number, number];
  lower2?: [number, number, number];
  upper2?: [number, number, number];
  display_color: string;
}

export interface ClassificationRule {
  id?: string;
  name: string;
  qr_contains: string;
  color: string;
  gate_id: number;
  plc_signal_value: number;
}

export interface DefaultRule {
  name: string;
  gate_id: number;
  plc_signal_value: number;
}

export interface ClassifierConfig {
  camera: {
    device_index: number;
    width: number;
    height: number;
    fps: number;
  };
  plc: {
    ip: string;
    port: number;
    slave_id: number;
    register_address: number;
    simulation_mode: boolean;
    auto_reconnect: boolean;
    reconnect_interval: number;
  };
  colors: Record<string, ColorThreshold>;
  rules: ClassificationRule[];
  default_rule: DefaultRule;
  system: {
    detection_confidence_frames: number;
    high_speed_conveyor_mode: boolean;
    min_color_ratio: number;
    roi_box: [number, number, number, number]; // [x, y, w, h]
  };
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  qr_data: string;
  color: string;
  gate_id: number;
  plc_signal_value: number;
}

export interface LogMessage {
  id: string;
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  text: string;
}

export interface DetectionResult {
  qr_data: string;
  color: string;
  color_confidence: number;
  gate_id: number;
  plc_signal_value: number;
  rule_name: string;
  timestamp: string;
}

export interface DistrictQrItem {
  id: string;
  name: string;
  province?: string;
  region?: 'NORTH' | 'CENTRAL' | 'SOUTH' | 'CUSTOM';
  label_ascii: string;
  code: string;
  maps_url: string;
  gate: number;
  color: string;
  description: string;
  streetAddress?: string;
}

