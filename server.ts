import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { runDraftAutomation } from './server/automation';
import { EPKIRequest } from './src/types';

const app = express();
const PORT = 3000;

// 필요한 디렉토리 생성
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'temp_uploads');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const TEMPLATES_DIR = path.join(PUBLIC_DIR, 'templates');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

// 빈 양식 예시 파일 생성 (사용자 다운로드용)
const templateFilePath = path.join(TEMPLATES_DIR, 'EPKI_Application_Form.pdf');
if (!fs.existsSync(templateFilePath)) {
  fs.writeFileSync(
    templateFilePath,
    '%PDF-1.4\n% EPKI Application Form Blank Template\n4 0 obj\n<< /Type /Page >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF',
    'utf-8'
  );
}

const hwpTemplateFilePath = path.join(TEMPLATES_DIR, 'EPKI_Application_Form.hwp');
if (!fs.existsSync(hwpTemplateFilePath)) {
  fs.writeFileSync(
    hwpTemplateFilePath,
    'EPKI Application Form HWP Blank Template Dummy Content',
    'utf-8'
  );
}

const draftTemplateFilePath = path.join(TEMPLATES_DIR, 'EPKI_Draft_Template.hwp');
if (!fs.existsSync(draftTemplateFilePath)) {
  const defaultDraftHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Malgun Gothic', 'Dotum', sans-serif; line-height: 1.6; margin: 40px; color: #000; }
  .header { text-align: center; font-size: 26px; font-weight: bold; border-bottom: 2px double #000; padding-bottom: 10px; margin-bottom: 20px; }
  .doc-info { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .doc-info th, .doc-info td { border: 1px solid #000; padding: 8px; font-size: 13px; text-align: left; }
  .doc-info th { background-color: #f2f2f2; font-weight: bold; text-align: center; width: 15%; }
  .title-section { font-size: 18px; font-weight: bold; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #1e3a8a; padding-left: 10px; }
  .content-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
  .content-table th, .content-table td { border: 1px solid #000; padding: 12px 10px; font-size: 13px; }
  .content-table th { background-color: #f2f2f2; font-weight: bold; text-align: center; width: 20%; }
  .footer-org { text-align: center; font-size: 22px; font-weight: bold; margin-top: 50px; border-top: 1px solid #000; padding-top: 15px; }
  .stamp { color: red; font-size: 14px; font-weight: bold; border: 2px red solid; padding: 5px; display: inline-block; margin-left: 10px; border-radius: 4px; }
</style>
</head>
<body>
  <div class="header">교 육 부 기 안 문</div>
  <table class="doc-info">
    <tr>
      <th>기안부서</th>
      <td>정보화운영과</td>
      <th>기안자</th>
      <td>시스템 관리자</td>
    </tr>
    <tr>
      <th>기안일자</th>
      <td>{{기안일자}}</td>
      <th>결재상태</th>
      <td>임시저장 (Playwright 자동 기안 완료)</td>
    </tr>
  </table>

  <div class="title-section">제목: EPKI 전자서명인증서 발급 신청에 따른 승인 및 기안의 건</div>
  
  <p style="font-size: 14px;">1. 관련: 교육부 정보보안기본지침 및 행정전자서명(GPKI) 인증업무 지침</p>
  <p style="font-size: 14px;">2. 위 관련 근거에 의거하여, 아래와 같이 교육부 전자서명인증서(EPKI) 발급 및 등록 승인을 기안하오니 재가하여 주시기 바랍니다.</p>

  <table class="content-table">
    <tr>
      <th>신청자 성명</th>
      <td>{{성명}}</td>
    </tr>
    <tr>
      <th>사번 / 교직원번호</th>
      <td>{{사번}}</td>
    </tr>
    <tr>
      <th>소속 부서 / 직위</th>
      <td>{{부서}}</td>
    </tr>
    <tr>
      <th>공식 교직원 이메일</th>
      <td>{{이메일}}</td>
    </tr>
    <tr>
      <th>인증서 용도 및 사유</th>
      <td>{{신청사유}}</td>
    </tr>
    <tr>
      <th>스캔 신청서 첨부</th>
      <td>{{첨부파일명}} (서명 완료본 자동 연동 완료)</td>
    </tr>
  </table>

  <p style="margin-top: 30px; font-size: 13px;">붙임: 교육부 전자서명인증서 발급 신청서(자필서명 스캔본 PDF) 1부.  끝.</p>

  <div class="footer-org">
    교 육 부 장 관 <span class="stamp">직인생략</span>
  </div>
</body>
</html>`;
  fs.writeFileSync(draftTemplateFilePath, defaultDraftHtml, 'utf-8');
}

// 로컬 JSON 데이터베이스 초기화 및 시드 데이터 적재
const DB_PATH = path.join(DATA_DIR, 'db.json');
if (!fs.existsSync(DB_PATH)) {
  const seedData = {
    requests: [
      {
        id: 'req_seed_1',
        name: '홍길동',
        employeeId: '2024-08012',
        department: '정보화운영과',
        reason: '행정업무 처리용 EPKI 개인용 전자서명인증서 갱신 신청',
        pdfFileName: '홍길동_EPKI_신청서_서명완료.pdf',
        pdfFilePath: 'temp_uploads/seed_hong_gildong.pdf',
        email: 'gildong@moe.go.kr',
        status: 'pending',
        processStatus: 'waiting',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        logs: []
      },
      {
        id: 'req_seed_2',
        name: '김서경',
        employeeId: '2025-01044',
        department: '교육행정정보과',
        reason: '신규 임용에 따른 업무포털 및 NEIS 접속용 인증서 발급',
        pdfFileName: '김서경_EPKI_신청서_스캔본.pdf',
        pdfFilePath: 'temp_uploads/seed_kim_seokyung.pdf',
        email: 'seokyung.kim@moe.go.kr',
        status: 'pending',
        processStatus: 'waiting',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
        logs: []
      }
    ]
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(seedData, null, 2), 'utf-8');

  // 시드용 PDF 가짜 파일 생성
  fs.writeFileSync(path.join(UPLOADS_DIR, 'seed_hong_gildong.pdf'), '%PDF-1.4 - Hong Gildong EPKI App', 'utf-8');
  fs.writeFileSync(path.join(UPLOADS_DIR, 'seed_kim_seokyung.pdf'), '%PDF-1.4 - Kim Seokyung EPKI App', 'utf-8');
}

// 헬퍼: DB 읽기 / 쓰기
function getRequests(): EPKIRequest[] {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed.requests || [];
  } catch (err) {
    console.error('DB 로드 에러:', err);
    return [];
  }
}

function saveRequests(requests: EPKIRequest[]) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify({ requests }, null, 2), 'utf-8');
  } catch (err) {
    console.error('DB 저장 에러:', err);
  }
}

// Multer 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// JSON 바디 파서
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 빈 양식 다운로드 정적 서빙
app.use('/templates', express.static(TEMPLATES_DIR));

// ==========================================
// API 엔드포인트 목록
// ==========================================

// F-1. 신청서 접수 및 메일 발송 API
app.post('/api/requests', upload.single('scanFile'), async (req, res) => {
  try {
    const { name, employeeId, department, reason, email } = req.body;
    const file = req.file;

    if (!name || !employeeId || !department || !reason || !email) {
      return res.status(400).json({ error: '모든 필수 입력 필드를 기입해 주세요.' });
    }
    if (!file) {
      return res.status(400).json({ error: '신청서 스캔 PDF 파일을 업로드해 주세요.' });
    }

      const newRequest: EPKIRequest = {
        id: 'req_' + Math.random().toString(36).substring(2, 11),
        name,
        employeeId,
        department,
        reason,
        pdfFileName: file.originalname,
        pdfFilePath: path.relative(process.cwd(), file.path),
        email,
        status: 'pending',
        processStatus: 'waiting',
        createdAt: new Date().toISOString(),
        logs: []
      };

    const requests = getRequests();
    requests.unshift(newRequest);
    saveRequests(requests);

    // Nodemailer 이메일 전송 트리거 (가이드 메일 발송)
    let emailSent = false;
    let emailLogs = '';

    try {
      // 보안환경 설정 및 SMTP 연결 구성 (기본적으로 테스트 계정 구성 또는 데모 로깅)
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || 'demo_user',
          pass: process.env.SMTP_PASS || 'demo_pass'
        }
      });

      const mailOptions = {
        from: `"교육부 EPKI 자동화본부" <epki-noreply@moe.go.kr>`,
        to: email,
        subject: `[교육부 EPKI] ${name}님의 전자서명인증서 발급 신청 안내`,
        html: `
          <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">EPKI 전자서명인증서 신청 접수 완료</h2>
            <p>안녕하세요, <strong>${department} ${name}</strong>님.</p>
            <p>제출하신 전자서명인증서(EPKI) 발급 신청서 스캔본이 정상적으로 접수되었습니다.</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
               <h3 style="margin-top: 0; color: #1f2937;">[신청 정보 요약]</h3>
               <ul style="list-style-type: none; padding-left: 0; line-height: 1.6;">
                 <li>• <strong>성명:</strong> ${name}</li>
                 <li>• <strong>사번/교직원번호:</strong> ${employeeId}</li>
                 <li>• <strong>부서:</strong> ${department}</li>
                 <li>• <strong>첨부파일:</strong> ${file.originalname}</li>
               </ul>
            </div>

            <h3 style="color: #1e3a8a;">이후 발급 단계 및 사용자 액션 매뉴얼</h3>
            <ol style="line-height: 1.7; padding-left: 20px;">
              <li>신청 정보는 관리자가 검증 후 <strong>Playwright 자동화 엔진</strong>을 통해 교육부 그룹웨어 통합 기안 시스템에 임시 저장 및 결재 승인 상정됩니다.</li>
              <li>상정 기안이 최종 승인 완료되면 입력하신 교직원 메일로 <strong>임시 인가 코드 및 인증서 발급 승인서</strong>가 추가 전달됩니다.</li>
              <li>승인서를 받으신 후 교육부 인증센터 웹사이트에 접속하여 전자서명인증서를 안전하게 로컬 PC 또는 보안 토큰에 저장(다운로드)해 주시기 바랍니다.</li>
            </ol>
            
            <p style="margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px;">
              본 메일은 시스템에 의해 자동으로 발송되는 안내 메일입니다. 문의사항이 있으실 경우 IT 지원부서(내선 1004)로 연락 바랍니다.
            </p>
          </div>
        `
      };

      // 데모 환경이거나 실제 설정이 없는 경우 콘솔 모킹하고 진행
      if (!process.env.SMTP_HOST || process.env.SMTP_HOST.includes('ethereal')) {
        emailLogs = `[이메일 데모 모드] Ethereal/데모 이메일이 '${email}' 주소로 정상 트래킹되었습니다. (SMTP 실연동 시 즉시 발송됨)`;
        console.log(emailLogs);
        console.log('--- EMAIL TEMPLATE START ---');
        console.log(`To: ${email}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log('--- EMAIL TEMPLATE END ---');
        emailSent = true;
      } else {
        await transporter.sendMail(mailOptions);
        emailLogs = `[SMTP 발송 성공] '${email}' 주소로 발급 가이드 메일을 즉시 발송하였습니다.`;
        emailSent = true;
      }
    } catch (mailError: any) {
      console.error('메일 전송 실패:', mailError);
      emailLogs = `[이메일 전송 보류] SMTP 서버 연결 실패 또는 미설정: ${mailError.message}`;
    }

    return res.status(201).json({
      success: true,
      message: '신청서가 성공적으로 접수되었습니다.',
      request: newRequest,
      emailSent,
      emailLogs
    });

  } catch (error: any) {
    console.error('신청 처리 실패:', error);
    return res.status(500).json({ error: '신청 처리 중 치명적인 서버 오류가 발생했습니다.' });
  }
});

// F-2. 대기 목록 조회 API
app.get('/api/requests', (req, res) => {
  const requests = getRequests();
  res.json({ requests });
});

// F-3. Playwright 기안 자동화 실행 API
app.post('/api/requests/:id/draft', async (req, res) => {
  const { id } = req.params;
  const requests = getRequests();
  const targetRequest = requests.find(r => r.id === id);

  if (!targetRequest) {
    return res.status(404).json({ error: '해당 신청 건을 찾을 수 없습니다.' });
  }

  if (targetRequest.status === 'drafting') {
    return res.status(400).json({ error: '이미 기안 자동화가 진행 중입니다.' });
  }

  // 실시간 로그 처리를 위해 비동기로 실행하고 우선 접수 응답
  res.json({ success: true, message: '기안 자동화 엔진이 성공적으로 구동되었습니다.' });

  // 백그라운드 구동
  runDraftAutomation(targetRequest, (logLine) => {
    // 내부 로그가 찍힐 때마다 로깅 처리
    console.log(`[Engine Log] ${logLine}`);
  }).catch(err => {
    console.error('기안 백그라운드 엔진 오류:', err);
  });
});

// F-3b. 처리 상태 업데이트 API
app.post('/api/requests/:id/status', (req, res) => {
  const { id } = req.params;
  const { processStatus } = req.body;

  if (!processStatus || !['waiting', 'received', 'issued'].includes(processStatus)) {
    return res.status(400).json({ error: '유효하지 않은 상태값입니다. (waiting/received/issued)' });
  }

  const requests = getRequests();
  const target = requests.find(r => r.id === id);
  if (!target) {
    return res.status(404).json({ error: '해당 신청 건을 찾을 수 없습니다.' });
  }

  target.processStatus = processStatus;
  saveRequests(requests);

  return res.json({ success: true, message: `처리 상태가 업데이트되었습니다.`, request: target });
});

// F-3c. 기안문 생성 안내 메일 발송 API
app.post('/api/requests/:id/notify', async (req, res) => {
  try {
    const { id } = req.params;
    const requests = getRequests();
    const target = requests.find(r => r.id === id);

    if (!target) {
      return res.status(404).json({ error: '해당 신청 건을 찾을 수 없습니다.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'demo_user',
        pass: process.env.SMTP_PASS || 'demo_pass'
      }
    });

    const mailOptions = {
      from: `"교육부 EPKI 자동화본부" <epki-noreply@moe.go.kr>`,
      to: target.email,
      subject: `[교육부 EPKI] ${target.name}님의 기안문이 생성되었습니다`,
      html: `
        <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">EPKI 기안문 생성 완료 안내</h2>
          <p>안녕하세요, <strong>${target.department} ${target.name}</strong>님.</p>
          <p>${target.name}님의 EPKI 전자서명인증서 발급 신청에 대한 기안문이 생성되었습니다.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
             <h3 style="margin-top: 0; color: #1f2937;">[기안 정보 요약]</h3>
             <ul style="list-style-type: none; padding-left: 0; line-height: 1.6;">
               <li>• <strong>성명:</strong> ${target.name}</li>
               <li>• <strong>사번/교직원번호:</strong> ${target.employeeId}</li>
               <li>• <strong>부서:</strong> ${target.department}</li>
               <li>• <strong>신청사유:</strong> ${target.reason}</li>
             </ul>
          </div>

          <p>기안문이 정상적으로 생성되어 관리자 승인을 대기 중입니다. 승인 완료 후 별도 안내 메일이 발송될 예정입니다.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            본 메일은 시스템에 의해 자동으로 발송되는 안내 메일입니다. 문의사항이 있으실 경우 IT 지원부서(내선 1004)로 연락 바랍니다.
          </p>
        </div>
      `
    };

    let emailSent = false;
    let emailLog = '';

    if (!process.env.SMTP_HOST || process.env.SMTP_HOST.includes('ethereal')) {
      emailLog = `[이메일 데모 모드] ${target.email} 주소로 안내 메일이 트래킹되었습니다.`;
      console.log(emailLog);
      console.log(`--- NOTIFY EMAIL TO: ${target.email} ---`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('--- NOTIFY EMAIL END ---');
      emailSent = true;
    } else {
      await transporter.sendMail(mailOptions);
      emailLog = `[SMTP 발송 성공] ${target.email} 주소로 기안문 생성 안내 메일을 발송하였습니다.`;
      emailSent = true;
    }

    return res.json({ success: true, emailSent, emailLog });
  } catch (error: any) {
    console.error('안내 메일 발송 실패:', error);
    return res.status(500).json({ error: '메일 발송 중 오류가 발생했습니다.' });
  }
});

// F-2. 개인정보 및 임시 파일 영구 소멸 파기 API
app.delete('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const requests = getRequests();
    const index = requests.findIndex(r => r.id === id);

    if (index === -1) {
      return res.status(404).json({ error: '삭제할 대상 신청 건을 찾을 수 없습니다.' });
    }

    const target = requests[index];

    // 로컬 디바이스에 존재하던 PDF 스캔 파일을 안전하게 영구 영 소멸시킴 (fs.unlink)
    const filePath = path.resolve(target.pdfFilePath);
    let fileDeleted = false;
    let fileLog = '';

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        fileDeleted = true;
        fileLog = `로컬 임시 디렉토리에서 PDF 스캔 파일(${target.pdfFileName})을 영구 파기 소멸하였습니다.`;
      } catch (fileErr: any) {
        console.error('파일 영구 소멸 중 에러:', fileErr);
        fileLog = `로컬 파일 파기 도중 예외가 발생했습니다: ${fileErr.message}`;
      }
    } else {
      fileLog = '디스크 상에 파일이 존재하지 않아 DB 정보만 파기합니다.';
    }

    // DB 데이터 소멸
    requests.splice(index, 1);
    saveRequests(requests);

    return res.json({
      success: true,
      message: `신청자 ${target.name}님의 기록 및 관련 개인정보 PDF 스캔본이 정상적으로 영구 영 소멸되었습니다.`,
      fileDeleted,
      fileLog
    });

  } catch (error: any) {
    console.error('개인정보 파기 실패:', error);
    return res.status(500).json({ error: '개인정보 파기 소멸 작업 중 서버 오류가 발생했습니다.' });
  }
});

// F-4. 관리자용 빈 신청서 양식(PDF/한글) 교체 업로드 API
const templateUpload = multer({ storage: multer.memoryStorage() });
app.post('/api/templates/upload', templateUpload.single('templateFile'), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: '업로드할 빈 양식 파일을 선택해 주세요.' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' && ext !== '.hwp' && ext !== '.hwpx') {
      return res.status(400).json({ error: 'PDF 또는 한글 파일(.hwp, .hwpx) 형식만 업로드할 수 있습니다.' });
    }

    const targetFileName = `EPKI_Application_Form${ext}`;
    const targetPath = path.join(TEMPLATES_DIR, targetFileName);
    fs.writeFileSync(targetPath, file.buffer);

    console.log(`[양식 업데이트] 관리자가 표준 신청서 빈양식(${ext.toUpperCase()})을 변경 업로드하였습니다.`);
    return res.json({
      success: true,
      message: `신청서 표준 빈 양식(${ext.toUpperCase()})이 성공적으로 업데이트되었습니다.`
    });
  } catch (err: any) {
    console.error('양식 업로드 실패:', err);
    return res.status(500).json({ error: '양식 파일 저장 중 예외가 발생했습니다.' });
  }
});

