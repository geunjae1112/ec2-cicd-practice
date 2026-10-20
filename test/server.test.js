'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer, readPort } = require('../src/server');

test('포트의 기본값과 정상 입력을 검증한다', () => {
  assert.equal(readPort(undefined), 3000);
  assert.equal(readPort('8080'), 8080);
});
test('잘못된 포트로 서버가 시작되지 않도록 차단한다', () => {
  for (const value of ['', 'abc', '0', '-1', '65536', '3.5', ' 80']) {
    assert.throws(() => readPort(value), /PORT/);
  }
});
test('정상 요청, 상태 확인, 없는 경로, 잘못된 메서드를 검증한다', async t => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match((await home.json()).message, /자동 배포 성공/);
  assert.deepEqual(await (await fetch(base + '/health')).json(), { status: 'ok' });
  assert.equal((await fetch(base + '/missing')).status, 404);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/health')).status, 200);
});
