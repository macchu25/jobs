import { useHmiStore } from '../stores/hmiStore';
import { useClassifierStore } from '../stores/classifierStore';
import { apiService } from './api';

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 10000;
  private isIntentionallyClosed = false;

  public connect() {
    this.isIntentionallyClosed = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use current host automatically (supports LAN IP e.g. 192.168.1.100:8080 or localhost:5173 via proxy)
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        useHmiStore.getState().setWsConnected(true);
        this.reconnectDelay = 1000;
        // Also fetch snapshot as backup guarantee
        apiService.getStatus().then((snap) => {
          useHmiStore.getState().applySnapshot(snap);
        }).catch(() => {});
      };

      this.socket.onmessage = (event) => {
        try {
          const lines = event.data.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            const data = JSON.parse(line);
            this.handleMessage(data.event, data.payload);
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      this.socket.onclose = () => {
        useHmiStore.getState().setWsConnected(false);
        this.socket = null;
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[WS] Error:', err);
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch (e) {
      console.error('[WS] Connection init error:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  public disconnect() {
    this.isIntentionallyClosed = true;
    clearTimeout(this.reconnectTimeout);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    useHmiStore.getState().setWsConnected(false);
  }

  private handleMessage(event: string, payload: any) {
    const store = useHmiStore.getState();

    switch (event) {
      case 'snapshot':
        store.applySnapshot(payload);
        break;
      case 'plc_status':
        store.updatePLCStatus(payload.connected, payload.status);
        break;
      case 'machine_state':
        store.updateMachine(payload);
        break;
      case 'bin_updated':
        store.updateBin(payload);
        break;
      case 'inventory_updated':
        store.updateBins(payload);
        break;
      case 'sensor_updated':
        store.updateSensor(payload);
        break;
      case 'actuator_updated':
        store.updateActuator(payload);
        break;
      case 'conveyor_updated':
        store.updateConveyor(payload.running);
        break;
      case 'command_created':
        store.addCommand(payload);
        store.addToast('info', `Command ${payload.type} queued`);
        break;
      case 'command_updated':
        store.updateCommand(payload);
        break;
      case 'command_completed':
        store.updateCommand(payload);
        store.addToast('success', `Command ${payload.type} completed successfully`);
        break;
      case 'command_failed':
        store.updateCommand(payload);
        store.addToast('error', `Command failed: ${payload.errorMessage || payload.errorCode}`);
        break;
      case 'alarm_created':
        store.addAlarm(payload);
        if (payload.severity === 'CRITICAL' || payload.severity === 'ERROR') {
          store.addToast('error', `ALARM: ${payload.message}`);
        }
        break;
      case 'alarm_updated':
        store.updateAlarm(payload);
        break;
      case 'alarm_cleared':
        store.clearAlarm(payload);
        break;
      case 'detection': {
        const clsStore = useClassifierStore.getState();
        clsStore.setLiveDetection(payload);
        clsStore.recordClassification({
          qr_data: payload.qr_data || 'N/A',
          color: payload.color || 'UNKNOWN',
          color_confidence: payload.color_confidence || 95,
          gate_id: payload.gate_id || 0,
          plc_signal_value: payload.plc_signal_value || 0,
          rule_name: payload.rule_name || 'N/A',
          timestamp: payload.timestamp || new Date().toTimeString().split(' ')[0],
        });
        break;
      }
      case 'counters': {
        useClassifierStore.getState().setCounters(payload);
        break;
      }
      case 'log': {
        useClassifierStore.getState().addLog(payload.level || 'INFO', payload.message);
        break;
      }
      case 'mode_changed':
        store.addToast('info', `Mode changed to ${payload.mode.toUpperCase()}`);
        break;
      default:
        break;
    }
  }
}

export const wsService = new WebSocketService();
