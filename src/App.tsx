import React, { useState } from 'react';
import ApplyForm from './components/ApplyForm';
import AdminDashboard from './components/AdminDashboard';
import { ShieldCheck, UserCheck, ShieldAlert, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // 사용자와 관리자 모드를 구분하는 고해상도 상태값 정의
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  
  // 데이터 변동 감지 시 하위 어드민 목록 강제 갱신용 카운터
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefreshList = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900" id="app-root">
      {/* 글로벌 마스트헤드 / 네비게이션 */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm" id="global-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between py-3 sm:py-0 sm:h-16 gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-start" id="brand-logo">
              <div className="bg-blue-700 text-white p-1.5 sm:p-2 rounded-xl flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <span className="font-bold text-slate-900 text-xs sm:text-sm md:text-base leading-tight block truncate">교육부 EPKI 인증 전자서명지원망</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold tracking-wider uppercase block mt-0.5 truncate">Education EPKI Draft Agent MVP</span>
              </div>
            </div>

            {/* 고해상도 상단 네비게이션 탭 */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shrink-0 w-full sm:w-auto justify-center" id="nav-tabs">
              <button
                onClick={() => setActiveTab('user')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'user'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                id="tab-user"
              >
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                신청자 웹 포털
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                id="tab-admin"
              >
                <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                관리자 제어반
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 업무 영역 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="main-content">
        <AnimatePresence mode="wait">
          {activeTab === 'user' ? (
            <motion.div
              key="user-portal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              id="user-portal-section"
            >
              <ApplyForm onSuccess={handleRefreshList} />
            </motion.div>
          ) : (
            <motion.div
              key="admin-portal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              id="admin-portal-section"
            >
              <AdminDashboard key={refreshTrigger} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 하단 정보 바 및 보안 지침 */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400" id="global-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2" id="footer-security-badge">
            <ShieldAlert className="w-4 h-4 text-slate-300" />
            <span>교육부 통합인증망 보안 수칙 준수 (개인정보 수집 당일 완전 파기 소멸 원칙 적용)</span>
          </div>
          <div id="footer-credits">
            <span>&copy; 2026 교육부 전자서명인증서 기안 자동화 MVP. All Rights Reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
