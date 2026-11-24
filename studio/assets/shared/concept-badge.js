// Shared "concept work" badge for every portfolio mockup in studio/work/<slug>/.
// Include once per mockup, before </body>:
//   <script src="../../assets/shared/concept-badge.js" defer></script>
// It adds a small fixed link back to the studio portfolio so visitors always know the page is a
// concept made by the studio, and how to get back. Look follows PLAN.md 4.2 (studio ink + yellow corner).
// With ?shot=1 in the URL (thumbnail capture) it adds html.is-shot and stays hidden.
(function () {
  var STUDIO = '첫화면 스튜디오';
  var HREF = '../../index.html#work';
  var root = document.documentElement;
  if (/[?&]shot=1/.test(location.search)) root.classList.add('is-shot');
  if (document.querySelector('.concept-badge')) return;

  var css = [
    '.concept-badge{position:fixed;z-index:2147483000;left:calc(16px + env(safe-area-inset-left,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));',
    'box-sizing:border-box;display:inline-flex;align-items:center;gap:8px;height:36px;max-width:calc(100vw - 32px);padding:0 12px;border-radius:999px;',
    'background:rgba(15,26,58,.92);color:#fff;border:1px solid rgba(255,255,255,.18);box-shadow:0 2px 8px rgba(0,0,0,.18);',
    'font:500 13px/1 system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;letter-spacing:0;white-space:nowrap;text-decoration:none;',
    '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:background-color 150ms ease,transform 150ms cubic-bezier(.22,1,.36,1)}',
    '.concept-badge__mark{position:relative;flex:none;width:10px;height:10px;border-left:2px solid #F4E84A;border-top:2px solid #F4E84A;box-sizing:border-box;transition:transform 150ms cubic-bezier(.22,1,.36,1)}',
    '.concept-badge__text{overflow:hidden;text-overflow:ellipsis}',
    '.concept-badge:hover{background:rgb(15,26,58)}',
    '.concept-badge:hover .concept-badge__mark{transform:translate(-2px,-2px)}',
    '.concept-badge:active{transform:scale(.97)}',
    '.concept-badge:focus-visible{outline:2px solid #F4E84A;outline-offset:2px}',
    'html.is-shot .concept-badge{display:none}',
    '@media print{.concept-badge{display:none}}',
    '@media (prefers-reduced-motion:reduce){.concept-badge,.concept-badge__mark{transition:none}}',
  ].join('');

  function mount() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    var a = document.createElement('a');
    a.className = 'concept-badge';
    a.href = HREF;
    a.setAttribute('aria-label', '컨셉 시안입니다. ' + STUDIO + ' 포트폴리오로 돌아가기');
    a.innerHTML = '<span class="concept-badge__mark" aria-hidden="true"></span>' +
      '<span class="concept-badge__text">컨셉 시안 · ' + STUDIO + '</span>';
    document.body.appendChild(a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
