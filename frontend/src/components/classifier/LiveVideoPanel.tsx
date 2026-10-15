import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useClassifierStore } from '../../stores/classifierStore';
import {
  scanQrFromCanvas,
  detectColorInImageData,
  classifyProduct,
  removeAccents,
} from '../../utils/visionEngine';
import { DA_NANG_DISTRICTS } from '../../utils/classifierDefaults';
import QRCode from 'qrcode';
import {
  Play,
  Pause,
  RefreshCw,
  Upload,
  Maximize2,
  Video,
  VideoOff,
  Camera,
  Sparkles,
  AlertCircle,
  Volume2,
  VolumeX,
  Layers,
  ArrowRight,
  CheckCircle2,
  Cpu,
  MonitorPlay,
  Sliders,
} from 'lucide-react';

interface SimulatedParcel {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  colorName: 'RED' | 'GREEN' | 'BLUE' | 'YELLOW' | 'PURPLE' | 'ORANGE';
  hexColor: string;
  gateId: number;
  districtLabel: string;
  qrData: string;
  qrCanvas: HTMLCanvasElement | null;
  speed: number;
  status: 'moving' | 'pushing' | 'diverted';
  pushProgress: number; // 0 to 1
  divertY: number;
}

interface PusherState {
  gateId: number;
  extended: boolean;
  progress: number; // 0 to 1
}

function playScanBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // AudioContext blocked or unsupported
  }
}

