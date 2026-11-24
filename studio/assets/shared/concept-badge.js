// Shared "concept work" badge for every portfolio mockup in studio/work/<slug>/.
// Include once per mockup:  <script src="../../assets/shared/concept-badge.js" defer></script>
// It adds a small fixed link back to the studio portfolio so visitors always know
// the page is a concept made by the studio, and how to get back.
(function () {
  var STUDIO = '__STUDIO_NAME__';
  var HREF = '../../index.html#work';
  if (document.querySelector('.concept-badge')) return;

  var css = [
    '.concept-badge{position:fixed;z-index:2147483000;left:calc(14px + env(safe-area-inset-left,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));',
    'display:inline-flex;align-items:center;gap:8px;padding:8px 12px 8px 10px;border-radius:999px;',
    'background:rgba(14,14,16,.78);color:#f4f4f2;font:600 12px/1.2 "Noto Sans KR",system-ui,-apple-system,sans-serif;letter-spacing:0;',
    'text-decoration:none;-webkit-backdrop-filter:blur(10px) saturate(140%);backdrop-filter:blur(10px) saturate(140%);',
    'box-shadow:0 0 0 1px rgba(255,255,255,.14),0 6px 18px -6px rgba(0,0,0,.45);transition:transform 160ms cubic-bezier(.23,1,.32,1),background-color 160ms ease}',
    '.concept-badge:hover{background:rgba(14,14,16,.92)}',
    '.concept-badge:active{transform:scale(.97)}',
    '.concept-badge:focus-visible{outline:2px solid #fff;outline-offset:3px}',
    '.concept-badge svg{width:14px;height:14px;flex:none}',
    '.concept-badge .cb-sep{opacity:.5}',
    '@media (max-width:480px){.concept-badge{font-size:11px;padding:7px 10px 7px 8px}.concept-badge .cb-long{display:none}}',
    '@media (prefers-reduced-motion:reduce){.concept-badge{transition:none}}',
  ].join('');

  function mount() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    var a = document.createElement('a');
    a.className = 'concept-badge';
    a.href = HREF;
    a.setAttribute('aria-label', STUDIO + ' 포트폴리오로 돌아가기 (이 페이지는 컨셉 시안입니다)');
    a.innerHTML =
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span>컨셉 시안</span><span class="cb-sep" aria-hidden="true">·</span><span>' + STUDIO + '</span>' +
      '<span class="cb-long"><span class="cb-sep" aria-hidden="true"> · </span>포트폴리오</span>';
    document.body.appendChild(a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
