#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage: scripts/install-android-emulator.sh <vlpm|partners> (--latest | --apk PATH) [options]

  EAS dev APK를 받거나 로컬 APK를 에뮬레이터(또는 연결된 기기)에 설치합니다.
  에뮬레이터는 Android Studio 등으로 미리 켜 두세요. (eas build의 자동 기동은 사용하지 않음)

Options:
  --latest              해당 앱의 EAS 최신 finished Android 빌드 APK 다운로드
  --apk PATH            로컬 .apk 경로
  --profile NAME        --latest 시 빌드 프로필 (기본: development)
  --build-id ID         --latest 대신 지정 빌드 ID
  --device SERIAL       adb -s SERIAL (기본: 연결된 emulator 우선, 없으면 첫 기기)
  --no-launch           설치만 하고 앱 실행은 생략
  -h, --help

Examples:
  npm run install:vlpm:android
  scripts/install-android-emulator.sh vlpm --apk ~/Downloads/vlpm.apk
  scripts/install-android-emulator.sh partners --latest --profile development
EOF
}

APP=""
APK_PATH=""
USE_LATEST=false
PROFILE="development"
BUILD_ID=""
DEVICE=""
LAUNCH=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    vlpm | partners)
      APP="$1"
      shift
      ;;
    --apk)
      APK_PATH="${2:?--apk requires a path}"
      shift 2
      ;;
    --latest)
      USE_LATEST=true
      shift
      ;;
    --profile)
      PROFILE="${2:?--profile requires a name}"
      shift 2
      ;;
    --build-id)
      BUILD_ID="${2:?--build-id requires an id}"
      shift 2
      ;;
    --device)
      DEVICE="${2:?--device requires a serial}"
      shift 2
      ;;
    --no-launch)
      LAUNCH=false
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$APP" ]]; then
  echo "App required: vlpm | partners" >&2
  usage >&2
  exit 1
fi

if [[ "$USE_LATEST" == true && -n "$APK_PATH" ]]; then
  echo "Use either --latest or --apk, not both." >&2
  exit 1
fi

if [[ "$USE_LATEST" != true && -z "$APK_PATH" && -z "$BUILD_ID" ]]; then
  echo "Provide --latest, --build-id, or --apk." >&2
  usage >&2
  exit 1
fi

case "$APP" in
  vlpm)
    APP_DIR="$ROOT/apps/vlpm"
    PACKAGE="com.vlpmclientsrelease"
    ;;
  partners)
    APP_DIR="$ROOT/apps/vlpm-partners"
    PACKAGE="com.vlpmpartnersrelease"
    ;;
esac

resolve_adb() {
  if [[ -n "${ANDROID_HOME:-}" && -x "$ANDROID_HOME/platform-tools/adb" ]]; then
    echo "$ANDROID_HOME/platform-tools/adb"
  elif [[ -n "${ANDROID_SDK_ROOT:-}" && -x "$ANDROID_SDK_ROOT/platform-tools/adb" ]]; then
    echo "$ANDROID_SDK_ROOT/platform-tools/adb"
  elif command -v adb >/dev/null 2>&1; then
    command -v adb
  else
    echo "adb not found. Set ANDROID_HOME or install Android platform-tools." >&2
    exit 1
  fi
}

ADB="$(resolve_adb)"

adb_cmd() {
  if [[ -n "$DEVICE" ]]; then
    "$ADB" -s "$DEVICE" "$@"
  else
    "$ADB" "$@"
  fi
}

pick_device_if_needed() {
  if [[ -n "$DEVICE" ]]; then
    return
  fi

  serials=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && serials+=("$line")
  done < <("$ADB" devices | awk 'NR>1 && $2=="device" { print $1 }')
  if [[ ${#serials[@]} -eq 0 ]]; then
    cat >&2 <<EOF
No Android device/emulator connected.

  1. Android Studio → Device Manager에서 AVD를 Cold Boot
  2. adb devices 로 "device" 상태 확인
  3. 이 스크립트 다시 실행
EOF
    exit 1
  fi

  for s in "${serials[@]}"; do
    if [[ "$s" == emulator-* ]]; then
      DEVICE="$s"
      break
    fi
  done
  if [[ -z "$DEVICE" ]]; then
    DEVICE="${serials[0]}"
  fi
  echo "Using device: $DEVICE"
}

wait_for_boot() {
  adb_cmd wait-for-device
  local boot=""
  for _ in $(seq 1 90); do
    boot="$(adb_cmd shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
    if [[ "$boot" == "1" ]]; then
      return
    fi
    sleep 2
  done
  echo "Device did not finish booting in time." >&2
  exit 1
}

download_apk_from_eas() {
  local tmp_json
  tmp_json="$(mktemp)"
  trap 'rm -f "$tmp_json"' RETURN

  (
    cd "$APP_DIR"
    if [[ -n "$BUILD_ID" ]]; then
      eas build:view "$BUILD_ID" --json >"$tmp_json"
      node -e "
        const b = JSON.parse(require('fs').readFileSync('$tmp_json','utf8'));
        const url = b.artifacts?.buildUrl || b.artifacts?.applicationArchiveUrl;
        if (!url) { console.error('No artifact URL on build'); process.exit(1); }
        if (!url.endsWith('.apk') && !url.includes('.apk?')) {
          console.error('Build artifact is not an APK (production AAB는 에뮬레이터에 adb install 불가). development 프로필을 사용하세요.');
          process.exit(1);
        }
        console.log(url);
      "
    else
      eas build:list \
        -p android \
        --status finished \
        --build-profile "$PROFILE" \
        --limit 1 \
        --json \
        --non-interactive >"$tmp_json"
      node -e "
        const list = JSON.parse(require('fs').readFileSync('$tmp_json','utf8'));
        const b = list[0];
        if (!b) { console.error('No finished Android builds for profile: $PROFILE'); process.exit(1); }
        const url = b.artifacts?.buildUrl || b.artifacts?.applicationArchiveUrl;
        if (!url) { console.error('No artifact URL'); process.exit(1); }
        if (!url.endsWith('.apk') && !url.includes('.apk?')) {
          console.error('Latest build is not APK. Use --profile development or --apk.');
          process.exit(1);
        }
        console.log(url);
      "
    fi
  )
}

fetch_latest_apk() {
  local url out
  url="$(download_apk_from_eas)"
  out="$(mktemp "${TMPDIR:-/tmp}/${APP}.XXXXXX.apk")"
  echo "Downloading: $url" >&2
  curl -fsSL "$url" -o "$out"
  echo "$out"
}

if [[ "$USE_LATEST" == true || -n "$BUILD_ID" ]]; then
  if ! command -v eas >/dev/null 2>&1; then
    echo "eas CLI required for --latest / --build-id. npm i -g eas-cli" >&2
    exit 1
  fi
  APK_PATH="$(fetch_latest_apk)"
  CLEANUP_APK="$APK_PATH"
else
  CLEANUP_APK=""
  if [[ ! -f "$APK_PATH" ]]; then
    echo "APK not found: $APK_PATH" >&2
    exit 1
  fi
fi

pick_device_if_needed
wait_for_boot

echo "Installing $APK_PATH → $PACKAGE ($DEVICE)"
adb_cmd install -r "$APK_PATH"

if [[ "$LAUNCH" == true ]]; then
  adb_cmd shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null
  echo "Launched $PACKAGE"
fi

if [[ -n "$CLEANUP_APK" ]]; then
  rm -f "$CLEANUP_APK"
fi

echo "Done."
