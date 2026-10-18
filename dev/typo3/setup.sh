#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
test_dir="$repo_dir/dev/typo3"
docker_context="${DOCKER_CONTEXT:-desktop-linux}"
docker_cmd=(docker --context "$docker_context")
compose_cmd=("${docker_cmd[@]}" compose -f "$test_dir/compose.yaml")

mkdir -p "$test_dir/app"
"${compose_cmd[@]}" build web

if [[ ! -f "$test_dir/app/composer.json" ]]; then
  "${docker_cmd[@]}" run --rm \
    -v "$test_dir/app:/var/www/html" \
    -w /var/www/html \
    studi-assist-typo3-web \
    composer create-project 'typo3/cms-base-distribution:^13' . --no-interaction
fi

"${compose_cmd[@]}" up -d

mkdir -p "$test_dir/app/public/fileadmin/icons"
if [[ ! -f "$test_dir/app/public/fileadmin/icons/preview-arrow.svg" ]]; then
  cp "$repo_dir/Resources/Public/Icons/arrow-up.svg" \
    "$test_dir/app/public/fileadmin/icons/preview-arrow.svg"
fi

if ! grep -q 'studi-assist/typo3-chatbot-widget' "$test_dir/app/composer.json"; then
  "${compose_cmd[@]}" exec -T web \
    composer require 'studi-assist/typo3-chatbot-widget:@dev' --no-interaction
fi

if [[ ! -f "$test_dir/app/config/sites/main/config.yaml" ]]; then
  if [[ ! -f "$test_dir/app/.local-admin-password" ]]; then
    python3 -c 'import pathlib,secrets,sys; p=pathlib.Path(sys.argv[1]); p.write_text("Aa1!"+secrets.token_urlsafe(18)+"\n"); p.chmod(0o600)' \
      "$test_dir/app/.local-admin-password"
  fi
  "${compose_cmd[@]}" exec -T web sh -c \
    'export TYPO3_SETUP_ADMIN_PASSWORD="$(cat .local-admin-password)"; exec vendor/bin/typo3 setup --driver=mysqli --host=db --port=3306 --dbname=typo3 --username=typo3 --password=local-typo3-password --admin-username=admin --admin-email=admin@example.test --project-name="StudiAssist Extension Test" --create-site=http://localhost:8081/ --server-type=apache --no-interaction'
fi

if [[ ! -f "$test_dir/app/.local-seeded" ]]; then
  "${compose_cmd[@]}" exec -T db mariadb -utypo3 -plocal-typo3-password typo3 < "$test_dir/seed.sql"
  touch "$test_dir/app/.local-seeded"
  "${compose_cmd[@]}" exec -T web vendor/bin/typo3 cache:flush
fi

printf 'Frontend: http://localhost:8081/\nBackend:  http://localhost:8081/typo3/\nUser:     admin\nPassword: %s\n' \
  "$test_dir/app/.local-admin-password"
