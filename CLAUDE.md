@AGENTS.md

## 데이터 보존 원칙

코드를 변경할 때 사용자가 입력한 데이터(노트 내용, 폴더 구조, 할 일, 북마크, 캘린더 일정 등)가 유지되어야 한다.

- 컴포넌트를 리팩토링하거나 Firestore 구독 로직을 변경할 때, Firestore가 비어있다고 해서 localStorage 데이터를 덮어쓰면 안 된다.
- Firestore 구독이 빈 스냅샷을 반환할 경우, localStorage에 기존 데이터가 있으면 그 데이터를 Firestore에 업로드하고 유지해야 한다.
- 새 기능 추가나 UI 변경 시 기존 localStorage/Firestore 키 구조를 바꾸지 않는다.
- 데이터 스키마를 변경해야 할 경우 마이그레이션 로직을 포함한다.
