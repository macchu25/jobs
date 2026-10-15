import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ALL_VIETNAM_DISTRICTS } from '../../utils/classifierDefaults';
import { DistrictQrItem } from '../../types/classifier';
import { useClassifierStore } from '../../stores/classifierStore';
import { X, Download, Printer, Check, MapPin, Sparkles } from 'lucide-react';

export const DistrictQrModal: React.FC = () => {
  const { isDistrictModalOpen, setIsDistrictModalOpen, addLog } = useClassifierStore();

  const [activeRegion, setActiveRegion] = useState<'ALL' | 'DANANG' | 'HANOI' | 'HCMC' | 'NORTH' | 'CENTRAL' | 'SOUTH'>('ALL');
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [downloadedAll, setDownloadedAll] = useState(false);

  const filteredDistricts = ALL_VIETNAM_DISTRICTS.filter((d) => {
    if (activeRegion === 'DANANG') return d.province === 'Đà Nẵng';
    if (activeRegion === 'HANOI') return d.province === 'Hà Nội';
    if (activeRegion === 'HCMC') return d.province === 'TP. Hồ Chí Minh';
    if (activeRegion === 'NORTH') return d.region === 'NORTH';
    if (activeRegion === 'CENTRAL') return d.region === 'CENTRAL';
    if (activeRegion === 'SOUTH') return d.region === 'SOUTH';
    return true;
  });

  useEffect(() => {
    if (!isDistrictModalOpen) return;

    const generateAll = async () => {
      const results: Record<string, string> = { ...qrImages };
      for (const d of filteredDistricts) {
        if (results[d.id]) continue; // already generated
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 280;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          // White background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Generate QR
          const qrDataUrl = await QRCode.toDataURL(d.maps_url, {
            width: 240,
            margin: 1,
            errorCorrectionLevel: 'L',
          });

          const img = new Image();
          await new Promise((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, 20, 15, 240, 240);

              // Title (District & Province)
              ctx.fillStyle = '#111827';
              ctx.font = 'bold 15px Segoe UI, Arial';
              ctx.textAlign = 'center';
              ctx.fillText(`${d.label_ascii} - ${(d.province || '').toUpperCase()}`, 140, 280);

              // Subtext
              ctx.fillStyle = '#1D4ED8';
              ctx.font = 'bold 12px Segoe UI, Arial';
              ctx.fillText(`CỬA PLC: ${d.gate} | ${d.code}`, 140, 304);

              // Hint
              ctx.fillStyle = '#4B5563';
              ctx.font = '10px Segoe UI, Arial';
              ctx.fillText('Quét ĐT -> Mở Google Maps vị trí', 140, 324);

              // Province
              ctx.fillStyle = '#9CA3AF';
              ctx.font = 'italic 10px Segoe UI, Arial';
              ctx.fillText(`Vùng: ${d.region || 'Toàn quốc'}`, 140, 342);

              results[d.id] = canvas.toDataURL('image/png');
              resolve(true);
            };
            img.src = qrDataUrl;
          });
        } catch (e) {
          console.error(e);
        }
      }
      setQrImages(results);
    };

    generateAll();
  }, [isDistrictModalOpen, activeRegion]);

  if (!isDistrictModalOpen) return null;

  const handleDownloadSingle = (id: string, name: string) => {
    const dataUrl = qrImages[id];
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.download = `tem_qr_${id}.png`;
    a.href = dataUrl;
    a.click();
    addLog('INFO', `Đã tải về tem QR: ${name}`);
  };

  const handleDownloadAll = () => {
    filteredDistricts.forEach((d, idx) => {
      setTimeout(() => {
        handleDownloadSingle(d.id, `${d.name} (${d.province})`);
      }, idx * 150);
    });
    setDownloadedAll(true);
    setTimeout(() => setDownloadedAll(false), 3000);
  };

  const handlePrintAll = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const imgsHtml = filteredDistricts.map(
      (d) =>
        `<div style="margin: 12px; display: inline-block;"><img src="${qrImages[d.id]}" style="width: 220px; border: 1px solid #ccc; border-radius: 6px;" /></div>`
    ).join('');

    win.document.write(`
      <html>
        <head>
          <title>In Bộ Tem Decal QR - Phân Loại Kho Bãi</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            h2 { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h2>Bộ Tem Mã QR Dán Kiện Hàng - ${filteredDistricts.length} Khu Vực / Tỉnh Thành</h2>
          <div style="display: flex; flex-wrap: wrap; justify-content: center;">
            ${imgsHtml}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#1A1A1E] border border-[#2D2D35] rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D2D35] pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#D4F63D] shadow-[0_0_10px_rgba(212,246,61,0.5)]" />
            <div>
              <h2 className="text-[#00E5FF] font-black text-base sm:text-lg tracking-tight">
                Bộ Tem Decal Mã QR Toàn Quốc (63 Tỉnh Thành & Đô Thị)
              </h2>
              <p className="text-[11px] text-slate-400">
                Đồng bộ hóa địa chỉ Google Maps cho Shipper & kích hoạt cửa phân loại PLC
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDistrictModalOpen(false)}
            className="text-[#AAAAAA] hover:text-white p-1 rounded-lg hover:bg-[#25252B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Region Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 shrink-0 no-scrollbar">
          <button
            onClick={() => setActiveRegion('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRegion === 'ALL'
                ? 'bg-[#00E5FF] text-black shadow-md'
                : 'bg-[#25252B] text-slate-300 hover:text-white'
            }`}
          >
            Tất Cả ({ALL_VIETNAM_DISTRICTS.length})
          </button>

          <button
            onClick={() => setActiveRegion('DANANG')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRegion === 'DANANG'
                ? 'bg-[#00E5FF] text-black shadow-md'
                : 'bg-[#25252B] text-slate-300 hover:text-white'
            }`}
          >
            Đà Nẵng
          </button>

          <button
            onClick={() => setActiveRegion('HANOI')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRegion === 'HANOI'
                ? 'bg-[#00E5FF] text-black shadow-md'
                : 'bg-[#25252B] text-slate-300 hover:text-white'
            }`}
          >
            Hà Nội
          </button>

          <button
            onClick={() => setActiveRegion('HCMC')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRegion === 'HCMC'
                ? 'bg-[#00E5FF] text-black shadow-md'
                : 'bg-[#25252B] text-slate-300 hover:text-white'
            }`}
          >
            TP. Hồ Chí Minh
          </button>

          <button
            onClick={() => setActiveRegion('CENTRAL')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRegion === 'CENTRAL'
                ? 'bg-[#00E5FF] text-black shadow-md'
                : 'bg-[#25252B] text-slate-300 hover:text-white'
            }`}
          >
            Miền Trung (Huế, Quảng Nam, Khánh Hòa...)
          </button>

          <button
            onClick={() => setActiveRegion('NORTH')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRegion === 'NORTH'
                ? 'bg-[#00E5FF] text-black shadow-md'
                : 'bg-[#25252B] text-slate-300 hover:text-white'
            }`}
          >
            Miền Bắc (Hải Phòng, Quảng Ninh, Bắc Ninh...)
          </button>

          <button
            onClick={() => setActiveRegion('SOUTH')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRegion === 'SOUTH'
                ? 'bg-[#00E5FF] text-black shadow-md'
                : 'bg-[#25252B] text-slate-300 hover:text-white'
            }`}
          >
            Miền Nam (Cần Thơ, Bình Dương, Đồng Nai...)
          </button>
        </div>

        {/* Scrollable Grid Body */}
        <div className="overflow-y-auto pr-1 flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
            {filteredDistricts.map((d) => (
              <div
                key={d.id}
                className="bg-[#121214] border border-[#2D2D35] rounded-xl p-2.5 flex flex-col items-center text-center shadow-md hover:border-[#00E5FF] transition-all group"
              >
                {qrImages[d.id] ? (
                  <img
                    src={qrImages[d.id]}
                    alt={d.name}
                    className="w-full aspect-[4/5] object-contain rounded-lg bg-white p-1 mb-2 shadow-sm"
                  />
                ) : (
                  <div className="w-full aspect-[4/5] bg-[#222228] rounded-lg animate-pulse mb-2 flex items-center justify-center text-xs text-[#888]">
                    Đang tạo QR...
                  </div>
                )}

                <div className="font-extrabold text-xs text-white truncate w-full">{d.name}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate w-full mb-1">
                  {d.province}
                </div>
                <div
                  className="text-[11px] font-bold mb-2 flex items-center gap-1"
                  style={{ color: d.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>Cửa PLC: {d.gate}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadSingle(d.id, `${d.name} (${d.province})`)}
                  className="text-[11px] font-bold py-1 px-2 w-full mt-auto rounded-lg bg-[#25252B] hover:bg-[#3D3D48] text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Tải PNG</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2D2D35] shrink-0 text-xs">
          <div className="text-slate-400 text-xs">
            Đang hiển thị <span className="font-bold text-white">{filteredDistricts.length}</span> tem mẫu ({activeRegion === 'ALL' ? 'Toàn quốc' : activeRegion})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintAll}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#2196F3] hover:bg-[#1976D2] text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Toàn Bộ ({filteredDistricts.length} Tem)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAll}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#4CAF50] hover:bg-[#388E3C] text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              {downloadedAll ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>{downloadedAll ? 'Đã Tải Xong!' : `Tải Tất Cả ${filteredDistricts.length} File PNG`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
