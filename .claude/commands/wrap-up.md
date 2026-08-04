---
description: 오늘 작업을 docs/journal.md에 정리한 뒤 코드 변경과 함께 커밋·푸시
---

# /wrap-up

오늘 세션의 작업을 docs/journal.md에 추가한 뒤,
사용자 확인을 거쳐 **그날 세션에서 남은 코드 변경까지 함께** git에 기록합니다.

> 2026-08-04 변경: CLAUDE.md에 "최근 변경" 섹션을 쌓던 4단계를 폐지했다. CLAUDE.md는 규칙만
> 담고, 이력은 docs/journal.md 단독으로 간다(CLAUDE.md 「이 파일의 쓰기 정책」 참조).

> 2026-07-31 변경: 예전엔 journal.md·CLAUDE.md만 커밋·푸시하고 코드 변경은 항상 로컬에
> 남았다(로컬↔배포 화면 불일치의 원인). 지금은 5단계에서 코드 변경 목록도 사용자 확인에
> 포함시키고, 승인 시 docs와 분리된 별도 커밋으로 코드도 함께 푸시한다.

---

## 1. 오늘 KST 날짜 확인

- 시스템 프롬프트의 `currentDate`를 우선 사용
- 없거나 불확실하면 `TZ=Asia/Seoul date +%Y-%m-%d` 실행
- 형식: `YYYY-MM-DD`

## 2. 오늘의 작업 내용 식별

- 현재 대화 내역에서 사용자가 요청한 작업·코드 변경·의사결정 추출
- 보조 자료로 `git log --since="<오늘 00:00 KST>" --pretty=format:"%h %s"` 호출
- 한 줄짜리 fix·typo 같은 것은 묶어서 1줄로 압축

## 3. docs/journal.md에 새 섹션 추가

파일 위치: `docs/journal.md`

규칙:
- 파일 최상단의 헤더·기간 표시는 건드리지 않는다
- 마지막 날짜 섹션 **다음** 위치에 새 섹션 삽입
- 같은 날짜 섹션이 이미 있으면 **새로 만들지 않고 기존 섹션의 각 카테고리에 항목을 보강**
- 항목이 정말 없으면 `- 없음`으로 한 줄 채움
- 섹션 사이 빈 줄, 날짜 사이는 `---`로 구분

**형식 (절대 변경 금지):**

```
### YYYY-MM-DD

**완료한 작업**
- 항목 (구체적으로, 한 줄에 하나씩)

**결정 사항**
- 항목 (왜 이렇게 했는지 짧게)

**미해결 이슈**
- 항목 (다음에 해야 할 것)

**다음 작업 후보**
- 항목 (우선순위 높은 것부터)
```

## 4. CLAUDE.md — 원칙적으로 건드리지 않는다

CLAUDE.md는 규칙이 바뀐 경우에만 해당 줄을 고친다. "최근 변경" 섹션을 만들지 않는다.
세션 요약·변경 이력은 docs/journal.md에만 쓴다.

- 오늘 **규칙 자체가 바뀐 게 없으면 이 단계는 스킵한다** (대부분의 날이 여기 해당).
- 규칙이 바뀌었으면 CLAUDE.md의 해당 줄을 고친다. 파일 아래에 덧붙이지 않는다.
- 작업 이력·진행률·완성도·측정 수치(테스트 개수·파일 수·건수)는 어떤 경우에도 쓰지 않는다.
- 판단이 서지 않으면 쓰지 말고 사용자에게 묻는다.

근거: CLAUDE.md는 매 세션 컨텍스트에 통째로 들어간다. 이력이 쌓이면 규칙이 묻히고,
낡은 상태 기록이 현재 규칙인 것처럼 읽힌다.

## 4.5. 옵시디언 vault 동기화

조건: ERP 프로젝트 루트의 `obsidian-vault` 폴더가 존재할 때만 실행 (없으면 조용히 스킵)

이 단계는 격리 실행 — 4.5 안의 어떤 동기화가 실패하더라도 이어지는 5~6단계는 정상 진행한다. 절대 /wrap-up 자체를 멈추지 않는다.

### 4.5-A: (폐지)

