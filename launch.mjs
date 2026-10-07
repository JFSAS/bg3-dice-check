import {spawn, execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
let port = Number(process.env.PORT || 4173);
const open = url => {
  const command = process.platform === 'win32' ? 'powershell.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['-NoProfile', '-Command', `Start-Process '${url}'`] : [url];
  execFile(command, args, error => {if (error) console.log(`请手动打开 ${url}`);});
};
// Reuse this project's running server; avoid opening an unrelated service.
for (; port < 65536; port++) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, {signal: AbortSignal.timeout(1000)});
    if ((await response.text()).includes('<title>命运之骰 · D20 检定</title>')) {
      open(`http://127.0.0.1:${port}/`);
      console.log(`已打开正在运行的命运之骰：http://127.0.0.1:${port}/`);
      process.exit(0);
    }
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') break;
  }
}
if (port >= 65536) throw Error('没有可用的本地端口');
const server = spawn(process.execPath, [join(root, 'server.mjs')], {cwd: root, env: {...process.env, PORT: String(port)}, stdio: ['inherit', 'pipe', 'inherit']});
let opened = false;
server.stdout.on('data', bytes => {
  process.stdout.write(bytes);
  if (!opened && bytes.toString().includes('http://')) {
    opened = true;
    open(`http://127.0.0.1:${port}/`);
    console.log('关闭此窗口或按 Ctrl+C 停止服务。');
  }
});
server.on('error', error => {console.error(error); process.exitCode = 1;});
server.on('exit', code => {process.exitCode = code ?? 1;});
process.on('SIGINT', () => server.kill('SIGINT'));
process.on('SIGTERM', () => server.kill('SIGTERM'));
