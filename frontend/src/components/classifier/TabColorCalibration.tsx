import React, { useState, useEffect } from 'react';
import { useClassifierStore } from '../../stores/classifierStore';
import { Save, Check } from 'lucide-react';

export const TabColorCalibration: React.FC = () => {
  const { config, updateColorConfig, addLog } = useClassifierStore();

  const [selectedColor, setSelectedColor] = useState<string>('RED');
  const [hMin, setHMin] = useState<number>(0);
  const [hMax, setHMax] = useState<number>(29);
  const [sMin, setSMin] = useState<number>(150);
  const [sMax, setSMax] = useState<number>(255);
  const [vMin, setVMin] = useState<number>(80);
  const [vMax, setVMax] = useState<number>(255);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  // Sync sliders when selectedColor changes
  useEffect(() => {
    const cCfg = config.colors[selectedColor];
    if (cCfg) {
      setHMin(cCfg.lower1[0]);
      setHMax(cCfg.upper1[0]);
      setSMin(cCfg.lower1[1]);
      setSMax(cCfg.upper1[1]);
      setVMin(cCfg.lower1[2]);
      setVMax(cCfg.upper1[2]);
    }
  }, [selectedColor, config.colors]);

  const handleSliderChange = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    val: number,
    param: 'hMin' | 'hMax' | 'sMin' | 'sMax' | 'vMin' | 'vMax'
  ) => {
    setter(val);

    const curr = config.colors[selectedColor] || {
      lower1: [0, 0, 0],
      upper1: [180, 255, 255],
      display_color: '#FFFFFF',
    };

    const newHMin = param === 'hMin' ? val : hMin;
    const newHMax = param === 'hMax' ? val : hMax;
    const newSMin = param === 'sMin' ? val : sMin;
    const newSMax = param === 'sMax' ? val : sMax;
    const newVMin = param === 'vMin' ? val : vMin;
    const newVMax = param === 'vMax' ? val : vMax;

    updateColorConfig(selectedColor, {
      ...curr,
      lower1: [newHMin, newSMin, newVMin],
      upper1: [newHMax, newSMax, newVMax],
    });
  };

  const handleSave = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
    addLog('INFO', `Đã lưu cài đặt ngưỡng màu HSV mới cho [${selectedColor}].`);
  };

  // Convert Hue (0-180 in OpenCV) to CSS HSL Hue (0-360)
  const previewHue = ((hMin + hMax) / 2) * 2;
  const previewSat = Math.round(((sMin + sMax) / (2 * 255)) * 100);
  const previewLight = Math.round(((vMin + vMax) / (2 * 255)) * 50);

  return (
    <div className="flex flex-col gap-4">
      {/* Selector */}
      <div className="flex items-center gap-3 bg-[#1A1A1E] border border-[#2D2D35] rounded-lg p-3">
        <label className="text-[#E0E0E0] text-sm font-bold whitespace-nowrap">
          Chọn màu tinh chỉnh:
        </label>
        <select
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          className="qt-select flex-1 font-bold text-[#00E5FF] cursor-pointer"
        >
          <option value="RED">RED (Màu Đỏ)</option>
          <option value="GREEN">GREEN (Màu Xanh lá)</option>
          <option value="BLUE">BLUE (Màu Xanh dương)</option>
          <option value="YELLOW">YELLOW (Màu Vàng)</option>
        </select>
      </div>

      {/* HSV Sliders Group */}
      <div className="qt-groupbox bg-[#1A1A1E] border border-[#2D2D35] rounded-lg p-3 pt-5 relative">
        <span className="qt-groupbox-title-card">
          Ngưỡng HSV (Hue, Saturation, Value)
        </span>

        {/* Live Color Swatch Banner */}
        <div className="mb-4 flex items-center justify-between p-2 rounded bg-[#121214] border border-[#2D2D35]">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded border border-white/20 shadow-inner"
              style={{
                backgroundColor: `hsl(${previewHue}, ${previewSat}%, ${previewLight}%)`,
              }}
            />
            <div>
              <div className="text-xs font-bold text-[#E0E0E0]">
                Mẫu phổ màu ước tính
              </div>
              <div className="text-[11px] text-[#AAAAAA] font-mono">
                H: {hMin}-{hMax} | S: {sMin}-{sMax} | V: {vMin}-{vMax}
              </div>
            </div>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded font-bold"
            style={{
              backgroundColor: config.colors[selectedColor]?.display_color || '#2196F3',
              color: '#FFFFFF',
            }}
          >
            {selectedColor}
          </span>
        </div>

        <div className="space-y-3.5 text-xs sm:text-sm">
          {/* Hue Min */}
          <div>
            <div className="flex justify-between text-[#AAAAAA] mb-1 font-semibold">
              <span>Hue Min (0 - 180):</span>
              <span className="font-mono text-[#00E5FF] font-bold">{hMin}</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              value={hMin}
              onChange={(e) =>
                handleSliderChange(setHMin, parseInt(e.target.value, 10), 'hMin')
              }
              className="w-full h-1.5 bg-[#25252B] rounded-lg cursor-pointer"
            />
          </div>

          {/* Hue Max */}
          <div>
            <div className="flex justify-between text-[#AAAAAA] mb-1 font-semibold">
              <span>Hue Max (0 - 180):</span>
              <span className="font-mono text-[#00E5FF] font-bold">{hMax}</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              value={hMax}
              onChange={(e) =>
                handleSliderChange(setHMax, parseInt(e.target.value, 10), 'hMax')
              }
              className="w-full h-1.5 bg-[#25252B] rounded-lg cursor-pointer"
            />
          </div>

          {/* Sat Min */}
          <div>
            <div className="flex justify-between text-[#AAAAAA] mb-1 font-semibold">
              <span>Sat Min (0 - 255):</span>
              <span className="font-mono text-[#00E5FF] font-bold">{sMin}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={sMin}
              onChange={(e) =>
                handleSliderChange(setSMin, parseInt(e.target.value, 10), 'sMin')
              }
              className="w-full h-1.5 bg-[#25252B] rounded-lg cursor-pointer"
            />
          </div>

          {/* Sat Max */}
          <div>
            <div className="flex justify-between text-[#AAAAAA] mb-1 font-semibold">
              <span>Sat Max (0 - 255):</span>
              <span className="font-mono text-[#00E5FF] font-bold">{sMax}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={sMax}
              onChange={(e) =>
                handleSliderChange(setSMax, parseInt(e.target.value, 10), 'sMax')
              }
              className="w-full h-1.5 bg-[#25252B] rounded-lg cursor-pointer"
            />
          </div>

          {/* Val Min */}
          <div>
            <div className="flex justify-between text-[#AAAAAA] mb-1 font-semibold">
              <span>Val Min (0 - 255):</span>
              <span className="font-mono text-[#00E5FF] font-bold">{vMin}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={vMin}
              onChange={(e) =>
                handleSliderChange(setVMin, parseInt(e.target.value, 10), 'vMin')
              }
              className="w-full h-1.5 bg-[#25252B] rounded-lg cursor-pointer"
            />
          </div>

          {/* Val Max */}
          <div>
            <div className="flex justify-between text-[#AAAAAA] mb-1 font-semibold">
              <span>Val Max (0 - 255):</span>
              <span className="font-mono text-[#00E5FF] font-bold">{vMax}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={vMax}
              onChange={(e) =>
                handleSliderChange(setVMax, parseInt(e.target.value, 10), 'vMax')
              }
              className="w-full h-1.5 bg-[#25252B] rounded-lg cursor-pointer"
            />
          </div>

          {/* Save Button */}
          <div className="pt-3">
            <button
              onClick={handleSave}
              className="qt-btn qt-btn-success w-full py-2 flex items-center justify-center gap-2"
            >
              {showSavedToast ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{showSavedToast ? 'Đã Lưu Thành Công!' : 'Lưu Ngưỡng HSV Này'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