CLAUDE.md → `00_프로젝트_현황.md` 미러링은 2026-08-04에 폐지했다. **되살리지 않는다.**
vault에 규칙 사본이 생기면 사용자가 옵시디언에서 낡은 규칙을 읽게 된다.
`00_프로젝트_현황.md`에는 저장소 CLAUDE.md를 가리키는 포인터 한 줄만 둔다.

### 4.5-B: z.Mission_for_all_term.md → 01_비전과_미해결결정.md 미러링

조건: `z.Mission_for_all_term.md` 가 이번 세션에 변경됐을 때만 (변경 없으면 스킵)
동작:
- 대상 파일: `<repo-root>/obsidian-vault/01_비전과_미해결결정.md`
- 첫 줄 미러 안내문구는 항상 유지:

```
> 이 노트는 z.Mission의 미러 (자동 동기화)

[z.Mission_for_all_term.md 전체 내용 그대로]
```

### 4.5-C: docs/journal.md 오늘 항목 → 10_작업일지/{YYYY-MM-DD}.md 분리 저장

조건: 항상 (3단계에서 docs/journal.md에 오늘 날짜 섹션이 추가/보강된 경우)
동작:
- `docs/journal.md` 에서 `### {오늘날짜}` 섹션부터 다음 `---` 또는 다음 `### ` 직전까지 추출
- 대상 파일: `<repo-root>/obsidian-vault/10_작업일지/{YYYY-MM-DD}.md`
- 형식 변환:
  - `### 2026-05-07` → `# 2026-05-07`
  - `**완료한 작업**` → `## 완료`
  - `**결정 사항**` → `## 결정`
  - `**미해결 이슈**` → `## 미해결`
  - `**다음 작업 후보**` → `## 다음 후보`
- 같은 날짜 파일이 이미 있으면 **덮어쓰기** (docs/journal.md가 이미 보강 처리한 결과를 그대로 반영)

### 4.5-D: 60_관계도/ 자동 갱신

조건: `<repo-root>/obsidian-vault/60_관계도` 폴더가 존재할 때만 실행 (없으면 조용히 스킵)
하위 폴더 `60_관계도/시나리오_플로우/`는 없으면 자동 생성.

#### 4.5-D-1: ERP_핵심구조_큰그림.md (큰 그림)

정책: **create-if-missing** — 파일이 이미 존재하면 절대 건드리지 않음 (수동 편집 보존).

동작:
- 대상 파일: `<repo-root>/obsidian-vault/60_관계도/ERP_핵심구조_큰그림.md`
- 파일 존재 시: 스킵 (수동 편집 우선)
- 파일 없을 시: 3개 그룹(비즈니스 핵심 / 허브 / 인프라) 구조의 mermaid 큰그림 초기 작성. 이후 변경은 직접 파일 편집으로 관리 (시스템 구조 변경 시 수동 반영).

#### 4.5-D-2: 시나리오_플로우/{A1~A5}.md (시퀀스 다이어그램)

조건: 시나리오 노트의 `## 흐름` 섹션이 마지막 생성 이후 변경됐을 때만 (변경 없으면 스킵)
동작:
- 소스: `<repo-root>/obsidian-vault/50_시나리오/{A1~A5}_*.md`
- 대상: `<repo-root>/obsidian-vault/60_관계도/시나리오_플로우/{A1~A5}_*.md`
- 파싱:
  1. `## 트리거` 섹션 첫 줄에서 first actor 추출
     - "X가 Y" / "X이 Y" 패턴 → first actor = X (예: "작업자가 입고 폼 제출" → "작업자")
     - "X(또는 Y)가 Z" → first actor = X
     - 추출 실패 시 → fallback: `Note over <첫모듈>: <트리거 전체>` 후 step 2부터 chain
  2. `## 흐름` 섹션의 `^N. 설명 → [[30_모듈별_상세/모듈명]]` 패턴 파싱
     - 한 줄에 `→ [[link]]`가 여러 개면 **마지막** link 사용
     - link 없는 줄은 직전 모듈 재사용 (`Note over <prev>: <설명>` 형식)
  3. participant 추가:
     - 모든 사람 actor (작업자/관리자/마스터/사용자/Cron 등)
     - 흐름의 모든 모듈 (등장 순)
