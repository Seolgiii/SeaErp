import "server-only";
// ─────────────────────────────────────────────────────────────────────────────
// 텔레그램 Bot API 헬퍼 (어황일보 번역 봇 전용)
// - 메시지 전송 / 사진·이미지 파일 다운로드.
// - Airtable이 아니므로 직접 fetch 사용(프로젝트의 '인라인 fetch 금지'는 Airtable 한정).
// ─────────────────────────────────────────────────────────────────────────────

export type ImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

export type TelegramImage = { base64: string; mediaType: ImageMediaType };

const TG_API = "https://api.telegram.org";

function botToken(): string {
  const t = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!t) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  return t;
}

const TG_MSG_LIMIT = 4000; // 텔레그램 상한 4096자에 여유를 둔 분할 기준

/** 4096자 상한에 걸리지 않도록 줄 경계 기준으로 긴 메시지를 나눕니다. */
function splitForTelegram(text: string, limit = TG_MSG_LIMIT): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let buf = "";
  for (const line of text.split("\n")) {
    if (line.length > limit) {
      // 한 줄 자체가 상한을 넘으면(드묾) 그 줄만 하드 분할
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      for (let i = 0; i < line.length; i += limit) {
        chunks.push(line.slice(i, i + limit));
      }
      continue;
    }
    if (buf && buf.length + 1 + line.length > limit) {
      chunks.push(buf);
      buf = line;
    } else {
      buf = buf ? `${buf}\n${line}` : line;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

/** 사용자에게 텍스트 메시지를 보냅니다(4096자 초과 시 여러 통으로 나눠 전송). */
export async function sendMessage(
  chatId: number | string,
  text: string
): Promise<void> {
  for (const chunk of splitForTelegram(text)) {
    const res = await fetch(`${TG_API}/bot${botToken()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      throw new Error(`Telegram sendMessage ${res.status}: ${await res.text()}`);
    }
  }
}

function normalizeMedia(
  mime: string | undefined,
  filePath: string
): ImageMediaType {
  const allowed: ImageMediaType[] = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (mime && (allowed as string[]).includes(mime)) return mime as ImageMediaType;
  const p = filePath.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

/** file_id로 이미지를 내려받아 base64 + media type을 반환합니다. */
export async function downloadImage(
  fileId: string,
  mimeHint?: string
): Promise<TelegramImage> {
  // 1) getFile → file_path
  const infoRes = await fetch(
    `${TG_API}/bot${botToken()}/getFile?file_id=${encodeURIComponent(fileId)}`
  );
  if (!infoRes.ok) {
    throw new Error(`Telegram getFile ${infoRes.status}: ${await infoRes.text()}`);
  }
  const info: { result?: { file_path?: string } } = await infoRes.json();
  const filePath = info.result?.file_path;
  if (!filePath) throw new Error("Telegram getFile: missing file_path");

  // 2) 파일 다운로드
  const fileRes = await fetch(`${TG_API}/file/bot${botToken()}/${filePath}`);
  if (!fileRes.ok) throw new Error(`Telegram file download ${fileRes.status}`);
  const buf = Buffer.from(await fileRes.arrayBuffer());

  return {
    base64: buf.toString("base64"),
    mediaType: normalizeMedia(mimeHint, filePath),
  };
}
