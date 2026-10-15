import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { OfflineOverlay } from './components/common/OfflineOverlay';
import { ToastContainer } from './components/common/ToastContainer';
import { DashboardPage } from './pages/DashboardPage';
import { VisionPage } from './pages/VisionPage';
import { BinsPage } from './pages/BinsPage';
import { ManualPage } from './pages/ManualPage';
import { AlarmsPage } from './pages/AlarmsPage';
import { HistoryPage } from './pages/HistoryPage';
import { QrPage } from './pages/QrPage';
import { SettingsPage } from './pages/SettingsPage';
import { wsService } from './services/websocket';
import { apiService } from './services/api';
import { useHmiStore } from './stores/hmiStore';

export const App: React.FC = () => {
  const { setConfig, applySnapshot } = useHmiStore();

  useEffect(() => {
    // Attempt fetch of public config and state snapshot if backend is running
    apiService.getPublicConfig().then(setConfig).catch(() => {});
    apiService.getStatus().then(applySnapshot).catch(() => {});

    // Open persistent WebSocket connection if available
    wsService.connect();

    return () => {
      wsService.disconnect();
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F5F6FA] text-slate-800 flex selection:bg-[#D4F63D] selection:text-black antialiased font-sans">
        {/* Full-height Desktop Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
          {/* Top Vault Header Bar */}
          <Header />

          {/* Main Application View Area */}
          <main className="flex-1 p-3 sm:p-5 lg:p-8 max-w-[1720px] w-full mx-auto pb-24 lg:pb-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/vision" element={<VisionPage />} />
              <Route path="/bins" element={<BinsPage />} />
              <Route path="/manual" element={<ManualPage />} />
              <Route path="/alarms" element={<AlarmsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/qr" element={<QrPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>

        {/* Mobile Touch Bottom Navigation */}
        <BottomNav />

        {/* Realtime Toast Notifications */}
        <ToastContainer />

        {/* Fullscreen Offline Failsafe Overlay */}
        <OfflineOverlay />
      </div>
    </BrowserRouter>
  );
};

export default App;
