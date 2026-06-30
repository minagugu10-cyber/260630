export interface EPKIRequest {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  reason: string;
  pdfFileName: string;
  pdfFilePath: string;
  email: string;
  status: 'pending' | 'drafting' | 'completed' | 'failed';
  processStatus: 'waiting' | 'received' | 'issued';
  createdAt: string;
  logs?: string[];
}

export interface SelectorConfig {
  loginUrl: string;
  draftUrl: string;
  usernameInput: string;
  passwordInput: string;
  loginButton: string;
  titleInput: string;
  nameInput: string;
  employeeIdInput: string;
  departmentInput: string;
  reasonInput: string;
  fileInput: string;
  restrictedCheckbox: string;
  saveDraftButton: string;
  alertOkButton: string;
}