- 출력 형식:
  ```
  # {시나리오 ID} {제목}

  > 자동 생성. /wrap-up이 ## 흐름 변경 감지 시 갱신.
  > 마지막 갱신: YYYY-MM-DD

  ## 시퀀스

  ```mermaid
  sequenceDiagram
      participant 작업자
      participant 입고_관리
      ...
      작업자->>입고_관리: 1. 입고 폼 입력
      입고_관리->>입력_Sanitize: 2. ...
  ```

  ## 관련 노트

  - [[A1_입고_골든패스]] (소스)
  - [[입고_관리]], [[LOT별_재고]], ... (등장 모듈)
  ```
- 파일 내용이 기존과 동일하면 write 스킵 (변경 없음 = git diff 0)

### 4.5 안전장치 (필수)

bash 함수로 격리 실행. 어떤 sub-step이 실패해도 전체 흐름은 계속 진행:

```bash
sync_obsidian() {
  local repo_root
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || return 0
  local vault="$repo_root/obsidian-vault"

  if [ ! -d "$vault" ]; then
    return 0  # vault 없으면 조용히 스킵
  fi

  # 4.5-B, 4.5-C, 4.5-D 각각 시도. 하나가 실패해도 다음 단계 시도. (4.5-A는 폐지)
  # 각 sub-step 안에서 || true 로 개별 격리.
  ...
}

sync_relations() {
  local repo_root
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || return 0
  local relations="$repo_root/obsidian-vault/60_관계도"

  [ -d "$relations" ] || return 0  # 60_관계도 없으면 조용히 스킵
  mkdir -p "$relations/시나리오_플로우" 2>/dev/null

  generate_core_structure || echo "⚠️ 4.5-D-1 실패" >&2
  generate_sequence_diagrams || echo "⚠️ 4.5-D-2 실패" >&2
}

sync_obsidian || echo "⚠️ 옵시디언 동기화 일부 실패 (기존 흐름 계속 진행)" >&2
sync_relations || echo "⚠️ 관계도 갱신 일부 실패 (기존 흐름 계속 진행)" >&2
```

→ 실패해도 절대 /wrap-up 자체를 멈추지 않음. 5단계로 그대로 이어진다.

## 5. 코드 변경 확인 (신설, 2026-07-31)

docs/journal.md·CLAUDE.md·옵시디언 vault 말고, 이 세션에서 남은 코드 변경(추적 중 파일 수정 +
새 파일)이 있는지 확인한다.

- `git status --short -- . ':!docs/journal.md' ':!CLAUDE.md' ':!obsidian-vault'` 로 목록 확보
  (docs/journal.md·CLAUDE.md·옵시디언은 3~4.5단계에서 이미 처리되므로 제외)
- 변경이 없으면 이 단계는 "코드 변경 없음"으로 기록하고 6단계로
- 변경이 있으면 파일 경로 목록을 그대로 6단계 확인 메시지에 포함시킨다 — 요약하지 말고 전부 나열
- **민감 파일 제외**: 목록에 `.env`류, `*.pem`/`*.key`, 이름에 `secret`·`credential`이 들어간
  파일이 있으면 자동 스테이징 후보에서 뺀다. 6단계 확인 메시지에 "제외함: <파일명> (민감 파일로 추정)"
  으로 별도 표시하고, 정말 커밋해야 하면 사용자가 직접 요청하게 한다(자동 포함 금지)

## 6. 사용자 확인

docs/journal.md에 추가한 내용(그리고 규칙이 바뀌어 CLAUDE.md를 고쳤다면 그 줄)과,
5단계에서 확인한 코드 변경 파일 목록을 사용자에게 보여준 뒤 정확히 다음 메시지를 출력:

> **빠진 내용 있나요? docs/journal.md, 코드 변경 목록(있는 경우), 옵시디언 vault(있는 경우)를 확인 후 'yes' 입력**

응답 처리:
- 사용자가 추가 항목을 알려주면 → docs/journal.md 다시 보강 후 재확인
- 사용자가 코드 변경 목록 중 일부를 빼달라고 하면 → 그 파일들은 7단계 코드 커밋 대상에서 제외
- 사용자가 `yes`(또는 `Yes`/`YES`/`네`) 응답 시에만 7단계로 진행
- 그 외 응답은 보강·재확인 반복

## 7. 커밋·푸시