// F-5. 빈 양식 목록 조회 API
app.get('/api/templates', (req, res) => {
  try {
    const files = fs.readdirSync(TEMPLATES_DIR);
    const templates = files
      .filter(file => (file.endsWith('.pdf') || file.endsWith('.hwp') || file.endsWith('.hwpx')) && file.startsWith('EPKI_Application_Form'))
      .map(file => {
        let ext = 'pdf';
        if (file.endsWith('.hwp')) ext = 'hwp';
        if (file.endsWith('.hwpx')) ext = 'hwpx';
        const stats = fs.statSync(path.join(TEMPLATES_DIR, file));
        return {
          filename: file,
          ext,
          size: stats.size,
          mtime: stats.mtime
        };
      });
    return res.json({ templates });
  } catch (err: any) {
    return res.status(500).json({ error: '양식 목록을 가져오는 중 오류가 발생했습니다.' });
  }
});

// F-6. 관리자용 기안문 표준 양식(HWP/HWPX) 교체 업로드 API
app.post('/api/templates/draft/upload', templateUpload.single('draftTemplateFile'), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: '업로드할 기안문 양식 파일을 선택해 주세요.' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.hwp' && ext !== '.hwpx' && ext !== '.pdf') {
      return res.status(400).json({ error: '한글 파일(.hwp, .hwpx) 또는 PDF 형식만 업로드할 수 있습니다.' });
    }

    // 기존 템플릿 파일 삭제 (다른 확장자끼리 충돌하지 않도록)
    const extensions = ['.hwp', '.hwpx', '.pdf'];
    for (const e of extensions) {
      const p = path.join(TEMPLATES_DIR, `EPKI_Draft_Template${e}`);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }

    const targetFileName = `EPKI_Draft_Template${ext}`;
    const targetPath = path.join(TEMPLATES_DIR, targetFileName);
    fs.writeFileSync(targetPath, file.buffer);

    console.log(`[기안 양식 업데이트] 관리자가 기안문 표준양식(${ext.toUpperCase()})을 변경 업로드하였습니다.`);
    return res.json({
      success: true,
      message: `기안문 표준 양식(${ext.toUpperCase()})이 성공적으로 업데이트되었습니다.`
    });
  } catch (err: any) {
    console.error('기안 양식 업로드 실패:', err);
    return res.status(500).json({ error: '기안 양식 파일 저장 중 예외가 발생했습니다.' });
  }
});

