# 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com) 접속
2. **새 프로젝트 추가** 클릭
3. 프로젝트 이름 입력 후 생성

## 2. Firebase 서비스 활성화

### Authentication
- Firebase Console → Authentication → 시작하기
- **로그인 방법** 탭 → Google 활성화

### Firestore Database
- Firebase Console → Firestore Database → 데이터베이스 만들기
- **테스트 모드**로 시작 (나중에 보안 규칙 설정)

## 3. 앱 등록 및 설정값 복사

1. Firebase Console → 프로젝트 설정 → **앱 추가** → 웹(`</>`)
2. 앱 닉네임 입력 후 등록
3. 표시되는 `firebaseConfig` 값들 복사

## 4. .env.local 파일 수정

`.env.local` 파일을 열고 값을 채워넣기:

```
NEXT_PUBLIC_FIREBASE_API_KEY=복사한_값
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=복사한_값
NEXT_PUBLIC_FIREBASE_PROJECT_ID=복사한_값
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=복사한_값
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=복사한_값
NEXT_PUBLIC_FIREBASE_APP_ID=복사한_값
```

## 5. Firestore 보안 규칙 (권장)

Firebase Console → Firestore → 규칙 탭에 붙여넣기:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 6. 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 7. Vercel 배포

```bash
npx vercel
```

Vercel 대시보드에서 환경변수(.env.local 값들)를 동일하게 추가해야 함.
