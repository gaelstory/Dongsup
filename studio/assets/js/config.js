/*
 * 첫화면 스튜디오 사이트 설정
 *
 * ★ 표시가 있는 값은 실제 정보로 바꿔야 하는 자리표시자입니다. 자리표시자가 남아 있으면
 *   브라우저 개발자 도구 콘솔에 "[studio] config.js 자리표시자: ..." 경고가 한 줄 뜹니다.
 *   이 파일을 바꾸면 페이지의 이메일, 전화, 카카오톡 버튼, 푸터 사업자 정보가 함께 바뀝니다.
 *   (index.html에도 같은 값이 기본값으로 적혀 있습니다. 스크립트가 꺼진 환경까지 맞추려면 그곳도 함께 고치세요.)
 *
 * 가격은 이 파일이 아니라 index.html의 #pricing 섹션 한 곳에서만 고칩니다.
 */
window.STUDIO_CONFIG = {
  name: "첫화면 스튜디오",
  nameEn: "First Screen Studio",

  email: "hello@example.com",        // ★ [입력 필요] 상담을 받을 이메일 주소
  phone: "010-0000-0000",            // ★ [입력 필요] 상담 전화번호 (문자 의뢰서도 이 번호로 갑니다)
  kakaoUrl: "",                      // ★ [입력 필요] 카카오톡 채널 URL (예: https://pf.kakao.com/_xxxxx)
                                     //   비어 있으면 카톡 버튼을 모두 숨기고, "카카오톡으로" 안내 문구도 "전화로/이메일로"로 바뀝니다.

  hours: "평일 10:00~19:00",
  replyPromise: "영업일 기준 24시간 안에",

  /*
   * 의뢰서 자동 접수 (선택)
   * 비어 있으면: 제출 버튼이 "의뢰서 완성하기"가 되고, 완성된 의뢰서를 메일 앱/문자/복사로 보내는 화면이 나옵니다.
   * 채우면: 제출 버튼이 "의뢰서 보내기"가 되고, 아래 주소로 바로 전송합니다.
   *
   * [방법 1] Formspree (가장 간단, 이메일로 받기)
   *   1. formspree.io 에 가입하고 New Form을 만듭니다. 받을 이메일 주소를 인증합니다.
   *   2. 폼 주소(https://formspree.io/f/xxxxxxx)를 복사해 FORM_ENDPOINT에 넣습니다.
   *   3. FORM_ENDPOINT_FORMAT은 "json" 그대로 둡니다.
   *   4. FORM_PROCESSOR에 "Formspree (미국 소재, 의뢰서 접수와 전달)"처럼 적습니다. 개인정보 안내에 처리 위탁으로 표시됩니다.
   *
   * [방법 2] 구글 Apps Script 웹 앱 (구글 시트에 쌓기)
   *   1. 구글 시트를 하나 만들고 [확장 프로그램 > Apps Script]를 엽니다.
   *   2. 아래 코드를 붙여 넣고 저장합니다.
   *        function doPost(e) {
   *          var p = e.parameter;
   *          SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([
   *            new Date(), p.name, p.phone, p.email, p.replyBy, p.industry, p.package, p.budget,
   *            p.timeline, p.likedWorks, p.reference, p.features, p.materials, p.message, p.consentAt
   *          ]);
   *          return ContentService.createTextOutput('{"ok":true}').setMimeType(ContentService.MimeType.JSON);
   *        }
   *   3. [배포 > 새 배포 > 유형: 웹 앱], 실행 사용자 "나", 액세스 권한 "모든 사용자"로 배포합니다.
   *   4. 나오는 웹 앱 URL(https://script.google.com/macros/s/.../exec)을 FORM_ENDPOINT에 넣고,
   *      FORM_ENDPOINT_FORMAT을 "form"으로 바꿉니다.
   *   5. FORM_PROCESSOR에 "Google (구글 시트에 의뢰서 보관)"처럼 적습니다.
   *
   * 연결한 뒤에는 실제로 한 번 제출해서 메일이나 시트에 들어오는지 꼭 확인하세요.
   */
  FORM_ENDPOINT: "",
  FORM_ENDPOINT_FORMAT: "json",      // "json" (Formspree 등) 또는 "form" (구글 Apps Script 등, URL 인코딩 폼)
  FORM_PROCESSOR: "",                // 외부 폼 서비스를 쓰면 서비스 이름. 개인정보 안내에 "처리 위탁" 행으로 나옵니다

  // "상담부터 제작까지 한 사람이 맡습니다" 약속 행. 대표 한 사람이 직접 상담하고 만드는 경우에만 true로 두세요.
  // business.owner에 실제 이름이 들어가야 보입니다.
  oneMaker: true,

  business: {
    company: "첫화면 스튜디오",
    owner: "[대표자명]",             // ★ [입력 필요]
    regNo: "[000-00-00000]",         // ★ [입력 필요] 사업자등록번호
    address: "[사업장 주소]",          // ★ [입력 필요]
    mailOrderNo: ""                  // 통신판매업 신고번호. 있을 때만 푸터에 표시됩니다
  }
};
