import React, { useState } from 'react';
import { StatCards } from '../components/dashboard/StatCards';
import { VolumeChart } from '../components/dashboard/VolumeChart';
import { CustomTagsTable } from '../components/dashboard/CustomTagsTable';
import { RecentSalesOrderCard } from '../components/dashboard/RecentSalesOrderCard';
import { AiRecommendationCard } from '../components/dashboard/AiRecommendationCard';
import { StillNotArrivedCard } from '../components/dashboard/StillNotArrivedCard';
import { DistrictQrModal } from '../components/classifier/DistrictQrModal';
import { LiveVideoPanel } from '../components/classifier/LiveVideoPanel';
import { Camera, BarChart3, Sparkles } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [mainSection, setMainSection] = useState<'conveyor' | 'analytics'>('conveyor');

  return (
    <div className="space-y-6">
      {/* 1. TOP 4 KPI CARDS (Matching Vault UI: 1 Black Hero + 3 White Gauges) */}
      <section>
        <StatCards />
      </section>

      {/* 2. SECTION SELECTOR: DUAL CONVEYOR & CAMERA VS ANALYTICS CHARTS */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#E8EAEF] shadow-xs">
          <button
            type="button"
            onClick={() => setMainSection('conveyor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mainSection === 'conveyor'
                ? 'bg-[#141718] text-white shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-[#D4F63D]" />
            <span>Dây Chuyền Băng Tải & Camera AI (Mô Phỏng Song Song)</span>
          </button>

          <button
            type="button"
            onClick={() => setMainSection('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mainSection === 'analytics'
                ? 'bg-[#141718] text-white shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Biểu Đồ Sản Lượng & Phân Tích Kho</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          {mainSection === 'conveyor'
            ? 'Camera quét trúng QR -> Kiện hàng lập tức hiện trên băng chuyền'
            : 'Thống kê tiêu thụ & tồn kho 5 Cửa Đà Nẵng'}
        </span>
      </div>

      {/* 3. MIDDLE SECTION (Live Video Panel OR Analytics Charts) */}
      <section>
        {mainSection === 'conveyor' ? (
          <LiveVideoPanel />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left 7 Columns: Dual-line Spline Chart */}
            <div className="lg:col-span-7 flex flex-col min-w-0">
              <VolumeChart />
            </div>

            {/* Right 5 Columns: Custom Tags & 5 Da Nang Gates Table */}
            <div className="lg:col-span-5 flex flex-col min-w-0">
              <CustomTagsTable />
            </div>
          </div>
        )}
      </section>

      {/* 4. BOTTOM SECTION (3 Cards Row: Sales & Order + AI Restock Recommendation + Still Not Arrived) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* Card 1: Sales & Order (Recent Scans) */}
        <div className="flex flex-col min-w-0">
          <RecentSalesOrderCard />
        </div>

        {/* Card 2: AI Restock Recommendation (Vision AI & Prediction) */}
        <div className="flex flex-col min-w-0">
          <AiRecommendationCard />
        </div>

        {/* Card 3: Still Not Arrived (Alarms & Handshake Events) */}
        <div className="flex flex-col min-w-0">
          <StillNotArrivedCard />
        </div>
      </section>

      {/* District QR Code Generation Modal */}
      <DistrictQrModal />
    </div>
  );
};

export default DashboardPage;
