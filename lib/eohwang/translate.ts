import "server-only";
// ─────────────────────────────────────────────────────────────────────────────
// 어황일보 사진 → 일본어 안내문 번역 (Claude 비전)
// - model: claude-opus-4-8 (숫자·손글씨 정확도 우선), adaptive thinking.
// - 사전에 없는 어종은 임의 번역 금지 → 원문 유지 + 하단에 등록 안내.
// - 모델이 '완성된 텔레그램 메시지' 한 통을 통째로 작성 → 봇은 그대로 전달.
// ─────────────────────────────────────────────────────────────────────────────
import Anthropic from "@anthropic-ai/sdk";
import type { DictEntry } from "./dictionary";
import type { TelegramImage } from "./telegram";

const SYSTEM = `당신은 한국 수산업 '어황일보'(대형 선망 어선단의 조업 보고서) 사진을 읽어, 일본 바이어에게 보낼 일본어 안내문으로 번역하는 도우미입니다.

[읽을 정보]
표의 각 행에서: 일자 / 선단명 / 조업해구 / 어종 / 어획량(상자). '음력'과 '운반선 동태'(선명·출발시간·행선지)는 무시합니다.

[번역 규칙]
1. 어종·상태 용어는 반드시 사용자 메시지에 주어진 '번역 사전'만 사용합니다. 사전에 없는 어종은 절대 임의로 번역하지 말고, 일본어 본문에는 한글 원문 그대로 두고 하단 ❓에 안내합니다.
2. 한 어종 칸에 여러 어종이 섞여 있을 수 있습니다(예: 고등어 빅아이). 각각 번역해 나열합니다.
3. 혼획 비율:
   - 'N할' → '約N割（N0%）混じり' (바로 앞 어종에 붙임). 예) 눈퉁멸 1할 → ウルメイワシ約1割（10%）混じり
   - '약간' → '少々混じり' / '소량' → '少量'
4. 어획량: 상자 수 × 60kg = kg, ÷1000 = 톤. 각 행에 '○箱（○kg・○t）' 형식으로 병기합니다. 어획량이 숫자가 아니라 '약간/소량/불견/어망파열' 등 상태면 그 상태를 (사전의 상태 번역으로) 표기합니다.
5. 선단명은 원문(한글) 그대로 유지합니다(예: 900경해). 임의 음역 금지.

[정확도 — 매우 중요]
- 숫자는 절대 추측하지 않습니다. 안 보이거나 애매하면 하단 ⚠️에 어느 선단·어느 값인지 구체적으로 적습니다.
- 손으로 쓴 행/숫자는 신뢰도가 낮으니 ⚠️에 표시합니다.

[출력 — 아래 구성의 '하나의 메시지'로만 작성. 다른 말 없이 이 메시지만 출력]

【漁況日報】<날짜>
本日の大型まき網の漁況をお知らせします。（1箱＝60kg換算）

・<선단명>｜<조업해구>｜<일본어 어종(+혼획)>｜<수량 또는 상태>
…(각 행마다 한 줄)…

合計：<상자>箱 ＝ <kg>kg（<t>t）     ← 표에 숫자 합계가 있을 때만

──────────
🔍 확인: <표의 상자 수 총합 vs 문서의 인쇄 합계 대조. 예) 상자 합계 14,500 = 인쇄 합계 14,500 (일치 ✓). 인쇄 합계가 없거나 손글씨면 그 사실과 함께 '수기 확인 필요'.>
⚠️ 주의: <손글씨·흐림 등 신뢰 낮은 부분을 구체적으로. 없으면 이 줄 전체를 생략.>
❓ 사전에 없는 어종: <있으면 목록. 이어서 안내: "등록 <어종>=일본어명 형식으로 알려주시면, 등록 후 사진을 다시 보내면 반영됩니다." 없으면 이 줄 전체를 생략.>`;

/** 이미지 + 사전 → 바이어에게 보낼 완성된 일본어 안내문(하단 한국어 확인 포함) */
export async function translateReport(
  image: TelegramImage,
  dict: DictEntry[]
): Promise<string> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY from env

  const dictText =
    dict
      .filter((d) => d.japanese)
      .map(
        (d) => `${d.korean} = ${d.japanese}${d.kind === "상태" ? "  (상태)" : ""}`
      )
      .join("\n") || "(사전이 비어 있음)";

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 20000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType,
              data: image.base64,
            },
          },
          {
            type: "text",
            text:
              `아래는 확정된 '번역 사전'입니다. 이 사전에 있는 어종/상태만 사용하고, 없는 어종은 임의로 번역하지 마세요.\n\n[번역 사전]\n${dictText}\n\n이 어황일보 사진을 위 규칙대로 읽어 일본어 안내문을 작성하세요.`,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("translateReport: 빈 응답");
  return text;
}
