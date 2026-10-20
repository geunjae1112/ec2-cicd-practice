'use strict';
const http = require('node:http');

// 환경 변수는 배포 환경마다 달라지는 설정을 코드에서 분리한다.
function readPort(value) {
  const text = value === undefined ? '3000' : String(value);
  if (!/^\d+$/.test(text) || Number(text) < 1 || Number(text) > 65535) {
    throw new Error('PORT는 1~65535 범위의 정수여야 합니다.');
  }
  return Number(text);
}

function createServer() {
  return http.createServer((request, response) => {
    // 요청 문자열을 로그에 남기지 않아 입력값에 포함된 민감정보 노출을 방지한다.
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' });
      response.end(JSON.stringify({ message: 'GET 요청만 지원합니다.' }));
      return;
    }
    if (request.url === '/health') {
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (request.url === '/') {
      response.end(JSON.stringify({
        message: 'GitHub Actions에서 AWS EC2로 자동 배포 성공!',
        application: 'ec2-cicd-practice',
        version: '1.0.0'
      }));
      return;
    }
    response.writeHead(404);
    response.end(JSON.stringify({ message: '요청한 경로가 없습니다.' }));
  });
}

function log(message) {
  const time = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  console.log('[' + time + ' KST] ' + message);
}

if (require.main === module) {
  try {
    const port = readPort(process.env.PORT);
    const server = createServer();
    server.on('error', error => {
      log('서버 오류: ' + error.code);
      process.exitCode = 1;
    });
    server.listen(port, '0.0.0.0', () => log('서버 시작: 포트 ' + port));
    // systemd가 종료를 요청할 때 진행 중인 요청이 끝난 후 종료한다.
    process.on('SIGTERM', () => {
      log('서버 종료 요청');
      server.close(() => log('서버 종료 완료'));
    });
  } catch (error) {
    log('설정 오류: ' + error.message);
    process.exitCode = 1;
  }
}
module.exports = { createServer, readPort };
