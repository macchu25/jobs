import React, { useRef, useEffect } from 'react';
import { useClassifierStore } from '../../stores/classifierStore';
import { Trash2, Download } from 'lucide-react';

export const ConsoleLogPanel: React.FC = () => {
  const { logs, clearLogs } = useClassifierStore();
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom whenever new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleDownloadLog = () => {
    const content = logs
      .map((l) => `[${l.time}] [${l.level}] ${l.text}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `he_thong_phan_loai_log_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="qt-groupbox bg-[#121214] border border-[#2D2D35] rounded-lg p-3 pt-5 relative">
      <div className="flex items-center justify-between">
        <span className="qt-groupbox-title">
          Nhật ký Hệ thống (System Console Log)
        </span>

        {/* Small top-right utility actions */}
        <div className="absolute top-[-10px] right-3 flex items-center gap-2">
          <button
            onClick={clearLogs}
            className="text-[#AAAAAA] hover:text-[#FF5252] text-xs flex items-center gap-1 bg-[#121214] px-1.5 py-0.5 rounded border border-[#2D2D35]"
            title="Xóa toàn bộ log"
          >
            <Trash2 className="w-3 h-3" />
            <span>Xóa log</span>
          </button>

          <button
            onClick={handleDownloadLog}
            className="text-[#AAAAAA] hover:text-[#00E5FF] text-xs flex items-center gap-1 bg-[#121214] px-1.5 py-0.5 rounded border border-[#2D2D35]"
            title="Tải file log về máy"
          >
            <Download className="w-3 h-3" />
            <span>Lưu file</span>
          </button>
        </div>
      </div>

      {/* Terminal View Container matching QTextEdit in main_window.py */}
      <div
        ref={logContainerRef}
        className="qt-console h-32 sm:h-36 overflow-y-auto rounded p-2.5 space-y-1 select-text scroll-smooth"
      >
        {logs.map((log) => {
          const colorClass =
            log.level === 'INFO'
              ? 'text-[#00FF66]'
              : log.level === 'WARN'
              ? 'text-[#FFCC00]'
              : 'text-[#FF3B30]';

          return (
            <div key={log.id} className="leading-relaxed break-all font-mono">
              <span className="text-[#888888]">[{log.time}]</span>{' '}
              <span className={`font-bold ${colorClass}`}>[{log.level}]</span>{' '}
              <span className={colorClass}>{log.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
