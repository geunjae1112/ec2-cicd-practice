#!/bin/bash
set -euo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin
readonly APP_HOME=/home/ec2-user
readonly REPO="$APP_HOME/ec2-cicd-practice"
readonly RELEASES="$APP_HOME/ec2-cicd-releases"
readonly CURRENT="$APP_HOME/ec2-cicd-current"
readonly SERVICE=ec2-cicd-practice.service
SHA="${SSH_ORIGINAL_COMMAND:-${1:-}}"
# [주의] SSH로 전달된 문자열을 명령으로 실행하지 않고 커밋 해시로만 해석한다.
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo '올바른 커밋 해시가 아닙니다.'; exit 1; }
exec 9>"$APP_HOME/.ec2-cicd-deploy.lock"
flock -n 9 || { echo '다른 배포가 실행 중입니다.'; exit 1; }
cd "$REPO"
git fetch origin main
git merge-base --is-ancestor "$SHA" origin/main || { echo 'main에 없는 커밋입니다.'; exit 1; }
mkdir -p "$RELEASES"
TARGET="$RELEASES/$SHA"
if [[ ! -d "$TARGET" ]]; then
  git worktree add --detach "$TARGET" "$SHA"
fi
cd "$TARGET"
npm ci --ignore-scripts
npm test
npm run build
PREVIOUS=$(readlink "$CURRENT" || true)
ln -sfn "$TARGET" "$CURRENT"
sudo systemctl restart "$SERVICE"
for attempt in {1..20}; do
  if curl --fail --silent http://127.0.0.1:3000/health | grep -q '"status":"ok"'; then
    echo "EC2 배포 및 상태 확인 성공: $SHA"
    exit 0
  fi
  sleep 1
done
echo '상태 확인 실패: 이전 버전으로 복구합니다.' >&2
if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
  ln -sfn "$PREVIOUS" "$CURRENT"
  sudo systemctl restart "$SERVICE"
fi
exit 1
