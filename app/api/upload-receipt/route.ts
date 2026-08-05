import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { log, logWarn, logError } from "@/lib/logger";

const MAX_IMAGE_BYTES = 10_000_000; // 10MB — 모바일 카메라 원본 사진 대응

export async function POST(request: Request) {
  log("[upload-receipt] POST 요청 수신");
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    log("[upload-receipt] file 파싱:", file instanceof File ? `${file.name} (${file.size}bytes, ${file.type})` : `File 아님: ${typeof file}`);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      logWarn("[upload-receipt] 이미지가 아닌 파일 타입:", file.type);
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있습니다" },
        { status: 400 }
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      logWarn("[upload-receipt] 파일 크기 초과:", file.size, "bytes");
      return NextResponse.json(
        { error: `파일 크기가 너무 큽니다 (최대 ${MAX_IMAGE_BYTES / 1_000_000}MB, 현재 ${(file.size / 1_000_000).toFixed(1)}MB)` },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/\s+/g, "-");
    log("[upload-receipt] Blob 업로드 시작:", safeName);
    const blob = await put(`receipts/${Date.now()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    // ⚠ blob.url을 로그에 넣지 말 것 (2026-08-05 제거).
    //   access: "public"이라 이 URL은 인증 없이 열리는 영수증 이미지 링크다.
    //   로그를 볼 수 있는 사람이 곧 영수증을 볼 수 있게 된다.
    log("[upload-receipt] Blob 업로드 완료");

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    logError("[upload-receipt] 오류:", e instanceof Error ? e.stack : e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
