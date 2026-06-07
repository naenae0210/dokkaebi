# Hang With

여행 계획을 카드 형태로 기록하고, 지도 위에서 함께 둘러볼 수 있는 웹 서비스입니다.
도시·카테고리별로 장소를 모아 카드를 만들고, Google Maps 위에서 동선을 확인하며, 사진을 업로드해 공유할 수 있습니다.

## 기술 스택

**Frontend**
- React 19 + TypeScript + Vite
- Tailwind CSS
- Google Maps JavaScript SDK (지도 표시, 장소 자동완성)

**Backend**
- Go (Echo 프레임워크)
- PostgreSQL (sqlx)
- Google OAuth 2.0 + JWT 기반 인증

**Infra**
- Docker / docker-compose
- Nginx (정적 파일 서빙 + API 리버스 프록시 + TLS)
- GCP VM 배포, GitHub Actions로 CI/CD

## 프로젝트 구조

```
.
├── api/                  # Go 백엔드 (REST API)
│   └── internal/
│       ├── handler/      # HTTP 핸들러
│       ├── repository/   # DB 접근 계층
│       └── middleware/   # 인증 미들웨어
├── src/                  # React 프론트엔드
│   ├── components/       # UI 컴포넌트 (지도, 카드, 모달 등)
│   ├── hooks/            # 커스텀 훅 (데이터 로딩, 자동완성 등)
│   └── lib/              # API 클라이언트, 인증, 공용 타입
├── db/                   # 스키마 정의 및 마이그레이션 SQL
├── nginx/                # Nginx 설정
└── docker-compose.yml
```
