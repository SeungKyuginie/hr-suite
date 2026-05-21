# Vercel 배포 가이드 (데모)

이 프로젝트는 데모용으로 **메모리 기반 저장소**를 쓴다.
- 로그인 없음 — 누구나 사이드바 셀렉터로 사용자 전환 가능
- 데이터는 서버리스 함수가 살아있는 동안만 유지 → 일정 시간 트래픽이 없으면 시드 데이터로 자동 리셋
- 데모로는 오히려 안전함 (누가 망쳐도 자동 복구)

---

## 방법 ① — Vercel 웹에서 GitHub 연동 (가장 쉬움)

### 1) 코드를 GitHub에 푸시
```powershell
cd C:\Users\user\HR
git init
git add .
git commit -m "HR demo"
git branch -M main
git remote add origin https://github.com/<내계정>/hr-suite.git
git push -u origin main
```

### 2) Vercel에서 Import
1. <https://vercel.com> 로그인 → **Add New → Project**
2. GitHub 레포 선택 → **Import**
3. 설정 화면에서 별도 입력 없이 그대로 **Deploy** 클릭
   (`vercel.json`이 빌드·라우팅을 자동 처리)

### 3) 끝
약 1~2분 뒤 `https://hr-suite-xxx.vercel.app` URL 발급.
이 URL을 공유하면 누구나 접속 가능.

---

## 방법 ② — Vercel CLI로 바로 배포 (GitHub 없이)

```powershell
# 1) CLI 설치
npm install -g vercel

# 2) 로그인 (브라우저 자동 열림)
vercel login

# 3) 배포
cd C:\Users\user\HR
vercel --prod
```

처음 실행 시 몇 가지 질문:
- Set up and deploy? **Y**
- Which scope? → 본인 계정 선택
- Link to existing project? **N**
- Project name? → 그대로 엔터 또는 원하는 이름
- In which directory is your code located? **./** (그대로 엔터)

배포 완료 후 출력되는 `https://...vercel.app` URL이 데모 주소.

---

## 배포 후 확인

| URL | 의미 |
|---|---|
| `https://<프로젝트>.vercel.app/` | 메인 화면 (React) |
| `https://<프로젝트>.vercel.app/api/health` | `{"ok":true}` 응답이면 서버 OK |
| `https://<프로젝트>.vercel.app/api/employees` | 시드된 직원 6명 JSON |

---

## 자주 묻는 문제

### Q. 데이터가 가끔 리셋되는데요?
정상이다. Vercel 함수가 콜드 스타트하면 메모리가 초기화된다.
데모용으로 의도된 동작이다 — 실 운영하려면 별도 DB(Vercel Postgres, Turso 등)를 붙여야 한다.

### Q. URL을 알면 누구나 접속할 수 있는데 괜찮나?
지금 시드 데이터는 모두 가상 인물이라 데모용으로 안전하다.
실제 직원 정보를 넣을 거라면 반드시 로그인 시스템부터 추가해야 한다.

### Q. 첫 접속이 느리다
Vercel 무료 플랜 콜드 스타트 때문이다. 한 번 깨어나면 빨라진다.

### Q. 빌드 실패가 뜬다
대부분 `npm install` 단계에서 발생. Vercel 대시보드의 **Deployments → Logs**에서 상세 로그 확인.
가장 흔한 원인: Node 버전. 프로젝트 설정 → **General → Node.js Version**을 `22.x`로 지정.

---

## 로컬에서도 동일 코드로 실행

```powershell
npm run setup    # 최초 1회
npm run dev      # 개발 (http://localhost:5173, API는 4000)
# 또는 운영 모드 시뮬레이션:
npm run build
npm start        # http://localhost:4000 단일 서버
```
