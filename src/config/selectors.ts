import { SelectorConfig } from '../types';

/**
 *자체 개발 그룹웨어 결재 시스템의 UI 변경 유연성을 고려한 웹 요소 셀렉터 설정
 *그룹웨어 개편 시 이 파일의 셀렉터만 수정하여 유지보수할 수 있습니다.
 */
export const selectors: SelectorConfig = {
  // 로그인 페이지 관련
  loginUrl: 'https://groupware.moe.go.kr/login',
  usernameInput: '#userId',
  passwordInput: '#userPassword',
  loginButton: '#btn-login',

  // 기안 작성 페이지 관련
  draftUrl: 'https://groupware.moe.go.kr/approval/draft',
  titleInput: '#draft-title',
  
  // 신청인 정보 기입 필드
  nameInput: 'input[name="applicant_name"]',
  employeeIdInput: 'input[name="applicant_emp_id"]',
  departmentInput: 'input[name="applicant_dept"]',
  reasonInput: 'textarea[name="draft_reason"]',
  
  // 파일 업로드 및 옵션
  fileInput: 'input[type="file"]#attach-file',
  restrictedCheckbox: '#chk-security-restrict', // 보안 열람 제한 / 비공개 설정 체크박스
  
  // 저장 및 승인
  saveDraftButton: 'button#btn-save-temp', // 임시 저장 버튼
  alertOkButton: '.modal-alert-ok' // 성공 알림 모달의 '확인' 버튼
};
