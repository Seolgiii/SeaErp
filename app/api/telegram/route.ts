import { after, NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { downloadImage, sendMessage } from "@/lib/eohwang/telegram";
import { loadDictionary, upsertTerm } from "@/lib/eohwang/dictionary";
import { translateReport } from "@/lib/eohwang/translate";

// ─────────────────────────────────────────────────────────────────────────────
// 어황일보 번역 텔레그램 봇 웹훅
//  사진 → 일본어 안내문 (바이어 전달용, 사람이 확인 후 발송)
//  '등록 <한글>=<일본어>' → 번역 사전에 어종 추가/갱신
//  텔레그램엔 즉시 200을 돌려주고, 무거운 작업은 after()에서 처리(재전송 방지).
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HELP = [
  "🐟 어황일보 번역 봇",
  "",
  "• 어황일보 사진(또는 이미지 파일)을 보내면 일본어 안내문으로 번역해 드려요.",
  "  (팩스 원본은 '파일'로 보내면 화질이 유지돼 더 정확합니다.)",
  "• 번역 결과는 바이어에게 보내기 전에 한번 확인해 주세요.",
  "",
  "새 어종 등록:  등록 눈퉁멸=ウルメイワシ",
].join("\n");

type TgPhotoSize = { file_id: string };
type TgDocument = { file_id?: string; mime_type?: string };
type TgMessage = {
  chat?: { id?: number };
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  document?: TgDocument;
};
type TgUpdate = { message?: TgMessage; edited_message?: TgMessage };

function ok() {
  return new NextResponse("ok", { status: 200 });
}

/** after() 안에서 전송 실패가 예외로 새어나오지 않게 감쌈 */
async function safeSend(chatId: number, text: string) {
  try {
    await sendMessage(chatId, text);
  } catch (e) {
    logError("[telegram] sendMessage failed", e);
  }
}

/** '등록 <한글>=<일본어>' 또는 '/register …' 파싱 */
function parseRegister(
  text: string
): { korean: string; japanese: string } | null {
  const m = text.match(/^(?:등록|\/register)\s+(.+?)\s*=\s*(.+)$/);
  if (!m) return null;
  const korean = m[1].trim();
  const japanese = m[2].trim();
  if (!korean || !japanese) return null;
  return { korean, japanese };
}

/** 메시지에서 이미지 참조 추출 (사진 또는 이미지 문서) */
function pickImage(msg: TgMessage): { fileId: string; mime?: string } | null {
  if (Array.isArray(msg.photo) && msg.photo.length) {
    // photo는 크기별 배열 — 가장 큰 것 사용
    const largest = msg.photo[msg.photo.length - 1];
    if (largest?.file_id) return { fileId: largest.file_id, mime: "image/jpeg" };
  }
  const doc = msg.document;
  if (doc?.file_id && doc.mime_type?.startsWith("image/")) {
    return { fileId: doc.file_id, mime: doc.mime_type };
  }
  return null;
}

export async function POST(req: Request) {
  // 1) 텔레그램 시크릿 검증 (webhook setWebhook의 secret_token)
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== secret) return new NextResponse("forbidden", { status: 403 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return ok();
  }

  const msg = update.message ?? update.edited_message;
  const chatId = msg?.chat?.id;
  if (!msg || typeof chatId !== "number") return ok();

  const text = (msg.text ?? "").trim();

  // 2) 텍스트 명령
  if (text) {
    const reg = parseRegister(text);
    if (reg) {
      after(async () => {
        try {
          const r = await upsertTerm(reg.korean, reg.japanese);
          await safeSend(
            chatId,
            `✅ 사전 ${r === "created" ? "등록" : "수정"} 완료: ${reg.korean} → ${reg.japanese}\n이제 사진을 다시 보내면 반영됩니다.`
          );
        } catch (e) {
          logError("[telegram] register failed", e);
          await safeSend(
            chatId,
            "죄송합니다. 사전 저장 중 오류가 났어요. 잠시 후 다시 시도해 주세요."
          );
        }
      });
      return ok();
    }
    // 그 외 텍스트 → 도움말
    after(() => safeSend(chatId, HELP));
    return ok();
  }

  // 3) 이미지
  const ref = pickImage(msg);
  if (!ref) {
    after(() =>
      safeSend(
        chatId,
        "이미지(사진 또는 이미지 파일)를 보내주세요. 팩스 원본은 '파일'로 보내면 더 정확합니다."
      )
    );
    return ok();
  }

  after(async () => {
    try {
      await safeSend(chatId, "📸 어황일보를 읽는 중입니다… 잠시만요(20~40초).");
      const img = await downloadImage(ref.fileId, ref.mime);
      const dict = await loadDictionary();
      const reply = await translateReport(img, dict);
      await sendMessage(chatId, reply);
    } catch (e) {
      logError("[telegram] translate failed", e);
      await safeSend(
        chatId,
        "죄송합니다. 번역 처리 중 오류가 났어요. 사진이 선명한지 확인하고 다시 보내주세요."
      );
    }
  });
  return ok();
}
