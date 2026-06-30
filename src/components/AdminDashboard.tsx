import React, { useState, useEffect, useRef } from 'react';
import { EPKIRequest } from '../types';
import { selectors } from '../config/selectors';
import { Trash2, Eye, ShieldAlert, Terminal, Settings, RefreshCw, Layers, CheckCircle2, AlertTriangle, FileCheck, ShieldIcon as ShieldIcon2, Upload, Mail, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const [requests, setRequests] = useState<EPKIRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EPKIRequest | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [deleteStatusMsg, setDeleteStatusMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 빈 양식 업로드 제어 상태
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [templateUploadMsg, setTemplateUploadMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  // 기안문 양식 업로드 제어 상태
  const [draftTemplateFile, setDraftTemplateFile] = useState<File | null>(null);
  const [isUploadingDraftTemplate, setIsUploadingDraftTemplate] = useState(false);
  const [draftTemplateUploadMsg, setDraftTemplateUploadMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const draftTemplateFileInputRef = useRef<HTMLInputElement>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // 데이터 로드
  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/requests');
      const data = await res.json();
      if (res.ok) {
        const newRequests = data.requests || [];
        // 상태가 실제로 변경되었을 때만 업데이트 (불필요한 리렌더 방지)
        setRequests(prev => {
          if (prev.length === newRequests.length && prev.every((r, i) => r.id === newRequests[i].id && r.status === newRequests[i].status && r.processStatus === newRequests[i].processStatus)) {
            return prev;
          }
          return newRequests;
        });
        
        // 현재 선택된 항목이 있다면 해당 정보도 최신화
        if (selectedRequest) {
          const updated = (newRequests as EPKIRequest[]).find(r => r.id === selectedRequest.id);
          if (updated && (updated.status !== selectedRequest.status || updated.processStatus !== selectedRequest.processStatus)) {
            setSelectedRequest(updated);
          }
        }
      }
    } catch (err) {
      console.error('데이터 조회 실패:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // 기안 진행 중인 건이 있다면 주기적(1.5초)으로 상태 조회하여 화면 갱신
  useEffect(() => {
    const hasDrafting = requests.some(r => r.status === 'drafting');
    if (hasDrafting) {
      const interval = setInterval(() => {
        fetchRequests(true);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [requests, selectedRequest]);

  // 터미널 스크롤 제어
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedRequest?.logs]);

  // F-2. 개인정보 및 파일 즉시 영구 파기 소멸 API 호출
  const handleDeleteRequest = async (id: string, name: string) => {
    if (!confirm(`주의: [${name}] 신청자의 인적사항 DB 기록과 로컬 디렉토리에 임시 저장된 신청서 PDF 스캔본 파일을 영구 소멸시키겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        return;
      }

      setDeleteStatusMsg(`[소멸 성공] ${data.message} (${data.fileLog})`);
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
      }
      
      // 소멸 로그를 4초 뒤 숨김
      setTimeout(() => {
        setDeleteStatusMsg(null);
      }, 5000);

      fetchRequests();
    } catch (err) {
      console.error('파기 요청 실패:', err);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchRequests(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleTemplateUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFile) return;

    setIsUploadingTemplate(true);
    setTemplateUploadMsg(null);

    const formData = new FormData();
    formData.append('templateFile', templateFile);

    try {
      const res = await fetch('/api/templates/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '양식 업로드에 실패했습니다.');
      }
      setTemplateUploadMsg({ type: 'success', text: data.message });
      setTemplateFile(null);
    } catch (err: any) {
      setTemplateUploadMsg({ type: 'error', text: err.message || '업로드 중 에러가 발생했습니다.' });
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const handleDraftTemplateUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTemplateFile) return;

    setIsUploadingDraftTemplate(true);
    setDraftTemplateUploadMsg(null);

    const formData = new FormData();
    formData.append('draftTemplateFile', draftTemplateFile);

    try {
      const res = await fetch('/api/templates/draft/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '기안 양식 업로드에 실패했습니다.');
      }
      setDraftTemplateUploadMsg({ type: 'success', text: data.message });
      setDraftTemplateFile(null);
    } catch (err: any) {
      setDraftTemplateUploadMsg({ type: 'error', text: err.message || '업로드 중 에러가 발생했습니다.' });
    } finally {
      setIsUploadingDraftTemplate(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-dashboard-root">
      {/* 관리 대시보드 타이틀바 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-700" />
            EPKI 관리자 제어 대시보드
          </h2>
          <p className="text-slate-500 text-[11px] sm:text-xs mt-1">
            제출된 전자서명인증서 스캔본 및 신청 데이터를 관리하고 Playwright 자동화 엔진을 가동합니다.
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`inline-flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-semibold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border transition-all whitespace-nowrap ${
              showConfig 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
            id="btn-toggle-config"
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            셀렉터 설정 정보 (N-2)
          </button>
          
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all whitespace-nowrap"
            id="btn-manual-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* N-2. 자체 개발 시스템 UI 변경 대응 셀렉터 설정 뷰어 */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900 text-slate-200 p-6 rounded-2xl border border-slate-800 shadow-inner overflow-hidden"
            id="config-selector-panel"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-blue-400">
                <Settings className="w-4 h-4" />
                웹 요소 셀렉터 구성 (src/config/selectors.ts)
              </h3>
              <span className="bg-slate-800 text-slate-400 text-[10px] font-mono px-2 py-0.5 rounded">
                READ-ONLY CONFIG
              </span>
            </div>
            <p className="text-slate-400 text-xs mb-4">
              * 사내 자체 개발 그룹웨어의 HTML 구조가 개편될 경우, 이 소스 파일의 셀렉터 패턴을 즉시 수정하여 자동 기안 시스템의 유지보수성을 극대화합니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-[11px]">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">그룹웨어 로그인 URL</span>
                <span className="text-emerald-400 select-all">{selectors.loginUrl}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">사용자 ID 인풋 필드</span>
                <span className="text-blue-400 select-all">{selectors.usernameInput}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">사용자 PW 인풋 필드</span>
                <span className="text-blue-400 select-all">{selectors.passwordInput}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">기안 문서 제목 필드</span>
                <span className="text-blue-400 select-all">{selectors.titleInput}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">신청인 PDF 파일 인풋</span>
                <span className="text-emerald-400 select-all">{selectors.fileInput}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">보안 열람제한 체크박스</span>
                <span className="text-amber-400 select-all">{selectors.restrictedCheckbox}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 개인정보 영구 파기 완료 얼럿 피드백 */}
      {deleteStatusMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-3" id="delete-status-banner">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">행정 보안 파기 프로토콜 감지</p>
            <p className="mt-1 font-mono leading-relaxed">{deleteStatusMsg}</p>
          </div>
        </div>
      )}

      {/* 메인 리스트 및 터미널 듀얼 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-main-content">
        {/* 왼쪽: 대기 신청자 목록 (8단) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="requests-list-panel">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-slate-500" />
              EPKI 신청서 처리 리스트
            </h3>
            <span className="bg-slate-200 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
              총 {requests.length}건
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400" id="requests-loading">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-300 mb-2" />
              신청 목록 로드 중...
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-slate-400" id="requests-empty">
              신청된 데이터가 존재하지 않습니다.
            </div>
          ) : (
            <div className="overflow-x-auto" id="requests-table-container">
              <table className="w-full min-w-[500px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold text-[11px] sm:text-xs border-b border-slate-100">
                    <th className="px-3 sm:px-6 py-2.5 sm:py-3">신청자</th>
                    <th className="px-3 sm:px-6 py-2.5 sm:py-3">부서 / 사번</th>
                    <th className="px-3 sm:px-6 py-2.5 sm:py-3">처리 상태</th>
                    <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right">기기 제어</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className={`hover:bg-slate-50/50 transition-colors text-xs sm:text-sm ${
                        selectedRequest?.id === req.id ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="font-semibold text-slate-800">{req.name}</div>
                        <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono select-all">{req.id}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="text-slate-600 font-medium">{req.department}</div>
                        <div className="text-[10px] sm:text-xs text-slate-400 font-mono mt-0.5">{req.employeeId}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <button
                          type="button"
                          onClick={() => {
                            const next = req.processStatus === 'waiting' ? 'received' : req.processStatus === 'received' ? 'issued' : 'waiting';
                            setRequests(prev => prev.map(r => r.id === req.id ? { ...r, processStatus: next } : r));
                          }}
                          className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full border-0 cursor-pointer transition-colors"
                          title="클릭하여 상태 변경"
                        >
                          {req.processStatus === 'waiting' && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 sm:px-2.5 py-0.5 rounded-full">신청대기</span>
                          )}
                          {req.processStatus === 'received' && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 sm:px-2.5 py-0.5 rounded-full">접수완료</span>
                          )}
                          {req.processStatus === 'issued' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 sm:px-2.5 py-0.5 rounded-full">발급신청완료</span>
                          )}
                        </button>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                          {/* 상세 보기 버튼 */}
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 sm:p-1.5 rounded-lg transition-colors"
                            title="로그/신청서 보기"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>

                          {/* 상태 변경 버튼 */}
                          <button
                            type="button"
                            onClick={() => {
                              const next = req.processStatus === 'waiting' ? 'received' : req.processStatus === 'received' ? 'issued' : 'waiting';
                              setRequests(prev => prev.map(r => r.id === req.id ? { ...r, processStatus: next } : r));
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 sm:p-1.5 rounded-lg transition-colors"
                            title="처리 상태 변경"
                          >
                            <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>

                          {/* 데이터 영구 파기 버튼 */}
                          <button
                            onClick={() => handleDeleteRequest(req.id, req.name)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1 sm:p-1.5 rounded-lg transition-colors"
                            title="보안파기 및 파일 영구 소멸"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 오른쪽: Playwright 실시간 에뮬레이션 터미널 및 정보창 (5단) */}
        <div className="lg:col-span-5 flex flex-col gap-6" id="terminal-side-panel">
          {/* 신청서 상세 정보 요약 */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4" />
              선택된 신청 정보
            </h3>

            {selectedRequest ? (
              <div className="space-y-3.5 text-xs text-slate-600" id="selected-request-info">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">신청자명</span>
                    <span className="font-bold text-slate-800 text-sm">{selectedRequest.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">부서 / 직위</span>
                    <span className="font-bold text-slate-800 text-sm">{selectedRequest.department}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] mb-0.5">사번/교직원번호</span>
                  <span className="font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100 text-slate-700 block">{selectedRequest.employeeId}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] mb-0.5">전송용 공식 이메일</span>
                  <span className="font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100 text-slate-700 block">{selectedRequest.email}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] mb-0.5">업로드된 스캔 신청서 PDF (보안 임시 저장)</span>
                  <span className="font-mono bg-emerald-50 text-emerald-800 px-2 py-1.5 rounded border border-emerald-100 block truncate flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5" />
                    {selectedRequest.pdfFileName}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] mb-1">인증 발급 신청 구체 사유</span>
                  <p className="bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed text-slate-700">
                    {selectedRequest.reason}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 mt-4 space-y-2">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/api/requests/${selectedRequest.id}/download-draft`;
                      link.setAttribute('download', '');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all text-center text-xs"
                    id="btn-download-draft"
                  >
                    <FileCheck className="w-4 h-4 text-white" />
                    기안문 한글파일(.hwp) 생성 및 다운로드
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/requests/${selectedRequest.id}/notify`, { method: 'POST' });
                        const data = await res.json();
                        if (data.success) {
                          alert(`[발송 완료] ${selectedRequest.email} 주소로 안내 메일이 발송되었습니다.`);
                        }
                      } catch (err) {
                        alert('메일 발송 중 오류가 발생했습니다.');
                      }
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-all text-center text-xs"
                  >
                    <Mail className="w-4 h-4" />
                    신청자 메일 알림 발송
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 text-slate-400 text-xs" id="no-selected-request">
                <AlertTriangle className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                목록의 [상세 보기] 눈 아이콘을 누르면 신청 내용과 실시간 기안 자동화 진행 과정을 모니터링할 수 있습니다.
              </div>
            )}
          </div>

          {/* F-4. 양식 파일 업로드 관리 카드 */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6" id="blank-template-uploader-card">
            <div className="space-y-6">
              {/* 섹션 1: 신청서 빈 양식 */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1.5">
                  <Upload className="w-4 h-4 text-blue-700" />
                  신청서 표준 빈 양식 파일 관리
                </h3>
                <p className="text-slate-500 text-[11px] mb-3 leading-relaxed">
                  신청인용 빈 양식 파일이 개정되거나 양식이 변경될 경우, 이곳에 새로운 표준 양식(PDF 또는 한글 .hwp/.hwpx)을 업로드하십시오.
                </p>

                <form onSubmit={handleTemplateUploadSubmit} className="space-y-3">
                  {templateUploadMsg && (
                    <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                      templateUploadMsg.type === 'success' 
                        ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' 
                        : 'bg-rose-50 border border-rose-100 text-rose-800'
                    }`}>
                      {templateUploadMsg.text}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="file"
                      ref={templateFileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setTemplateFile(e.target.files[0]);
                          setTemplateUploadMsg(null);
                        }
                      }}
                      accept="application/pdf,.hwp,.hwpx"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => templateFileInputRef.current?.click()}
                      className="flex-1 text-xs border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2 px-3 rounded-lg transition-colors truncate text-center"
                    >
                      {templateFile ? templateFile.name : '신규 빈 양식 선택 (PDF / 한글)'}
                    </button>
                    <button
                      type="submit"
                      disabled={!templateFile || isUploadingTemplate}
                      className={`text-xs font-bold py-2 px-4 rounded-lg transition-colors text-center whitespace-nowrap ${
                        !templateFile || isUploadingTemplate
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-700 hover:bg-blue-800 text-white'
                      }`}
                    >
                      {isUploadingTemplate ? '교체 업로드 중...' : '서버 양식 파일 교체'}
                    </button>
                  </div>
                </form>
              </div>

              {/* 섹션 2: 기안문 양식 */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1.5">
                  <FileCheck className="w-4 h-4 text-indigo-700" />
                  결재 기안문 표준 양식 파일 관리
                </h3>
                <p className="text-slate-500 text-[11px] mb-3 leading-relaxed">
                  결재 기안 시 사용할 한글 양식(.hwp, .hwpx)을 업로드해 주세요. <code className="bg-slate-50 text-slate-600 font-semibold px-1 rounded">{"{{성명}}"}</code>, <code className="bg-slate-50 text-slate-600 font-semibold px-1 rounded">{"{{사번}}"}</code>, <code className="bg-slate-50 text-slate-600 font-semibold px-1 rounded">{"{{부서}}"}</code>, <code className="bg-slate-50 text-slate-600 font-semibold px-1 rounded">{"{{신청사유}}"}</code> 등의 변수가 파일 내부에서 자동 치환되어 다운로드됩니다.
                </p>

                <form onSubmit={handleDraftTemplateUploadSubmit} className="space-y-3">
                  {draftTemplateUploadMsg && (
                    <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                      draftTemplateUploadMsg.type === 'success' 
                        ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' 
                        : 'bg-rose-50 border border-rose-100 text-rose-800'
                    }`}>
                      {draftTemplateUploadMsg.text}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="file"
                      ref={draftTemplateFileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setDraftTemplateFile(e.target.files[0]);
                          setDraftTemplateUploadMsg(null);
                        }
                      }}
                      accept=".hwp,.hwpx,.pdf"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => draftTemplateFileInputRef.current?.click()}
                      className="flex-1 text-xs border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2 px-3 rounded-lg transition-colors truncate text-center"
                    >
                      {draftTemplateFile ? draftTemplateFile.name : '기안문 한글 양식 선택 (.hwp / .hwpx)'}
                    </button>
                    <button
                      type="submit"
                      disabled={!draftTemplateFile || isUploadingDraftTemplate}
                      className={`text-xs font-bold py-2 px-4 rounded-lg transition-colors text-center whitespace-nowrap ${
                        !draftTemplateFile || isUploadingDraftTemplate
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-700 hover:bg-indigo-800 text-white'
                      }`}
                    >
                      {isUploadingDraftTemplate ? '업로드 중...' : '기안문 양식 파일 교체'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          {/* Playwright 에뮬레이션 쉘 터미널 */}
          <div className="bg-slate-950 text-emerald-400 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[320px]" id="playwright-terminal">
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <span className="font-mono text-emerald-500 font-bold">Playwright Edge Auto Engine Console</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
            </div>

            <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto space-y-2 select-text" id="terminal-logs-container">
              {selectedRequest ? (
                <>
                  <div className="text-slate-500">--- Playwright 쉘 에뮬레이션 활성화 (신청 건: {selectedRequest.name}) ---</div>
                  {selectedRequest.logs && selectedRequest.logs.length > 0 ? (
                    selectedRequest.logs.map((logLine, idx) => (
                      <div key={idx} className="leading-relaxed border-l-2 border-emerald-900 pl-2">
                        {logLine}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500">기안 자동화 대기 중... 위의 [재생] 단추를 누르면 브라우저 컨트롤러가 기동됩니다.</div>
                  )}
                  {selectedRequest.status === 'drafting' && (
                    <div className="flex items-center gap-2 text-blue-400 animate-pulse mt-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>[Playwright Engine] Edge 인스턴스 원격 제어 신호 대기 중...</span>
                    </div>
                  )}
                  <div ref={terminalEndRef} />
                </>
              ) : (
                <div className="text-slate-500 text-center pt-24">
                  활성화된 모니터링 세션이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
