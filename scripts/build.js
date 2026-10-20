'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
try {
  // JavaScript 앱은 문법 검사 후 배포용 폴더에 복사하는 과정을 빌드로 정의한다.
  execFileSync(process.execPath, ['--check', path.join(root, 'src/server.js')], { stdio: 'inherit' });
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.copyFileSync(path.join(root, 'src/server.js'), path.join(root, 'dist/server.js'));
  console.log('빌드 성공: dist/server.js');
} catch (error) {
  console.error('빌드 실패: 파일 접근 권한과 소스 문법을 확인하세요.');
  process.exitCode = 1;
}
