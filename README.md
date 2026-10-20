# 나의 앱 CI/CD 파이프라인 구축

## 프로젝트 목적
Node.js HTTP 서버를 GitHub Actions로 테스트하고 빌드한 뒤 AWS EC2에 자동 배포한다.
강의의 Node.js 실습 흐름을 따라가되, 학습자가 파이프라인에 집중할 수 있도록 외부 패키지 없는 작은 앱으로 구성했다.

## 실행 흐름
입력(main 브랜치 push 또는 수동 실행) → 포트·커밋 검증 → 자동 테스트 → 문법 검사 및 dist 빌드 → EC2 배포 → /health 확인.
PR은 CI만 실행한다. CI 실패 시 needs 조건으로 배포를 차단한다. 배포 설정 전에는 DEPLOY_ENABLED 변수를 설정하지 않아 CD가 건너뛰어진다.

## 폴더와 실행
- src/server.js: 요청 처리와 포트 검증
- test/server.test.js: 정상/오류 요청과 오류 이후 정상 응답 테스트
- scripts/build.js: 문법 검사와 배포 파일 생성
- .github/workflows/ci-cd.yml: 자동 실행 조건 및 CI/CD 작업
- package-lock.json: 재현 가능한 의존성 설치 정보

Node.js 24 환경에서 `npm ci`, `npm test`, `npm run build`, `npm start` 순서로 실행한다.
기본 포트는 3000이며 PORT 환경 변수로 변경한다. `/`는 안내 메시지, `/health`는 상태를 반환한다.

## 보안과 예외 처리
비밀번호, AWS 액세스 키, PEM 파일을 코드에 넣지 않는다. SSH 개인 키와 서버 호스트 키는 GitHub Actions Secrets에 저장한다.
SSH 호스트 키 검증을 활성화한다. 배포 전용 키는 서버에서 지정한 배포 명령만 실행하도록 제한한다.
파일 작업 실패는 빌드를 실패시키며, 포트 설정 오류와 네트워크 오류를 구분하여 기록한다. 로그는 KST 시각으로 stdout에 출력하고 EC2 systemd journal에서 보관한다.

## 유지보수 주의
[주의] EC2에 배포 권한을 연결하기 전에 실제 대상 서버를 확인한다. 서버는 예제 전용이며 인증이 없는 상태 조회 API만 제공한다.
운영 환경에서는 HTTPS, 인증, 배포 승인, 로그 보관 정책과 롤백을 추가로 관리해야 한다.
실제 Actions 성공 여부와 EC2 접속 결과는 제출 증빙에서 확인한다. 로컬 테스트 성공을 원격 성공으로 간주하지 않는다.

## 자동 배포 연결
GitHub Actions Secrets: EC2_HOST, EC2_SSH_KEY, EC2_KNOWN_HOSTS.
Repository Variables: DEPLOY_ENABLED=true.
서버 서비스: ec2-cicd-practice.service. main 변경 후 Actions에서 테스트 및 빌드와 EC2 자동 배포를 모두 확인한다.
배포 스크립트는 scripts/ec2-deploy.sh, 서비스 정의는 scripts/ec2-cicd-practice.service에 있다.
