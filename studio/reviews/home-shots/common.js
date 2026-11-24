const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { spawn } = require('child_process');
const PORT = 8791;
exports.URL = `http://127.0.0.1:${PORT}/index.html`;
exports.start = async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: '/home/user/Dongsup/studio', stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  return { browser, stop: async () => { await browser.close(); srv.kill(); } };
};
exports.shot = (page, name, opts) => page.screenshot(Object.assign({ path: __dirname + '/shots/' + name + '.jpg', type: 'jpeg', quality: 70 }, opts || {}));
exports.sleep = ms => new Promise(r => setTimeout(r, ms));
