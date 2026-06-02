import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// 앱 버전 단일 출처 = package.json. 빌드 시 NEXT_PUBLIC_APP_VERSION으로 주입해
// 클라이언트(로그인·관리자 홈 등)에서 표시한다.
const { version } = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
) as { version: string };

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;
