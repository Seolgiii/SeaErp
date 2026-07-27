// 어황일보 번역 봇 도그푸딩용 일회성 스크립트 (tmp, git ignored via tmp-* 아님 — scripts/ 에 둠).
// 실제 봇이 쓰는 것과 동일하게: SYSTEM 프롬프트는 lib/eohwang/translate.ts에서 그대로 읽고,
// 사전은 라이브 Airtable(tblVMMNSbT4GqrUfm)의 8건을 그대로 주입, model=claude-opus-4-8 + adaptive thinking.
// 사용:  node --env-file=.env.local scripts/test-eohwang-translate.mjs <이미지경로>
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

// 1) SYSTEM 프롬프트를 실제 translate.ts에서 추출 (드리프트 방지)
const src = fs.readFileSync(new URL("../lib/eohwang/translate.ts", import.meta.url), "utf8");
const m = src.match(/const SYSTEM = `([\s\S]*?)`;/);
if (!m) throw new Error("translate.ts에서 SYSTEM 프롬프트를 못 찾음");
const SYSTEM = m[1];

// 2) 번역 사전 (라이브 Airtable 8건 그대로)
const dict = [
  { korean: "눈퉁멸", japanese: "ウルメイワシ", kind: "어종" },
  { korean: "고등어", japanese: "サバ", kind: "어종" },
  { korean: "눈다랑어", japanese: "メバチ", kind: "어종" },
  { korean: "빅아이", japanese: "メバチ", kind: "어종" },
  { korean: "소중참치", japanese: "小中マグロ", kind: "어종" },
  { korean: "메가리", japanese: "小アジ", kind: "어종" },
  { korean: "불견", japanese: "魚群見えず", kind: "상태" },
  { korean: "어망파열", japanese: "漁網破損", kind: "상태" },
];
const dictText =
  dict
    .filter((d) => d.japanese)
    .map((d) => `${d.korean} = ${d.japanese}${d.kind === "상태" ? "  (상태)" : ""}`)
    .join("\n") || "(사전이 비어 있음)";

// 3) 이미지 로드
const imgPath = process.argv[2];
if (!imgPath) throw new Error("이미지 경로를 인자로 주세요");
const base64 = fs.readFileSync(imgPath).toString("base64");
const lower = imgPath.toLowerCase();
const mediaType = lower.endsWith(".png")
  ? "image/png"
  : lower.endsWith(".webp")
    ? "image/webp"
    : "image/jpeg";

// 4) translate.ts와 동일한 호출
const client = new Anthropic();
const t0 = Date.now();
const response = await client.messages.create({
  model: "claude-opus-4-8",
  max_tokens: 20000,
  thinking: { type: "adaptive" },
  system: SYSTEM,
  messages: [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        {
          type: "text",
          text: `아래는 확정된 '번역 사전'입니다. 이 사전에 있는 어종/상태만 사용하고, 없는 어종은 임의로 번역하지 마세요.\n\n[번역 사전]\n${dictText}\n\n이 어황일보 사진을 위 규칙대로 읽어 일본어 안내문을 작성하세요.`,
        },
      ],
    },
  ],
});

const text = response.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("\n")
  .trim();

console.log("===== 봇 출력 (바이어에게 갈 메시지) =====\n");
console.log(text || "(빈 응답)");
console.log(
  `\n===== 메타 =====\n소요 ${((Date.now() - t0) / 1000).toFixed(1)}초 | stop=${response.stop_reason} | usage=${JSON.stringify(response.usage)}`
);
