import React from 'react';
import { Sparkles, ArrowRight, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClassifierStore } from '../../stores/classifierStore';
import { useHmiStore } from '../../stores/hmiStore';
import { useLanguageStore } from '../../stores/languageStore';

export const AiRecommendationCard: React.FC = () => {
  const { config, counters } = useClassifierStore();
  const { bins } = useHmiStore();
  const { t } = useLanguageStore();

  const total = counters.TOTAL || 0;

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E8EAEF] shadow-xs flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-[#111827] tracking-tight">
          {t.aiRecommendation.title}
        </h3>
        <span className="p-1.5 rounded-full bg-slate-50 text-slate-400">
          <Sparkles className="w-4 h-4 text-[#A3E635]" />
        </span>
      </div>

      {/* Mini Spline Chart */}
      <div className="relative w-full h-24 my-1">
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 240 70"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="aiCurveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#84CC16" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#84CC16" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Dotted grid lines */}
          <line x1="0" y1="15" x2="240" y2="15" stroke="#F1F3F6" strokeDasharray="2 2" />
          <line x1="0" y1="40" x2="240" y2="40" stroke="#F1F3F6" strokeDasharray="2 2" />
          <line x1="0" y1="65" x2="240" y2="65" stroke="#E5E7EB" />

          {/* Secondary Gray Curve (Actual Sales) */}
          <path
            d="M0,55 C40,50 80,45 120,50 C160,55 200,40 240,45"
            fill="none"
            stroke="#D1D5DB"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Primary Green Rising Curve (AI Prediction) */}
          <path
            d="M0,50 C50,45 90,38 130,42 C170,45 200,20 240,15"
            fill="none"
            stroke="#84CC16"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M0,50 C50,45 90,38 130,42 C170,45 200,20 240,15 L240,65 L0,65 Z"
            fill="url(#aiCurveGradient)"
          />

          {/* Highlight Dot */}
          <circle cx="240" cy="15" r="3.5" fill="#84CC16" />
        </svg>
      </div>

      {/* Subtitle & Big Metric */}
      <div className="space-y-1 mb-4">
        <span className="text-xs text-slate-400 block">
          {t.aiRecommendation.subtitle}
        </span>
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold font-mono text-[#111827]">
            {total} Items Scanned
          </div>

          {/* Chart Legend */}
          <div className="flex flex-col text-[10px] text-slate-400 space-y-0.5 text-right font-medium">
            <span className="flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-[#84CC16]" />
              AI Prediction
            </span>
            <span className="flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              Actual Flow
            </span>
          </div>
        </div>
      </div>

      {/* Recommendation description */}
      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 leading-relaxed">
        💡 {t.aiRecommendation.fastMovingAlert}
      </p>

      {/* Two Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        <Link
          to="/vision"
          className="py-2 px-3 rounded-xl bg-[#141718] hover:bg-black text-white text-xs font-bold text-center transition-all shadow-xs flex items-center justify-center gap-1.5"
        >
          <Video className="w-3.5 h-3.5 text-[#D4F63D]" />
          <span>Camera Stream</span>
        </Link>
        <Link
          to="/manual"
          className="py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-[#E8EAEF] text-slate-700 text-xs font-bold text-center transition-colors cursor-pointer flex items-center justify-center"
        >
          Manual Control
        </Link>
      </div>
    </div>
  );
};
