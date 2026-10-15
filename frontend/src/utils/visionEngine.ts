import jsQR from 'jsqr';
import { ColorThreshold, ClassificationRule, DefaultRule, DetectionResult } from '../types/classifier';

export function removeAccents(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toUpperCase();
}

/**
 * Converts RGB [0..255] to OpenCV-compatible HSV:
 * H in [0..180], S in [0..255], V in [0..255]
 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 30); // 360 / 6 = 60 deg, in OpenCV H is 0..180 so multiply by 30
    if (h < 0) h += 180;
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 255);
  const v = Math.round(max * 255);

  return [h, s, v];
}

export interface ColorAnalysisResult {
  dominantColor: string;
  confidence: number;
  colorScores: Record<string, number>;
  colorBox: { x: number; y: number; w: number; h: number } | null;
}

/**
 * Analyzes color within ROI using HSV thresholds matching python OpenCV logic
 */
export function detectColorInImageData(
  ctx: CanvasRenderingContext2D,
  frameWidth: number,
  frameHeight: number,
  roiBox: [number, number, number, number],
  colorsConfig: Record<string, ColorThreshold>,
  minRatio: number = 0.04
): ColorAnalysisResult {
  const [rx, ry, rw, rh] = roiBox;
  const safeX = Math.max(0, Math.min(frameWidth - 1, Math.round(rx)));
  const safeY = Math.max(0, Math.min(frameHeight - 1, Math.round(ry)));
  const safeW = Math.max(1, Math.min(frameWidth - safeX, Math.round(rw)));
  const safeH = Math.max(1, Math.min(frameHeight - safeY, Math.round(rh)));

  const imgData = ctx.getImageData(safeX, safeY, safeW, safeH);
  const data = imgData.data;
  const totalPixels = safeW * safeH;

  const matches: Record<string, { count: number; minX: number; minY: number; maxX: number; maxY: number }> = {};
  for (const cName of Object.keys(colorsConfig)) {
    matches[cName] = { count: 0, minX: safeW, minY: safeH, maxX: 0, maxY: 0 };
  }

  // Sample every 2nd pixel for blazing performance on 60fps canvas while retaining precision
  const step = 2;
  let sampledPixels = 0;

  for (let y = 0; y < safeH; y += step) {
    for (let x = 0; x < safeW; x += step) {
      sampledPixels++;
      const idx = (y * safeW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const [h, s, v] = rgbToHsv(r, g, b);

      // Evaluate each configured color
      for (const [cName, cfg] of Object.entries(colorsConfig)) {
        const [lh1, ls1, lv1] = cfg.lower1;
        const [uh1, us1, uv1] = cfg.upper1;

        let isMatch = h >= lh1 && h <= uh1 && s >= ls1 && s <= us1 && v >= lv1 && v <= uv1;

        if (!isMatch && cfg.lower2 && cfg.upper2) {
          const [lh2, ls2, lv2] = cfg.lower2;
          const [uh2, us2, uv2] = cfg.upper2;
          isMatch = h >= lh2 && h <= uh2 && s >= ls2 && s <= us2 && v >= lv2 && v <= uv2;
        }

        if (isMatch) {
          const m = matches[cName];
          m.count++;
          if (x < m.minX) m.minX = x;
          if (x > m.maxX) m.maxX = x;
          if (y < m.minY) m.minY = y;
          if (y > m.maxY) m.maxY = y;
        }
      }
    }
  }

  let bestColor = 'UNKNOWN';
  let maxRatio = 0;
  const colorScores: Record<string, number> = {};
  let bestBox: { x: number; y: number; w: number; h: number } | null = null;

  for (const [cName, m] of Object.entries(matches)) {
    const ratio = sampledPixels > 0 ? m.count / sampledPixels : 0;
    colorScores[cName] = Math.round(ratio * 100);

    if (ratio >= minRatio && ratio > maxRatio) {
      maxRatio = ratio;
      bestColor = cName;
      if (m.maxX >= m.minX && m.maxY >= m.minY) {
        bestBox = {
          x: safeX + m.minX,
          y: safeY + m.minY,
          w: Math.max(20, m.maxX - m.minX),
          h: Math.max(20, m.maxY - m.minY),
        };
      }
    }
  }

  return {
    dominantColor: bestColor,
    confidence: Math.round(maxRatio * 1000) / 10,
    colorScores,
    colorBox: bestBox,
  };
}

export interface QrScanResult {
  data: string | null;
  location: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
  } | null;
}

