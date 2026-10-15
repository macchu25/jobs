import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ALL_VIETNAM_DISTRICTS, VIETNAM_PROVINCES } from '../../utils/classifierDefaults';
import { DistrictQrItem } from '../../types/classifier';
import { useClassifierStore } from '../../stores/classifierStore';
import { Download, Printer, ExternalLink, QrCode, MapPin, Sparkles, Plus, Search } from 'lucide-react';

export const TabQrGenerator: React.FC = () => {
  const { addLog } = useClassifierStore();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DANANG' | 'HANOI' | 'HCMC' | 'CUSTOM'>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictQrItem>(ALL_VIETNAM_DISTRICTS[0]);

  // Custom Province / District state
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customProvince, setCustomProvince] = useState('Đà Nẵng');
  const [customDistrict, setCustomDistrict] = useState('');
  const [streetAddress, setStreetAddress] = useState<string>('123 Bạch Đằng');
  const [gateNumber, setGateNumber] = useState<number>(1);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [stampDataUrl, setStampDataUrl] = useState<string>('');

  // Filtered districts list
  const filteredDistricts = ALL_VIETNAM_DISTRICTS.filter((d) => {
    if (activeFilter === 'DANANG') return d.province === 'Đà Nẵng';
    if (activeFilter === 'HANOI') return d.province === 'Hà Nội';
    if (activeFilter === 'HCMC') return d.province === 'TP. Hồ Chí Minh';
    return true;
  });

  const activeProvinceName = isCustomMode ? customProvince : (selectedDistrict.province || 'Đà Nẵng');
  const activeDistrictName = isCustomMode ? (customDistrict || 'Khu Vực Mới') : selectedDistrict.name;
  const activeCode = isCustomMode
    ? `PROV_${customProvince.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${(customDistrict || 'DIST').toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
    : selectedDistrict.code;

  // Constructed Google Maps URL (Dual-purpose: Phone opens Maps, Vision AI reads GATE & Code)
  const fullAddress = `${streetAddress ? streetAddress + ', ' : ''}${activeDistrictName}, ${activeProvinceName}`;
  const constructedUrl = `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}#${activeCode}_GATE_${gateNumber}`;

  useEffect(() => {
    if (!isCustomMode) {
      setGateNumber(selectedDistrict.gate);
    }
  }, [selectedDistrict, isCustomMode]);

  // Generate QR Code and Stamp Card
  useEffect(() => {
    const generateStamp = async () => {
      try {
        // 1. Generate QR Code Data URL
        const qrUrl = await QRCode.toDataURL(constructedUrl, {
          width: 260,
          margin: 1,
          errorCorrectionLevel: 'L',
        });
        setQrDataUrl(qrUrl);

        // 2. Generate Stamp Decal on Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 390;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // White card background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Border
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Load QR image onto stamp
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 20, 15, 260, 260);

          // Title (Province & District)
          ctx.fillStyle = '#111827';
          ctx.font = 'bold 17px Segoe UI, Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`${activeDistrictName.toUpperCase()} - ${activeProvinceName.toUpperCase()}`, 150, 298);

          // Subtext (Gate & Code)
          ctx.fillStyle = '#1D4ED8';
          ctx.font = 'bold 13px Segoe UI, Arial';
          ctx.fillText(`CỬA PLC: ${gateNumber} | ${activeCode}`, 150, 322);

          // Hint
          ctx.fillStyle = '#4B5563';
          ctx.font = '11px Segoe UI, Arial';
          ctx.fillText('Quét ĐT -> Mở Google Maps vị trí', 150, 344);

          // Address if present
          if (streetAddress) {
            ctx.fillStyle = '#6B7280';
            ctx.font = 'italic 10px Segoe UI, Arial';
            ctx.fillText(streetAddress, 150, 365);
          }

          setStampDataUrl(canvas.toDataURL('image/png'));
        };
        img.src = qrUrl;
      } catch (err: any) {
        console.error('Error generating QR:', err);
      }
    };

    generateStamp();
  }, [constructedUrl, activeDistrictName, activeProvinceName, activeCode, streetAddress, gateNumber]);

  const handleDownloadStamp = () => {
    if (!stampDataUrl) return;
    const link = document.createElement('a');
    link.download = `tem_qr_${activeProvinceName}_${activeDistrictName}_cua_${gateNumber}.png`;
    link.href = stampDataUrl;
    link.click();
    addLog('INFO', `Đã tải về tem QR: ${link.download}`);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>In Tem QR - ${activeDistrictName} (${activeProvinceName})</title>
          <style>
            body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; font-family: Arial; }
            img { max-width: 320px; border: 1px solid #ccc; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <img src="${stampDataUrl}" onload="window.print();window.close();" />
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1A1A1E] border border-[#2D2D35] rounded-2xl p-4 sm:p-5 relative shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#2D2D35] gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#00E5FF] tracking-tight flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#D4F63D]" />
              <span>Tạo Tem Mã QR Vận Đơn Toàn Quốc & Phân Loại Cửa PLC</span>
            </h3>
            <p className="text-xs text-[#888888] mt-0.5">
              Hỗ trợ 63 Tỉnh/Thành Việt Nam & Cửa PLC tương ứng. Quét điện thoại mở Google Maps, quét trên băng chuyền kích hoạt gạt hàng.
            </p>
          </div>

          <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D4F63D]/20 text-[#D4F63D] border border-[#D4F63D]/30 shrink-0">
            63 Tỉnh Thành & Toàn Quốc
          </span>
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          {/* Region Tabs */}
          <div>
            <label className="text-[#AAAAAA] font-bold text-xs uppercase tracking-wider block mb-2">
              Khu Vực & Tỉnh Thành Nhanh:
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => { setActiveFilter('ALL'); setIsCustomMode(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'ALL' && !isCustomMode
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'bg-[#25252B] text-[#AAAAAA] hover:text-white'
                }`}
              >
                Tất Cả ({ALL_VIETNAM_DISTRICTS.length})
              </button>

              <button
                type="button"
                onClick={() => { setActiveFilter('DANANG'); setIsCustomMode(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'DANANG' && !isCustomMode
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'bg-[#25252B] text-[#AAAAAA] hover:text-white'
                }`}
              >
                Đà Nẵng & Miền Trung
              </button>

              <button
                type="button"
                onClick={() => { setActiveFilter('HANOI'); setIsCustomMode(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'HANOI' && !isCustomMode
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'bg-[#25252B] text-[#AAAAAA] hover:text-white'
                }`}
              >
                Hà Nội & Miền Bắc
              </button>

              <button
                type="button"
                onClick={() => { setActiveFilter('HCMC'); setIsCustomMode(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'HCMC' && !isCustomMode
                    ? 'bg-[#00E5FF] text-black shadow-md'
                    : 'bg-[#25252B] text-[#AAAAAA] hover:text-white'
                }`}
              >
                TP. Hồ Chí Minh & Miền Nam
              </button>

              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  isCustomMode
                    ? 'bg-[#D4F63D] text-black shadow-md font-extrabold'
                    : 'bg-[#25252B] border border-dashed border-[#D4F63D]/50 text-[#D4F63D] hover:bg-[#D4F63D]/10'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tự Nhập Tỉnh Thành Khác</span>
              </button>
            </div>
          </div>

          {/* Conditional View: Custom Mode OR Preset Grid */}
          {isCustomMode ? (
            <div className="p-4 rounded-xl bg-[#121214] border border-[#D4F63D]/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D4F63D]">
                <Sparkles className="w-4 h-4" />
                <span>Chế Độ Nhập Tự Do Mọi Tỉnh/Thành Trong 63 Tỉnh Thành Việt Nam:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#AAAAAA] text-xs font-semibold block mb-1">
                    Chọn Hoặc Nhập Tỉnh/Thành Phố:
                  </label>
                  <select
                    value={customProvince}
                    onChange={(e) => setCustomProvince(e.target.value)}
                    className="w-full bg-[#1A1A1E] border border-[#2D2D35] rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#D4F63D]"
                  >
                    {VIETNAM_PROVINCES.map((prov) => (
                      <option key={prov} value={prov} className="bg-[#1A1A1E]">
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#AAAAAA] text-xs font-semibold block mb-1">
                    Tên Quận / Huyện / Thị Xã:
                  </label>
                  <input
                    type="text"
                    value={customDistrict}
                    onChange={(e) => setCustomDistrict(e.target.value)}
                    placeholder="VD: Quận Ninh Kiều, TX Phú Mỹ, Huyện Hòa Vang..."
                    className="w-full bg-[#1A1A1E] border border-[#2D2D35] rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#D4F63D]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[#AAAAAA] font-semibold text-xs block mb-1.5">
                Chọn Điểm Giao Hàng & Cửa Phân Loại:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredDistricts.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedDistrict(d); setIsCustomMode(false); }}
                    className={`text-left p-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      selectedDistrict.id === d.id && !isCustomMode
                        ? 'border-[#00E5FF] bg-[#00E5FF]/15 text-white ring-1 ring-[#00E5FF]'
                        : 'border-[#2D2D35] bg-[#121214] text-[#E0E0E0] hover:border-[#3D3D48] hover:bg-[#25252B]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#888888] font-mono uppercase">{d.province}</span>
                      <span className="text-[9px] px-1 rounded bg-[#2D2D35] text-[#D4F63D] font-mono">Cửa {d.gate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="truncate">{d.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Street Address */}
          <div>
            <label className="text-[#AAAAAA] font-semibold text-xs block mb-1">
              Số nhà / Tên đường (Ghim chính xác trên Google Maps):
            </label>
            <input
              type="text"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="VD: 123 Bạch Đằng, P. Hải Châu 1"
              className="w-full bg-[#121214] border border-[#2D2D35] rounded-lg px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#00E5FF]"
            />
          </div>

          {/* Gate Number Manual Override */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#121214] border border-[#2D2D35]">
            <div>
              <span className="text-white font-bold text-xs block">
                Mã Cửa Kích Hoạt PLC (Gate ID):
              </span>
              <span className="text-[10px] text-[#888888]">
                Khi camera AI quét thấy tem này, xi lanh cửa tương ứng sẽ gạt kiện hàng xuống chute
              </span>
            </div>
            <input
              type="number"
              value={gateNumber}
              onChange={(e) => setGateNumber(parseInt(e.target.value, 10) || 1)}
              className="w-20 bg-[#1A1A1E] border border-[#2D2D35] rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-[#D4F63D] text-center outline-none focus:border-[#D4F63D]"
              min="1"
              max="99"
            />
          </div>

          {/* Stamp Preview Box */}
          <div className="bg-[#121214] border border-[#2D2D35] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-4">
            {stampDataUrl && (
              <img
                src={stampDataUrl}
                alt="Tem QR Decal"
                className="w-36 rounded-lg shadow-xl border border-[#3D3D48] bg-white p-1"
              />
            )}

            <div className="flex-1 space-y-2 text-xs">
              <div className="text-[#00E5FF] font-bold text-sm">
                Định dạng QR Đa Tầng (Dual-Mode):
              </div>
              <ul className="text-[#AAAAAA] space-y-1 list-disc pl-4 text-[11px]">
                <li>
                  <b className="text-[#34C759]">Quét bằng Điện Thoại:</b> Mở thẳng vị trí ghim tại {activeProvinceName}.
                </li>
                <li>
                  <b className="text-[#2196F3]">Quét bằng Webcam / Băng Chuyền:</b> Kích hoạt Cửa {gateNumber} trên PLC (Mã: {activeCode}).
                </li>
              </ul>

              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadStamp}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#4CAF50] hover:bg-[#388E3C] text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Ảnh Tem (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#2196F3] hover:bg-[#1976D2] text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Decal Ngay</span>
                </button>

                <a
                  href={constructedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#25252B] hover:bg-[#3D3D48] text-[#00E5FF] flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Google Maps</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

