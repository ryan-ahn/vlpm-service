# vlpm-service

VLPM 고객 앱·파트너 앱을 한 저장소에서 관리하는 Turborepo 모노레포입니다.
스토어에는 **서로 다른 앱**으로 배포하며, 빌드·submit은 앱별로 따로 실행합니다.

작성 규칙은 [`CONVENTIONS.md`](CONVENTIONS.md). 에이전트 안내는 [`CLAUDE.md`](CLAUDE.md).

---

## 디렉터리

| 경로                          | 내용                                                    |
| ----------------------------- | ------------------------------------------------------- |
| `apps/vlpm/`                  | 고객 앱 (`com.vlpmclientsrelease`, EAS slug `vlpm`)     |
| `apps/vlpm-partners/`         | 파트너 앱 (`com.vlpmpartnersrelease`, EAS slug `vlpmp`) |
| `packages/typescript-config/` | Expo 앱용 `tsconfig` 프리셋                             |

각 앱은 자체 `app.config.ts`, `eas.json`, `assets/`, `lib/`를 가집니다.