export const LiveVideoPanel: React.FC = () => {
  const {
    config,
    cameraActive,
    setCameraActive,
    fastMode,
    feedMode,
    setFeedMode,
    liveDetection,
    setLiveDetection,
    recordClassification,
    addLog,
    counters,
  } = useClassifierStore();

  // Layout View Mode: 'dual' (Camera + Conveyor) | 'camera' | 'conveyor'
  const [viewMode, setViewMode] = useState<'dual' | 'camera' | 'conveyor'>('dual');

  // Canvases
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const conveyorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hidden Video & Upload refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sound effects
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Camera & Device states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isWebcamStreaming, setIsWebcamStreaming] = useState<boolean>(false);

  // Conveyor states
  const [conveyorRunning, setConveyorRunning] = useState<boolean>(true);
  const [autoDemoActive, setAutoDemoActive] = useState<boolean>(false);
  const [conveyorSpeed, setConveyorSpeed] = useState<number>(3.5);

  // Recent Scan Toast Notification
  const [recentNotification, setRecentNotification] = useState<{
    visible: boolean;
    title: string;
    gate: number;
    qr: string;
    time: number;
  }>({
    visible: false,
    title: '',
    gate: 0,
    qr: '',
    time: 0,
  });

  // Pre-generated QR canvases for Da Nang & sample districts
  const qrCanvasesRef = useRef<Record<string, HTMLCanvasElement>>({});

  // Dynamic QR cache for any scanned string
  const customQrCacheRef = useRef<Record<string, HTMLCanvasElement>>({});

  // Conveyor parcels buffer
  const parcelsRef = useRef<SimulatedParcel[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Pushers state (Gates 1, 2, 3, 4, 5, 99)
  const pushersRef = useRef<Record<number, PusherState>>({
    1: { gateId: 1, extended: false, progress: 0 },
    2: { gateId: 2, extended: false, progress: 0 },
    3: { gateId: 3, extended: false, progress: 0 },
    4: { gateId: 4, extended: false, progress: 0 },
    5: { gateId: 5, extended: false, progress: 0 },
    99: { gateId: 99, extended: false, progress: 0 },
  });

  // Anti-duplicate scan cooldown
  const lastScanTimestampRef = useRef<number>(0);
  const lastScannedQrRef = useRef<string | null>(null);

  // Virtual test camera animation state
  const virtualHandPosRef = useRef<number>(0);

  // 1. Pre-generate default QR canvases
  useEffect(() => {
    DA_NANG_DISTRICTS.forEach(async (d) => {
      try {
        const c = document.createElement('canvas');
        await QRCode.toCanvas(c, d.maps_url, {
          width: 90,
          margin: 1,
          errorCorrectionLevel: 'L',
        });
        qrCanvasesRef.current[d.id] = c;
      } catch (err) {
        console.error('QR pre-generation error:', err);
      }
    });
  }, []);

  // Helper to get or generate QR canvas for any string
  const getQrCanvas = useCallback(async (text: string): Promise<HTMLCanvasElement | null> => {
    if (!text) return null;
    if (customQrCacheRef.current[text]) {
      return customQrCacheRef.current[text];
    }
    try {
      const c = document.createElement('canvas');
      await QRCode.toCanvas(c, text, {
        width: 80,
        margin: 1,
        errorCorrectionLevel: 'L',
      });
      customQrCacheRef.current[text] = c;
      return c;
    } catch {
      return null;
    }
  }, []);

  // 2. Enumerate video devices
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      });
    }
  }, []);

  // 3. Start / Stop Webcam Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    if (feedMode === 'webcam' && cameraActive) {
      const startCamera = async () => {
        try {
          const constraints: MediaStreamConstraints = {
            video: selectedDeviceId
              ? {
                  deviceId: { exact: selectedDeviceId },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                }
              : {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: 'user',
                },
          };

          const s = await navigator.mediaDevices.getUserMedia(constraints);
          if (isCancelled) {
            s.getTracks().forEach((t) => t.stop());
            return;
          }
          stream = s;
          setCameraError(null);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(() => {});
              setIsWebcamStreaming(true);
            };
          }
          addLog('INFO', 'Đã mở Webcam trình duyệt thành công (30 FPS).');
        } catch (err: any) {
          // Fallback to basic { video: true }
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (isCancelled) {
              fallbackStream.getTracks().forEach((t) => t.stop());
              return;
            }
            stream = fallbackStream;
            setCameraError(null);
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play().catch(() => {});
                setIsWebcamStreaming(true);
              };
            }
            addLog('INFO', 'Đã mở Webcam ở chế độ tiêu chuẩn.');
          } catch (retryErr: any) {
            console.warn('Webcam not available:', retryErr);
            setCameraError(
              'Không tìm thấy webcam phần cứng. Bạn có thể chọn "Camera Ảo Test" hoặc "Băng Chuyền Test" để thử nghiệm ngay!'
            );
            setIsWebcamStreaming(false);
            addLog('WARN', 'Không tìm thấy Webcam phần cứng. Đã chuyển sang chế độ dự phòng.');
          }
        }
      };

      startCamera();
    } else {
      setIsWebcamStreaming(false);
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [feedMode, cameraActive, selectedDeviceId]);

  // Color helper for gates
  const getGateColor = (gateId: number): { hex: string; name: 'RED' | 'GREEN' | 'BLUE' | 'YELLOW' | 'PURPLE' | 'ORANGE' } => {
    switch (gateId) {
      case 1:
        return { hex: '#FF3B30', name: 'RED' };
      case 2:
        return { hex: '#34C759', name: 'GREEN' };
      case 3:
        return { hex: '#007AFF', name: 'BLUE' };
      case 4:
        return { hex: '#FF9500', name: 'ORANGE' };
      case 5:
        return { hex: '#AF52DE', name: 'PURPLE' };
      default:
        return { hex: '#FF453A', name: 'RED' };
    }
  };

  // 4. CORE ACTION: Trigger new parcel from camera scan or manual button
  // "Kiểu camera nó quét được là hiện qr mô phỏng lên lun"
  const spawnParcelOnConveyor = useCallback(
    async (params: {
      qrData: string;
      districtLabel: string;
      gateId: number;
      colorHex?: string;
      colorName?: 'RED' | 'GREEN' | 'BLUE' | 'YELLOW' | 'PURPLE' | 'ORANGE';
    }) => {
      const { qrData, districtLabel, gateId } = params;
      const colorInfo = getGateColor(gateId);
      const hexColor = params.colorHex || colorInfo.hex;
      const colorName = params.colorName || colorInfo.name;

      // Get or generate QR canvas
      const qrCanvas = await getQrCanvas(qrData);

      const newParcel: SimulatedParcel = {
        id: `parcel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        x: 40, // Spawn at infeed scanner entrance
        y: 85,
        w: 92,
        h: 76,
        colorName,
        hexColor,
        gateId,
        districtLabel,
        qrData,
        qrCanvas,
        speed: conveyorSpeed,
        status: 'moving',
        pushProgress: 0,
        divertY: 0,
      };

      parcelsRef.current.push(newParcel);

      // Play sound
      if (soundEnabled) {
        playScanBeep();
      }

      // Show notification badge
      setRecentNotification({
        visible: true,
        title: districtLabel,
        gate: gateId,
        qr: qrData,
        time: Date.now(),
      });

      // Update store
      recordClassification({
        qr_data: qrData,
        color: colorName,
        color_confidence: 98,
        gate_id: gateId,
        plc_signal_value: gateId,
        rule_name: `Cửa ${gateId} - ${districtLabel}`,
        timestamp: new Date().toTimeString().split(' ')[0],
      });

      addLog('INFO', `[CAMERA QUÉT THÀNH CÔNG] -> Nhận diện "${districtLabel}" -> Đẩy vào Cửa ${gateId}`);
    },
    [conveyorSpeed, soundEnabled, getQrCanvas, recordClassification, addLog]
  );

  // 5. Handle Live Camera Detection (from jsQR or Color)
  const handleLiveCameraDetection = useCallback(
    (qrData: string | null, domColor: string, conf: number) => {
      if (!qrData && domColor === 'UNKNOWN') return;

      const classification = classifyProduct(
        qrData,
        domColor,
        config.rules,
        config.default_rule
      );

      setLiveDetection({
        qr_data: qrData ? qrData : 'Không có QR',
        color: domColor !== 'UNKNOWN' ? domColor : 'UNKNOWN',
        color_confidence: conf,
        gate_id: classification.gate_id,
        plc_signal_value: classification.plc_signal_value,
        rule_name: classification.rule_name,
      });

      const now = Date.now();
      const isNewQr = qrData && qrData !== lastScannedQrRef.current;
      const cooldownPassed = now - lastScanTimestampRef.current > 2000;

      if ((isNewQr || cooldownPassed) && (qrData || classification.gate_id > 0)) {
        lastScanTimestampRef.current = now;
        lastScannedQrRef.current = qrData;

        // Determine district name
        let districtLabel = classification.rule_name || `Cửa ${classification.gate_id}`;
        if (qrData) {
          const matchedDistrict = DA_NANG_DISTRICTS.find(
            (d) => qrData.includes(d.id) || qrData.includes(d.code)
          );
          if (matchedDistrict) {
            districtLabel = matchedDistrict.name;
          }
        }

        spawnParcelOnConveyor({
          qrData: qrData || `COLOR_${domColor}`,
          districtLabel,
          gateId: classification.gate_id || 99,
        });
      }
    },
    [config.rules, config.default_rule, setLiveDetection, spawnParcelOnConveyor]
  );

  // 6. MAIN ANIMATION & RENDERING LOOP
  useEffect(() => {
    let lastDemoSpawn = Date.now();

    const loop = () => {
      // -------------------------------------------------------------
      // PART A: CAMERA CANVAS RENDERING & VISION PROCESSING
      // -------------------------------------------------------------
      const camCanvas = cameraCanvasRef.current;
      if (camCanvas) {
        const ctx = camCanvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const cw = camCanvas.width;
          const ch = camCanvas.height;

          // Clear background
          ctx.fillStyle = '#090A0F';
          ctx.fillRect(0, 0, cw, ch);

          if (!cameraActive) {
            // Standby screen
            ctx.fillStyle = '#10121A';
            ctx.fillRect(0, 0, cw, ch);
            ctx.fillStyle = '#64748B';
            ctx.font = 'bold 15px Segoe UI, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('CAMERA ĐANG TẮT (STANDBY)', cw / 2, ch / 2 - 15);
            ctx.font = '12px Segoe UI, sans-serif';
            ctx.fillText('Nhấn nút "BẬT CAMERA NGAY" để kích hoạt luồng nhận diện.', cw / 2, ch / 2 + 15);
          } else if (feedMode === 'webcam') {
            if (isWebcamStreaming && videoRef.current && videoRef.current.readyState >= 2) {
              // Mirror webcam view
              ctx.save();
              ctx.translate(cw, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(videoRef.current, 0, 0, cw, ch);
              ctx.restore();
            } else {
              // Waiting for webcam / error
              ctx.fillStyle = '#0F1117';
              ctx.fillRect(0, 0, cw, ch);
              ctx.fillStyle = '#E2E8F0';
              ctx.font = 'bold 14px Segoe UI, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(cameraError || 'Đang kết nối Webcam máy tính...', cw / 2, ch / 2 - 10);
              ctx.fillStyle = '#94A3B8';
              ctx.font = '11px Segoe UI, sans-serif';
              ctx.fillText('Nếu trình duyệt hỏi quyền truy cập, vui lòng chọn Cho Phép (Allow).', cw / 2, ch / 2 + 15);
            }
          } else if (feedMode === 'virtual') {
            // Virtual animated test camera: Renders a realistic camera feed with animated hands holding QR codes!
            ctx.fillStyle = '#1A1D24';
            ctx.fillRect(0, 0, cw, ch);

            // Grid background to mimic inspection table
            ctx.strokeStyle = '#282D37';
            ctx.lineWidth = 1;
            for (let gx = 0; gx < cw; gx += 40) {
              ctx.beginPath();
              ctx.moveTo(gx, 0);
              ctx.lineTo(gx, ch);
              ctx.stroke();
            }
            for (let gy = 0; gy < ch; gy += 40) {
              ctx.beginPath();
              ctx.moveTo(0, gy);
              ctx.lineTo(cw, gy);
              ctx.stroke();
            }

            // Move virtual test parcel in front of lens
            virtualHandPosRef.current += 0.025;
            const cycle = Math.sin(virtualHandPosRef.current);
            const parcelX = cw / 2 + cycle * (cw * 0.28) - 60;
            const parcelY = ch / 2 - 60 + Math.cos(virtualHandPosRef.current * 2) * 15;

            // Select district based on cycle
            const distIdx = Math.floor(Math.abs(cycle) * DA_NANG_DISTRICTS.length) % DA_NANG_DISTRICTS.length;
            const dist = DA_NANG_DISTRICTS[distIdx];

            // Draw simulated carton box
            ctx.fillStyle = dist.color || '#3B82F6';
            ctx.fillRect(parcelX, parcelY, 120, 120);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(parcelX, parcelY, 120, 120);

            // Draw white QR sticker
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(parcelX + 15, parcelY + 15, 90, 90);
            const qCanvas = qrCanvasesRef.current[dist.id];
            if (qCanvas) {
              ctx.drawImage(qCanvas, parcelX + 20, parcelY + 20, 80, 80);
            }

            // Label
            ctx.fillStyle = '#00E5FF';
            ctx.font = 'bold 11px Segoe UI, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('CAMERA ẢO TEST (VIRTUAL DEMO STREAM)', cw / 2, 25);
          } else if (feedMode === 'upload') {
            // Upload mode canvas is drawn via file input event
          }

          // --- ROI SCANNER OVERLAY & DETECTION ---
          if (cameraActive && feedMode !== 'python') {
            const rx = cw * 0.2;
            const ry = ch * 0.16;
            const rw = cw * 0.6;
            const rh = ch * 0.68;
            const roi: [number, number, number, number] = [rx, ry, rw, rh];

            // 1. Scan QR Code
            const qrRes = scanQrFromCanvas(ctx, cw, ch, roi);
            const qrData = qrRes.data;

            // 2. Color Detection
            const colorRes = detectColorInImageData(
              ctx,
              cw,
              ch,
              roi,
              config.colors,
              config.system.min_color_ratio
            );
            const domColor = colorRes.dominantColor;
            const conf = colorRes.confidence;

            // 3. Trigger callback if detected
            handleLiveCameraDetection(qrData, domColor, conf);

            // --- DRAW HUD OVERLAYS ---
            // Draw ROI Box with neon industrial aesthetics
            ctx.save();
            ctx.strokeStyle = qrData ? '#10B981' : '#00E5FF';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.strokeRect(rx, ry, rw, rh);

            // Corner brackets
            ctx.setLineDash([]);
            ctx.lineWidth = 4;
            const cLen = 22;
            // Top-left
            ctx.beginPath();
            ctx.moveTo(rx, ry + cLen);
            ctx.lineTo(rx, ry);
            ctx.lineTo(rx + cLen, ry);
            ctx.stroke();
            // Top-right
            ctx.beginPath();
            ctx.moveTo(rx + rw - cLen, ry);
            ctx.lineTo(rx + rw, ry);
            ctx.lineTo(rx + rw, ry + cLen);
            ctx.stroke();
            // Bottom-left
            ctx.beginPath();
            ctx.moveTo(rx, ry + rh - cLen);
            ctx.lineTo(rx, ry + rh);
            ctx.lineTo(rx + cLen, ry + rh);
            ctx.stroke();
            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(rx + rw - cLen, ry + rh);
            ctx.lineTo(rx + rw, ry + rh);
            ctx.lineTo(rx + rw, ry + rh - cLen);
            ctx.stroke();

            // ROI Label
            ctx.fillStyle = qrData ? '#10B981' : '#00E5FF';
            ctx.font = 'bold 11px Segoe UI, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(
              qrData ? '✓ ĐÃ PHÁT HIỆN MÃ QR TRONG KHUNG' : 'VÙNG QUÉT SẢN PHẨM (ROI DETECTION ZONE)',
              rx + 6,
              ry - 8
            );

            // Highlight QR bounding box if detected
            if (qrRes.location) {
              ctx.strokeStyle = '#10B981';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(qrRes.location.topLeft.x, qrRes.location.topLeft.y);
              ctx.lineTo(qrRes.location.topRight.x, qrRes.location.topRight.y);
              ctx.lineTo(qrRes.location.bottomRight.x, qrRes.location.bottomRight.y);
              ctx.lineTo(qrRes.location.bottomLeft.x, qrRes.location.bottomLeft.y);
              ctx.closePath();
              ctx.stroke();
            }

            ctx.restore();
          }
        }
      }

      // -------------------------------------------------------------
      // PART B: CONVEYOR DIGITAL TWIN SIMULATION CANVAS
      // -------------------------------------------------------------
      const cvCanvas = conveyorCanvasRef.current;
      if (cvCanvas) {
        const ctx = cvCanvas.getContext('2d');
        if (ctx) {
          const vw = cvCanvas.width;
          const vh = cvCanvas.height;

          // Clear conveyor background
          ctx.fillStyle = '#0B0D13';
          ctx.fillRect(0, 0, vw, vh);

          // Conveyor belt geometry
          const beltY = 110;
          const beltH = 120;

          // Metal frame borders
          ctx.fillStyle = '#161922';
          ctx.fillRect(0, beltY - 10, vw, beltH + 20);
          ctx.strokeStyle = '#272B38';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, beltY - 10, vw, beltH + 20);

          // Moving belt surface
          ctx.fillStyle = '#101219';
          ctx.fillRect(0, beltY, vw, beltH);

          // Moving belt slats / rollers
          if (conveyorRunning) {
            const slatOffset = (Date.now() / 15) % 36;
            ctx.fillStyle = '#1E2330';
            for (let sx = -40 + slatOffset; sx < vw; sx += 36) {
              ctx.fillRect(sx, beltY, 4, beltH);
            }
          }

          // Safety yellow guide rails
          ctx.fillStyle = '#EAB308';
          ctx.fillRect(0, beltY - 5, vw, 3);
          ctx.fillRect(0, beltY + beltH + 2, vw, 3);

          // Optical Scanner Beam at entrance (x = 100)
          ctx.save();
          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(95, beltY - 30);
          ctx.lineTo(95, beltY + beltH + 30);
          ctx.stroke();

          // Scanner Arch
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(75, beltY - 45, 40, 18);
          ctx.fillStyle = '#00E5FF';
          ctx.font = 'bold 9px Segoe UI, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SCANNER', 95, beltY - 32);

          // Scanning laser pulse
          const laserPulse = (Date.now() / 400) % 1;
          ctx.fillStyle = `rgba(0, 229, 255, ${0.15 + laserPulse * 0.2})`;
          ctx.fillRect(80, beltY, 30, beltH);
          ctx.restore();

          // Gate locations along the conveyor:
          // Gate 1: x=240, Gate 2: x=380, Gate 3: x=520, Gate 4: x=660, Gate 5: x=800, Gate 99: x=940
          const gatePositions: Record<number, number> = {
            1: 240,
            2: 380,
            3: 520,
            4: 660,
            5: 800,
            99: 940,
          };

          const gateNames: Record<number, string> = {
            1: 'CỬA 1 - HẢI CHÂU',
            2: 'CỬA 2 - THANH KHÊ',
            3: 'CỬA 3 - LIÊN CHIỂU',
            4: 'CỬA 4 - NGŨ HÀNH SƠN',
            5: 'CỬA 5 - CẨM LỆ',
            99: 'CỬA LOẠI (REJECT)',
          };

          const gateColors: Record<number, string> = {
            1: '#FF3B30',
            2: '#34C759',
            3: '#007AFF',
            4: '#FF9500',
            5: '#AF52DE',
            99: '#FF453A',
          };

          // Draw Gates & Bins along bottom
          Object.entries(gatePositions).forEach(([gIdStr, gx]) => {
            const gid = parseInt(gIdStr);
            const gColor = gateColors[gid] || '#64748B';
            const gName = gateNames[gid] || `CỬA ${gid}`;
            const pusher = pushersRef.current[gid];

            // Chute / Diverter Ramp
            ctx.fillStyle = '#141722';
            ctx.fillRect(gx - 35, beltY + beltH + 5, 70, 75);
            ctx.strokeStyle = gColor;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(gx - 35, beltY + beltH + 5, 70, 75);

            // Gate Label & LED
            ctx.fillStyle = pusher?.extended ? '#10B981' : gColor;
            ctx.beginPath();
            ctx.arc(gx, beltY + beltH + 18, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = 'bold 9px Segoe UI, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#F8FAFC';
            ctx.fillText(`CỬA ${gid === 99 ? 'LỖI' : gid}`, gx, beltY + beltH + 34);

            // Bin Count from Store
            const binCount =
              gid === 1
                ? counters.GATE_1
                : gid === 2
                ? counters.GATE_2
                : gid === 3
                ? counters.GATE_3
                : gid === 4
                ? counters.GATE_4
                : gid === 5
                ? counters.GATE_5
                : counters.REJECT;

            ctx.fillStyle = '#94A3B8';
            ctx.font = '10px Segoe UI, sans-serif';
            ctx.fillText(`${binCount} Kiện`, gx, beltY + beltH + 52);

            // Pusher Actuator Cylinder
            const pProg = pusher ? pusher.progress : 0;
            const cylinderH = 26;
            const extensionLen = pProg * 45; // moves down across the belt

            ctx.fillStyle = '#334155';
            ctx.fillRect(gx - 22, beltY - 32, 44, cylinderH);
            ctx.fillStyle = '#94A3B8';
            ctx.fillRect(gx - 8, beltY - 32 + cylinderH, 16, 8 + extensionLen);
            ctx.fillStyle = pusher?.extended ? '#EAB308' : '#64748B';
            ctx.fillRect(gx - 28, beltY - 32 + cylinderH + 8 + extensionLen, 56, 7);
          });

          // Update Pushers Progress
          Object.values(pushersRef.current).forEach((p) => {
            if (p.extended) {
              p.progress = Math.min(1, p.progress + 0.15);
              if (p.progress >= 1) {
                setTimeout(() => {
                  p.extended = false;
                }, 160);
              }
            } else {
              p.progress = Math.max(0, p.progress - 0.12);
            }
          });

          // Auto Demo Spawner (every 4 seconds if toggled)
          if (autoDemoActive && Date.now() - lastDemoSpawn > 3800) {
            const randomDist = DA_NANG_DISTRICTS[Math.floor(Math.random() * DA_NANG_DISTRICTS.length)];
            spawnParcelOnConveyor({
              qrData: randomDist.maps_url,
              districtLabel: randomDist.name,
              gateId: randomDist.gate,
            });
            lastDemoSpawn = Date.now();
          }

          // Move and Render Parcels on Conveyor
          parcelsRef.current.forEach((parcel) => {
            const targetX = gatePositions[parcel.gateId] || gatePositions[99];

            if (conveyorRunning && parcel.status === 'moving') {
              parcel.x += parcel.speed;

              // Check if parcel reached target gate pusher
              if (parcel.x >= targetX - 10 && parcel.x <= targetX + 35) {
                parcel.status = 'pushing';
                const p = pushersRef.current[parcel.gateId];
                if (p) {
                  p.extended = true;
                }
              }
            } else if (parcel.status === 'pushing') {
              parcel.pushProgress += 0.08;
              parcel.divertY = parcel.pushProgress * 65;
              if (parcel.pushProgress >= 1) {
                parcel.status = 'diverted';
              }
            }

            // Draw Parcel Body
            const px = parcel.x;
            const py = parcel.y + parcel.divertY;

            // Parcel Drop Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(px + 6, py + 8, parcel.w, parcel.h);

            // Main Carton Body with gate color accent
            ctx.fillStyle = parcel.hexColor;
            ctx.fillRect(px, py, parcel.w, parcel.h);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px, py, parcel.w, parcel.h);

            // Parcel packing tape
            ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
            ctx.fillRect(px, py + parcel.h * 0.44, parcel.w, 12);

            // White QR Sticker Decal
            const stickerW = 50;
            const stickerH = 50;
            const sx = px + (parcel.w - stickerW) / 2;
            const sy = py + 8;

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(sx, sy, stickerW, stickerH);

            if (parcel.qrCanvas) {
              ctx.drawImage(parcel.qrCanvas, sx + 2, sy + 2, stickerW - 4, stickerH - 4);
            }

            // Decal Gate Tag
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 8px Segoe UI, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
              `CỬA ${parcel.gateId === 99 ? 'LỖI' : parcel.gateId}`,
              px + parcel.w / 2,
              py + parcel.h - 5
            );
          });

          // Clean up diverted parcels that left the chute
          parcelsRef.current = parcelsRef.current.filter((p) => p.divertY < 75 && p.x < vw + 80);
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    cameraActive,
    feedMode,
    isWebcamStreaming,
    cameraError,
    conveyorRunning,
    autoDemoActive,
    config,
    counters,
    handleLiveCameraDetection,
    spawnParcelOnConveyor,
  ]);

  // Handle uploaded test image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = cameraCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          addLog('INFO', `Đã tải ảnh kiểm thử: ${file.name}`);
        }
      }
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. TOP TOOLBAR & CONTROLS */}
      <div className="bg-[#141722] border border-[#232838] rounded-3xl p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Left: Master Camera Power Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCameraActive(!cameraActive)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md ${
              cameraActive
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-2 ring-emerald-400/40'
                : 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
            }`}
          >
            {cameraActive ? (
              <>
                <Video className="w-4 h-4 fill-current" />
                <span>CAMERA: ĐANG BẬT</span>
              </>
            ) : (
              <>
                <VideoOff className="w-4 h-4" />
                <span>BẬT CAMERA NGAY</span>
              </>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs transition-colors border ${
              soundEnabled
                ? 'bg-slate-800 text-[#00E5FF] border-[#2D3748]'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? 'Tắt âm thanh quét' : 'Bật âm thanh quét'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* Center: View Layout Switcher (Song Song | Chỉ Camera | Chỉ Băng Chuyền) */}
        <div className="flex items-center gap-1 bg-[#0B0D13] p-1 rounded-2xl border border-[#232838]">
          <button
            type="button"
            onClick={() => setViewMode('dual')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'dual'
                ? 'bg-[#00E5FF] text-black shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Song Song (Dual View)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('camera')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'camera'
                ? 'bg-[#00E5FF] text-black shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Chỉ Xem Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('conveyor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'conveyor'
                ? 'bg-[#D4F63D] text-black shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chỉ Băng Chuyền</span>
          </button>
        </div>

        {/* Right: Camera Source Selector */}
        <div className="flex items-center gap-1 bg-[#0B0D13] p-1 rounded-2xl border border-[#232838] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setFeedMode('webcam');
              setCameraActive(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              feedMode === 'webcam'
                ? 'bg-emerald-400 text-black font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Webcam Máy</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFeedMode('virtual');
              setCameraActive(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              feedMode === 'virtual'
                ? 'bg-[#00E5FF] text-black font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>Camera Ảo Test</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFeedMode('python');
              setCameraActive(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              feedMode === 'python'
                ? 'bg-purple-500 text-white font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🐍 Luồng Python</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFeedMode('upload');
              fileInputRef.current?.click();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              feedMode === 'upload'
                ? 'bg-amber-400 text-black font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải Ảnh QR</span>
          </button>
        </div>
      </div>

      {/* 2. RECENT DETECTION BANNER (When camera scans a code) */}
      {recentNotification.visible && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-3 px-5 flex items-center justify-between text-xs text-emerald-400 font-bold animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              CAMERA VỪA QUÉT THÀNH CÔNG: <strong>{recentNotification.title}</strong> &rarr; TỰ ĐỘNG ĐẨY VÀO{' '}
              <strong>CỬA {recentNotification.gate}</strong> TRÊN BĂNG CHUYỀN
            </span>
          </div>
          <span className="font-mono text-[11px] text-emerald-500 hidden sm:inline">Mã: {recentNotification.qr}</span>
        </div>
      )}

      {/* 3. DUAL-VIEW WORKSPACE: 1 BÊN CAMERA + 1 BÊN BĂNG CHUYỀN */}
      <div
        className={`grid gap-4 sm:gap-6 items-stretch ${
          viewMode === 'dual'
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1'
        }`}
      >
        {/* ========================================================================= */}
        {/* PANEL TRÁI: CAMERA TRỰC TIẾP (LIVE AI SCANNER)                            */}
        {/* ========================================================================= */}
        {(viewMode === 'dual' || viewMode === 'camera') && (
          <div className="flex flex-col bg-[#141722] border border-[#232838] rounded-3xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-3 sm:px-4 bg-[#10121A] border-b border-[#232838] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white text-xs sm:text-sm font-black tracking-wider uppercase">
                  BÊN 1: CAMERA AI (QUÉT MÃ QR & MÀU SẮC)
                </span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                {feedMode === 'webcam'
                  ? 'Webcam 1280x720'
                  : feedMode === 'virtual'
                  ? 'Virtual Test Stream'
                  : feedMode === 'python'
                  ? 'OpenCV MJPEG'
                  : 'Image Upload'}
              </span>
            </div>

            {/* Video Viewport Container */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
              {feedMode === 'python' ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src="/api/video_feed"
                    alt="Python OpenCV Video Stream"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                      const fb = document.getElementById('py-stream-error');
                      if (fb) fb.style.display = 'flex';
                    }}
                  />
                  <div
                    id="py-stream-error"
                    style={{ display: 'none' }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-[#0E0E12] text-slate-400 gap-2"
                  >
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <span className="text-white font-bold text-sm">Chưa kết nối luồng Python (Port 8080)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedMode('webcam');
                        setCameraActive(true);
                      }}
                      className="mt-2 px-4 py-2 rounded-xl bg-[#00E5FF] text-black text-xs font-black cursor-pointer"
                    >
                      Bật Webcam Trình Duyệt Ngay
                    </button>
                  </div>
                </div>
              ) : (
                <canvas
                  ref={cameraCanvasRef}
                  width={1280}
                  height={720}
                  className="w-full h-full object-contain"
                />
              )}

              {/* Guide hint when camera is active */}
              {cameraActive && (
                <div className="absolute bottom-2.5 left-2.5 px-3 py-1 bg-black/75 backdrop-blur border border-white/10 rounded-xl text-[11px] text-slate-300">
                  🎯 Đưa mã QR hoặc vật phẩm vào giữa khung chữ nhật để quét
                </div>
              )}
            </div>

            {/* Device selector if multiple webcams */}
            {feedMode === 'webcam' && availableDevices.length > 1 && (
              <div className="p-2.5 bg-[#0F1118] border-t border-[#232838] flex items-center justify-between text-xs">
                <span className="text-slate-400">Chọn Webcam:</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="bg-[#1C202C] text-white text-xs px-2.5 py-1 rounded-lg border border-[#30374A] outline-none"
                >
                  {availableDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera #${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PANEL PHẢI: MÔ PHỎNG DÂY CHUYỀN BĂNG TẢI (DIGITAL TWIN CONVEYOR)          */}
        {/* ========================================================================= */}
        {(viewMode === 'dual' || viewMode === 'conveyor') && (
          <div className="flex flex-col bg-[#141722] border border-[#232838] rounded-3xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-3 sm:px-4 bg-[#10121A] border-b border-[#232838] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4F63D] animate-pulse" />
                <span className="text-white text-xs sm:text-sm font-black tracking-wider uppercase">
                  BÊN 2: BĂNG CHUYỀN MÔ PHỎNG (5 CỬA PLC & REJECT)
                </span>
              </div>

              {/* Conveyor controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConveyorRunning(!conveyorRunning)}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-bold bg-[#1C202C] px-2.5 py-1 rounded-lg border border-[#2E3547]"
                >
                  {conveyorRunning ? (
                    <>
                      <Pause className="w-3 h-3 text-amber-400" />
                      <span>Dừng</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-emerald-400" />
                      <span>Chạy</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAutoDemoActive(!autoDemoActive)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 ${
                    autoDemoActive
                      ? 'bg-[#D4F63D] text-black border-[#D4F63D]'
                      : 'bg-[#1C202C] text-slate-400 border-[#2E3547] hover:text-white'
                  }`}
                  title="Tự động tạo kiện hàng định kỳ để xem băng chuyền chạy"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Demo Tự Động</span>
                </button>
              </div>
            </div>

            {/* Conveyor Canvas Viewport */}
            <div className="relative aspect-video w-full bg-[#0B0D13] flex items-center justify-center overflow-hidden">
              <canvas
                ref={conveyorCanvasRef}
                width={1080}
                height={607}
                className="w-full h-full object-contain"
              />

              {/* Status overlay */}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/75 backdrop-blur border border-white/10 rounded-lg text-[10px] text-slate-300 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>BĂNG CHUYỀN 60 FPS • DIGITAL TWIN</span>
              </div>
            </div>

            {/* QUICK TEST ACTION BUTTONS (Click to simulate scanning without physical item) */}
            <div className="p-3 sm:p-4 bg-[#0F1118] border-t border-[#232838] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-slate-400">
                  ⚡ Bấm Thử Quét Nhanh (Kiểm tra phản ứng Cửa Băng Chuyền):
                </span>
                <span className="text-[10px] text-slate-500">Mô phỏng tức thì</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    spawnParcelOnConveyor({
                      qrData: 'https://maps.google.com/?q=Hai+Chau+Da+Nang#DISTRICT_HAI_CHAU',
                      districtLabel: 'Quận Hải Châu',
                      gateId: 1,
                    })
                  }
                  className="px-2.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/35 text-red-400 border border-red-500/30 text-xs font-bold transition-all text-center"
                >
                  Cửa 1 (Hải Châu)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    spawnParcelOnConveyor({
                      qrData: 'https://maps.google.com/?q=Thanh+Khe+Da+Nang#DISTRICT_THANH_KHE',
                      districtLabel: 'Quận Thanh Khê',
                      gateId: 2,
                    })
                  }
                  className="px-2.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all text-center"
                >
                  Cửa 2 (Thanh Khê)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    spawnParcelOnConveyor({
                      qrData: 'https://maps.google.com/?q=Lien+Chieu+Da+Nang#DISTRICT_LIEN_CHIEU',
                      districtLabel: 'Quận Liên Chiểu',
                      gateId: 3,
                    })
                  }
                  className="px-2.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 text-blue-400 border border-blue-500/30 text-xs font-bold transition-all text-center"
                >
                  Cửa 3 (Liên Chiểu)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    spawnParcelOnConveyor({
                      qrData: 'https://maps.google.com/?q=Ngu+Hanh+Son+Da+Nang#DISTRICT_NGU_HANH_SON',
                      districtLabel: 'Q. Ngũ Hành Sơn',
                      gateId: 4,
                    })
                  }
                  className="px-2.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all text-center"
                >
                  Cửa 4 (N.H.Sơn)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    spawnParcelOnConveyor({
                      qrData: 'https://maps.google.com/?q=Cam+Le+Da+Nang#DISTRICT_CAM_LE',
                      districtLabel: 'Quận Cẩm Lệ',
                      gateId: 5,
                    })
                  }
                  className="px-2.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-purple-400 border border-purple-500/30 text-xs font-bold transition-all text-center"
                >
                  Cửa 5 (Cẩm Lệ)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    spawnParcelOnConveyor({
                      qrData: 'UNKNOWN_REJECT_PARCEL',
                      districtLabel: 'Hàng Lỗi / Không QR',
                      gateId: 99,
                    })
                  }
                  className="px-2.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all text-center"
                >
                  Cửa Loại (Reject)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. REALTIME DETECTION METRICS BAR (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Mã QR */}
        <div className="bg-[#141722] border border-[#232838] rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
          <span className="text-[#94A3B8] text-xs font-bold tracking-wider uppercase">
            MÃ QR HIỆN TẠI
          </span>
          <span
            className="text-[#00E5FF] font-bold text-sm sm:text-base break-words mt-1"
            title={liveDetection.qr_data}
          >
            {liveDetection.qr_data}
          </span>
        </div>

        {/* Card 2: Màu sắc */}
        <div className="bg-[#141722] border border-[#232838] rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
          <span className="text-[#94A3B8] text-xs font-bold tracking-wider uppercase">
            MÀU SẮC NHẬN DIỆN
          </span>
          <span className="text-[#FFCC00] font-bold text-sm sm:text-base break-words mt-1">
            {liveDetection.color}{' '}
            {liveDetection.color_confidence > 0 && `(${liveDetection.color_confidence}%)`}
          </span>
        </div>

        {/* Card 3: Cửa phân loại */}
        <div className="bg-[#141722] border border-[#232838] rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
          <span className="text-[#94A3B8] text-xs font-bold tracking-wider uppercase">
            CỬA ĐIỀU HƯỚNG PLC
          </span>
          <span className="text-[#34C759] font-bold text-sm sm:text-base break-words mt-1">
            {liveDetection.gate_id > 0
              ? `CỬA ${liveDetection.gate_id} (Tín hiệu Modbus: ${liveDetection.plc_signal_value})`
              : 'CHỜ SẢN PHẨM'}
          </span>
        </div>
      </div>

      {/* Hidden Native Video Element for Webcam decoding (Never use display: none) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 640,
          height: 480,
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* Hidden File Input for QR Image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};
