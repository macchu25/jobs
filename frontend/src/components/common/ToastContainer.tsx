import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useHmiStore } from '../../stores/hmiStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useHmiStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-slate-600 bg-slate-900';
        let textClass = 'text-slate-200';
        let Icon = Info;

        if (toast.type === 'success') {
          borderClass = 'border-emerald-600 bg-emerald-950/95';
          textClass = 'text-emerald-200';
          Icon = CheckCircle2;
        } else if (toast.type === 'error') {
          borderClass = 'border-red-600 bg-red-950/95 glow-red';
          textClass = 'text-red-200';
          Icon = AlertCircle;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-600 bg-amber-950/95';
          textClass = 'text-amber-200';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all ${borderClass}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${textClass}`} />
            <div className={`flex-1 text-xs font-medium leading-snug ${textClass}`}>
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
