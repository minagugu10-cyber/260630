import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, CheckCircle, Mail, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ApplyFormProps {
  onSuccess: () => void;
}

interface TemplateInfo {
  filename: string;
  ext: string;
  size: number;
  mtime: string;
}

export default function ApplyForm({ onSuccess }: ApplyFormProps) {
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState('');
  const [scanFile, setScanFile] = useState<File | null>(null);
  
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    emailLogs: string;
    request: any;
  } | null>(null);

  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
        if (data.templates) {
          setTemplates(data.templates);
        }
      })
      .catch(err => console.error('Error fetching templates:', err));
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setScanFile(file);
        setErrorMessage('');
      } else {
        setErrorMessage('PDF 파일 형식만 업로드 가능합니다.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setScanFile(file);
        setErrorMessage('');
      } else {
        setErrorMessage('PDF 파일 형식만 업로드 가능합니다.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !employeeId || !department || !reason || !email || !scanFile) {
      setErrorMessage('모든 항목을 기입하고 신청서 PDF를 업로드해 주세요.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('employeeId', employeeId);
    formData.append('department', department);
    formData.append('reason', reason);
    formData.append('email', email);
    formData.append('scanFile', scanFile);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '접수 중 오류가 발생했습니다.');
      }

      setSuccessInfo({
        message: data.message,
        emailLogs: data.emailLogs,
        request: data.request
      });
      
      // 입력 폼 리셋
      setName('');
      setEmployeeId('');
      setDepartment('');
      setReason('');
      setEmail('');
      setScanFile(null);
      
      // 상위 컴포넌트 목록 자동 리프레시 유도
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || '네트워크 통신 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-w-2xl mx-auto" id="apply-form-container">
      {/* 폼 헤더 - 모바일 패딩 및 폰트 크기 최적화 */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-5 sm:px-8 py-5 sm:py-6 text-white text-center">
        <h2 className="text-lg sm:text-2xl font-bold tracking-normal leading-snug">EPKI 전자서명인증서 발급 신청</h2>
        <p className="text-blue-100 text-[11px] sm:text-sm mt-2 font-light leading-relaxed">
          <span className="block">교육부 전자서명인증서(EPKI) 빈 신청서 양식을 작성하고,</span>
          <span className="block">서명 완료된 스캔본(PDF)을 제출해 주세요.</span>
        </p>
      </div>

      <div className="p-5 sm:p-8">
        {/* F-1. 빈 양식 파일 다운로드 링크 */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 sm:p-4 mb-5 sm:mb-6 flex items-start gap-3 sm:gap-4" id="template-download-section">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-700 shrink-0">
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-800 text-xs sm:text-sm leading-snug">신청서 HWP/PDF 빈 양식 다운로드</h4>
            <p className="text-slate-600 text-[10px] sm:text-xs mt-1 leading-normal">
              작성 및 자필서명 전 교육부 표준 서명인증서 양식을 즉시 내려받으세요.
            </p>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {templates.length > 0 ? (
                templates.map(t => (
                  <a
                    key={t.filename}
                    href={`/templates/${t.filename}`}
                    download={t.filename}
                    className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs bg-blue-700 hover:bg-blue-800 text-white font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    id={`btn-download-${t.ext}`}
                  >
                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {t.ext.toUpperCase()} 양식 다운로드
                  </a>
                ))
              ) : (
                <a
                  href="/templates/EPKI_Application_Form.pdf"
                  download="EPKI_신청서_빈양식.pdf"
                  className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs bg-blue-700 hover:bg-blue-800 text-white font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                  id="btn-download-pdf"
                >
                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  PDF 양식 다운로드
                </a>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {successInfo ? (
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 text-center"
              id="success-info-panel"
            >
              <div className="mx-auto bg-emerald-100 text-emerald-600 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">EPKI 신청서 접수 성공!</h3>
              <p className="text-slate-600 text-sm mt-2">
                신청 내용이 서버 내 보안 임시 저장소에 안전하게 업로드되었습니다.
              </p>

              {/* 안내 메일 트리거 시뮬레이션 및 실제 전송 상태 시각화 */}
              <div className="bg-white border border-slate-100 rounded-xl p-4 my-5 text-left text-xs" id="email-log-panel">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-2">
                  <Mail className="w-4 h-4" />
                  실시간 이메일 발송 결과 로그
                </div>
                <p className="text-slate-700 leading-relaxed font-mono bg-slate-50 p-2.5 rounded border border-slate-100">
                  {successInfo.emailLogs}
                </p>
                <div className="mt-3 text-slate-600 space-y-1">
                  <p>• <strong>수신 이메일:</strong> {successInfo.request.email}</p>
                  <p>• <strong>발송 매뉴얼:</strong> 이메일 발송 즉시 EPKI 기안 상정 및 가이드 안내가 적용되었습니다.</p>
                </div>
              </div>

              <button
                onClick={() => setSuccessInfo(null)}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                id="btn-new-apply"
              >
                추가 신청서 작성하기
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="apply-inputs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-5"
              id="form-apply-inputs"
            >
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-700 text-xs flex items-center gap-2" id="form-error-msg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5">성명 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/50"
                    required
                    id="input-name"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5">교직원번호 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="예: 2024-01042"
                    className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/50"
                    required
                    id="input-emp-id"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5">소속 부서 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="예: 기획예산성과관리팀"
                    className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/50"
                    required
                    id="input-dept"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5">공식 이메일 주소 <span className="text-rose-500">*</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="예: apple@korea.ac.kr"
                    className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/50"
                    required
                    id="input-email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1.5">신청 구체 사유 <span className="text-rose-500">*</span></label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="예: 신규 발급, 저장매체 파손, 인증서 기간 만료, 갱신 등"
                  rows={3}
                  className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/50"
                  required
                  id="textarea-reason"
                />
              </div>

              {/* 드래그 앤 드롭 파일 업로드 컴포넌트 (USABILITY PATTERNS 규칙 준수) */}
              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1.5">
                  신청서 PDF 스캔 파일 업로드 <span className="text-rose-500">*</span>
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50'
                      : scanFile
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
                  }`}
                  id="drop-upload-zone"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf"
                    className="hidden"
                    id="input-file-native"
                  />
                  
                  {scanFile ? (
                    <div className="flex flex-col items-center justify-center gap-1.5" id="file-selected-view">
                      <div className="bg-emerald-100 p-2 sm:p-3 rounded-full text-emerald-600">
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
                      </div>
                      <p className="font-medium text-slate-800 text-xs sm:text-sm mt-1 truncate max-w-xs">{scanFile.name}</p>
                      <p className="text-slate-500 text-[10px] sm:text-xs">{(scanFile.size / 1024).toFixed(1)} KB (마우스 클릭하여 변경 가능)</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5" id="file-unselected-view">
                      <div className="bg-slate-100 p-2 sm:p-3 rounded-full text-slate-500">
                        <Upload className="w-6 h-6 sm:w-8 sm:h-8" />
                      </div>
                      <p className="font-semibold text-slate-700 text-xs sm:text-sm mt-1">파일 드래그 앤 드롭 또는 이곳을 클릭</p>
                      <p className="text-slate-500 text-[10px] sm:text-xs">자필 서명이 기재된 PDF 스캔본 파일만 업로드할 수 있습니다.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex items-center justify-center gap-2 text-xs sm:text-sm text-white font-bold py-2.5 sm:py-3 px-4 rounded-xl transition-all shadow-md ${
                    isSubmitting
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-blue-700 hover:bg-blue-800 active:scale-[0.99]'
                  }`}
                  id="btn-submit-apply"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      신청서 서버 업로드 및 가이드 발송 중...
                    </>
                  ) : (
                    'EPKI 신청서 접수 및 메일 발송'
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