// F-7. 특정 신청 정보가 채워진 기안문(.hwp / .hwpx) 다운로드 API
app.get('/api/requests/:id/download-draft', (req, res) => {
  try {
    const { id } = req.params;
    const requests = getRequests();
    const target = requests.find(r => r.id === id);

    if (!target) {
      return res.status(404).json({ error: '해당 신청 건을 찾을 수 없습니다.' });
    }

    // 1. 현재 존재하는 기안 템플릿 탐색 (.hwp, .hwpx, .pdf 순서)
    let templateFile = 'EPKI_Draft_Template.hwp';
    let ext = '.hwp';
    if (fs.existsSync(path.join(TEMPLATES_DIR, 'EPKI_Draft_Template.hwpx'))) {
      templateFile = 'EPKI_Draft_Template.hwpx';
      ext = '.hwpx';
    } else if (fs.existsSync(path.join(TEMPLATES_DIR, 'EPKI_Draft_Template.pdf'))) {
      templateFile = 'EPKI_Draft_Template.pdf';
      ext = '.pdf';
    }

    const templatePath = path.join(TEMPLATES_DIR, templateFile);
    let fileBuffer = fs.readFileSync(templatePath);

    // 치환용 메타데이터 맵핑
    const today = new Date();
    const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    
    const replacements = {
      '{{성명}}': target.name,
      '{{사번}}': target.employeeId,
      '{{부서}}': target.department,
      '{{이메일}}': target.email,
      '{{신청사유}}': target.reason,
      '{{기안일자}}': formattedDate,
      '{{첨부파일명}}': target.pdfFileName,
      // 백업 괄호용 패턴 매칭
      '[성명]': target.name,
      '[사번]': target.employeeId,
      '[부서]': target.department,
      '[이메일]': target.email,
      '[신청사유]': target.reason,
      '[기안일자]': formattedDate,
      '[첨부파일명]': target.pdfFileName,
    };

    // 만약 한글(HWP, HWPX) 템플릿이라면 텍스트 치환을 에뮬레이트
    // (사용자가 한글 기안 양식을 직접 올린 경우에도 빈칸이 안전하게 치환되도록 지원)
    let finalBuffer = fileBuffer;
    if (ext === '.hwp' || ext === '.hwpx') {
      let textUtf8 = fileBuffer.toString('utf8');
      let textUtf16 = fileBuffer.toString('utf16le');
      let isUtf16 = textUtf16.includes('기안') || textUtf16.includes('성명') || textUtf16.includes('{{') || textUtf16.includes('[');

      if (isUtf16) {
        for (const [k, v] of Object.entries(replacements)) {
          textUtf16 = textUtf16.split(k).join(v);
        }
        finalBuffer = Buffer.from(textUtf16, 'utf16le');
      } else {
        for (const [k, v] of Object.entries(replacements)) {
          textUtf8 = textUtf8.split(k).join(v);
        }
        finalBuffer = Buffer.from(textUtf8, 'utf8');
      }
    }

    const downloadName = `${target.name}_EPKI_기안서_승인본${ext}`;
    
    res.setHeader('Content-disposition', 'attachment; filename=' + encodeURIComponent(downloadName));
    res.setHeader('Content-type', ext === '.hwpx' ? 'application/halxml' : 'application/x-hwp');
    return res.send(finalBuffer);

  } catch (err: any) {
    console.error('기안문 다운로드 생성 오류:', err);
    return res.status(500).json({ error: '기안문 파일 생성 중 서버 오류가 발생했습니다.' });
  }
});


// ==========================================
// Vite 개발 서버 및 운영 빌드 파일 서빙 미들웨어
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