`yes` 받은 경우에만 다음을 순서대로 실행. **코드 커밋과 docs 커밋을 분리한다** — 기능 변경과
일일 정리 문서가 한 커밋에 섞이면 나중에 히스토리에서 구분이 안 된다.

```bash
# 1) 코드 변경이 있으면 먼저 별도 커밋 (5단계에서 뺀 민감 파일·사용자가 제외 요청한 파일은 제외)
git add -A -- . ':!docs/journal.md' ':!CLAUDE.md' ':!obsidian-vault'
git commit -m "$(cat <<'EOF'
chore: YYYY-MM-DD 코드 반영

<3단계에서 docs/journal.md에 쓴 오늘의 핵심 변경 헤드라인을 그대로 재사용>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
# 5단계에서 코드 변경이 없었으면 이 커밋은 스킵한다(빈 커밋 금지)

# 2) docs 커밋
git add docs/journal.md CLAUDE.md   # CLAUDE.md는 규칙이 바뀐 날에만 변경분이 생긴다
# 옵시디언 vault가 존재하면 변경분도 함께 stage (.gitignore가 캐시는 이미 제외)
[ -d "$(git rev-parse --show-toplevel)/obsidian-vault" ] && git add obsidian-vault/
git commit -m "$(cat <<'EOF'
docs: YYYY-MM-DD 일일 정리

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

# 3) 푸시 (두 커밋 함께 올라간다)
git push origin main
```

- `YYYY-MM-DD`는 1단계에서 확정한 오늘 KST 날짜로 치환
- 커밋·푸시 중 실패 시 즉시 사용자에게 알리고 중단(이미 만들어진 커밋은 그대로 두고, 무엇이
  실패했는지만 보고 — 임의로 revert하지 않는다)
- 옵시디언 vault 변경분이 있으면 함께 커밋되며, 변경 없으면 git이 자동으로 빈 stage로 처리

## 8. 완료 메시지

성공 시 다음 형식으로 요약 출력:

```
✅ YYYY-MM-DD 일일 정리 완료
- docs/journal.md: 완료 N건 / 결정 N건 / 미해결 N건 / 다음 후보 N건
- CLAUDE.md: 규칙 변경 없음 / 규칙 N줄 수정
- 코드 변경: N개 파일 커밋 <hash> / 변경 없음 / 제외 M개(민감 파일·사용자 제외)
- 옵시디언: 작업일지 동기화 완료 / 변경 없음 / vault 없음 (스킵) 중 하나
- 관계도: 큰 그림 갱신 + 시나리오 N개 / 변경 없음 / 60_관계도 없음 (스킵) 중 하나
- 커밋 <hash들> 푸시됨 (코드 <hash> + docs <hash>, 코드 변경 없으면 docs <hash>만)
```

---

## 주의 사항

- docs/journal.md 형식은 본 문서에 명시된 4-카테고리 구조 — **절대 변경 금지**
- CLAUDE.md는 규칙이 바뀐 경우에만 해당 줄을 고친다. "최근 변경" 섹션을 만들지 않는다.
  세션 요약·변경 이력은 docs/journal.md에만 쓴다. (CLAUDE.md 「이 파일의 쓰기 정책」이 상위 규칙)
- 같은 날짜에 두 번 `/wrap-up` 시 기존 섹션 보강 (덮어쓰기 X, 중복 추가 X)
- 사용자가 `yes` 답하기 전엔 절대 git add/commit/push 하지 않는다 — 코드 변경도 예외 없음
- 코드 변경은 docs 커밋과 **항상 분리한 별도 커밋**으로 만든다 — "기능 변경"과 "일일 문서 정리"가
  한 커밋에 섞이면 나중에 `git log`·`git blame`으로 되짚기 어려워진다
- `.env`·인증서·시크릿으로 보이는 이름의 파일은 6단계 확인 메시지에서 자동 제외로 표시하고,
  사용자가 명시적으로 포함해 달라고 하지 않는 한 절대 스테이징하지 않는다
- 커밋 메시지 끝에 항상 `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` 포함
- 옵시디언 동기화(4.5)는 격리 실행 — 실패해도 1~8단계 흐름은 정상 진행
- vault 없으면 4.5는 조용히 스킵 (경고 출력 없음)
