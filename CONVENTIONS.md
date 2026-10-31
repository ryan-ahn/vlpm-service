# 코드 작성 규칙

VLPM 모바일 모노레po. Turborepo, Expo SDK 57, Expo Router, React Native.

실행·빌드·배포는 [`README.md`](README.md).

---

## 원칙

- **의존성 최소화.** 타입·헬퍼·UI는 쓰는 파일에 둔다. **두 앱 이상**에서 쓸 때만 `packages/`로 올린다.
- **단일 책임.** 한 파일·한 함수는 한 가지 역할. 이름만 봐도 역할이 드러나게 짓는다.
- **가독성 우선.** 리렌더가 문제일 때만 메모이제이션을 넣는다.
- **불필요한 분리 금지.** 한 화면에서만 쓰는 UI는 그 route 파일에 둔다.
- **작업 후 정리.** 쓸모없어진 import·코드를 제거하고 루트에서 `npm run check`를 통과시킨다.

---

## 모노레포 구조

| 경로                          | 역할                                             |
| ----------------------------- | ------------------------------------------------ |
| `apps/vlpm/`                  | 고객 앱 (스토어 패키지 `com.vlpmclientsrelease`) |
| `apps/vlpm-partners/`         | 파트너 앱 (`com.vlpmpartnersrelease`)            |
| `packages/typescript-config/` | 공유 `tsconfig` (`expo-app.json`)                |

두 앱이 같은 Supabase·OAuth 패턴을 쓰더라도, **한 앱에서만 쓰는 코드는 `packages`로 올리지 않는다.**

---

## 경로 별칭

| 별칭  | 대상                                                   |
| ----- | ------------------------------------------------------ |
| `@/*` | 해당 앱 루트 (`apps/vlpm/` 또는 `apps/vlpm-partners/`) |

- DTO·타입은 `import type`만 쓴다.
- 앱 안에서는 `@/` 별칭을 우선하고, 상대 import는 지양한다.

---

## import

1. `react`, `react-native`
2. `expo-*`, `react-native-*` 서드파티
3. `@repo/*` (공유 패키지)
4. `@/lib`, `@/…`
5. 상대 경로

루트 `prettier.config.cjs`의 import 정렬을 따른다.

---

## Expo Router 화면

- 라우트 파일: `app/` 아래 Expo Router 규약 (`_layout.tsx`, `[id].tsx` 등).
- 화면 컴포넌트는 default export.
- 공통 인증·테마·API는 `lib/` (`auth.tsx`, `api.ts`, `theme.ts`, `oauth.ts`, `supabase.ts`, `env.ts`).

---

## 환경 변수·비밀

- Supabase URL·키는 코드에 하드코딩하지 않는다. `EXPO_PUBLIC_*` + `lib/env.ts` + `app.config.ts` `extra`.
- `.env`는 앱 디렉터리별로 두고 gitignore한다. 템플릿은 `.env.example`만 커밋한다.
- EAS 빌드용 값은 EAS Environment Variables에 앱별 projectId 기준으로 등록한다.

---

## 네이밍

- **파일·폴더 (라우트 제외):** camelCase.
- **컴포넌트:** PascalCase.
- **핸들러:** `handle` + 대상 + 동작.
- **역할 상수:** `lib/theme.ts`의 `ROLE` 등 앱별로 유지 (고객 `customer`, 파트너는 앱별 정의).

---

## 조건식

`else` 없이 early return. JSX 짧은 분기는 삼항.

---

## 포맷·타입

- 타입 검사: `npm run check-types` (turbo). 통합: `npm run check`.
- 앱 `tsconfig.json`은 `@repo/typescript-config/expo-app.json`을 extends하고, `@/*` paths만 덮어쓴다.

---

## OAuth·딥링크

- redirect 파싱은 `lib/query-params.ts`를 사용한다. `expo-auth-session/build/*` 비공개 경로 import 금지.
- redirect URI는 `expo-auth-session`의 `makeRedirectUri`와 앱 `scheme`·Supabase Redirect URLs를 맞춘다.