/**
 * Multi-pass QR Scanner using jsQR:
 * 1. Scans ROI center
 * 2. Scans full frame if ROI had no QR
 */
export function scanQrFromCanvas(
  ctx: CanvasRenderingContext2D,
  frameWidth: number,
  frameHeight: number,
  roiBox?: [number, number, number, number]
): QrScanResult {
  // Pass 1: Scan full frame
  try {
    const fullImg = ctx.getImageData(0, 0, frameWidth, frameHeight);
    const code = jsQR(fullImg.data, fullImg.width, fullImg.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data && code.data.trim()) {
      return {
        data: code.data.trim(),
        location: {
          topLeft: code.location.topLeftCorner,
          topRight: code.location.topRightCorner,
          bottomRight: code.location.bottomRightCorner,
          bottomLeft: code.location.bottomLeftCorner,
        },
      };
    }
  } catch {
    // Canvas security or boundary exception
  }

  return { data: null, location: null };
}

/**
 * Classifies a product based on QR content and Color, exactly following
 * the Python camera_thread.py _classify_product logic!
 */
export function classifyProduct(
  qrData: string | null,
  colorName: string,
  rules: ClassificationRule[],
  defaultRule: DefaultRule
): {
  matched: boolean;
  rule_name: string;
  gate_id: number;
  plc_signal_value: number;
  color: string;
  qr_data: string;
} {
  const cleanQr = qrData
    ? removeAccents(qrData).replace(/\+/g, '_').replace(/\s+/g, '_')
    : '';

  // Pass 1: Match fixed QR keyword in rules
  if (cleanQr) {
    for (const rule of rules) {
      const reqQr = removeAccents(rule.qr_contains).replace(/\+/g, '_').replace(/\s+/g, '_');
      if (reqQr && cleanQr.includes(reqQr)) {
        return {
          matched: true,
          rule_name: rule.name,
          gate_id: rule.gate_id,
          plc_signal_value: rule.plc_signal_value,
          color: colorName,
          qr_data: qrData || 'N/A',
        };
      }
    }

    // Pass 1.5: Dynamic GATE extracted from Web QR generator (e.g. GATE_1, GATE_2)
    const gateMatch = cleanQr.match(/GATE[_\-]?(\d+)/);
    if (gateMatch) {
      const extractedGate = parseInt(gateMatch[1], 10);
      return {
        matched: true,
        rule_name: `Định Tuyến Tự Động Web -> Cửa ${extractedGate}`,
        gate_id: extractedGate,
        plc_signal_value: extractedGate,
        color: colorName,
        qr_data: qrData || 'N/A',
      };
    }
  }

  // Pass 2: Fallback to Color Rule if QR is missing or unrecognized
  if (colorName && colorName !== 'UNKNOWN') {
    for (const rule of rules) {
      if (rule.color && rule.color.toUpperCase() === colorName.toUpperCase()) {
        return {
          matched: true,
          rule_name: `${rule.name} (Nhận diện theo Màu)`,
          gate_id: rule.gate_id,
          plc_signal_value: rule.plc_signal_value,
          color: colorName,
          qr_data: qrData || 'NONE',
        };
      }
    }
  }

  // Pass 3: Reject gate
  return {
    matched: false,
    rule_name: defaultRule.name,
    gate_id: defaultRule.gate_id,
    plc_signal_value: defaultRule.plc_signal_value,
    color: colorName,
    qr_data: qrData || 'NONE',
  };
}
