import type { Config } from "tailwindcss";

/**
 * DESIGN.md 토큰 — 단일 정의 지점 (§2-1).
 *
 * ⚠ 여기 없는 색·크기·radius를 화면 파일에 직접 쓰지 않는다.
 *   hex 리터럴 / text-[Npx] / rounded-[Npx] 금지.
 *
 * 지금은 **보관처 마스터 화면이 실제로 쓰는 토큰만** 정의되어 있다(세로 슬라이스 시범).
 * 다른 화면을 전환할 때 그 화면이 쓰는 토큰을 여기에 추가한다.
 * 화면이 안 쓰는 토큰을 미리 채워두지 않는다 — 검증 안 된 값이 기준처럼 굳는다.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── 색 (§2-2 중립색 / §2-3 액센트) ──────────────────────────────────
      // 이름은 DESIGN.md 토큰명을 그대로 쓴다. 문서↔코드 사이에 번역이 끼면
      // work-settlement의 --ink/--muted 처럼 값이 조용히 갈린다.
      colors: {
        surface: "#FFFFFF", // --surface
        "surface-alt": "#F4F5F7", // --surface-alt : 표 헤더, 입력 배경
        border: "#E3E5E9", // --border
        text: "#14171C", // --text        (흰 배경 대비 17.96)
        "text-muted": "#646B78", // --text-muted  (5.35) 보조 라벨·캡션·빈 상태
        "text-faint": "#98A0AC", // --text-faint  (2.61) ⚠ placeholder·비활성 전용
        // --link : 클릭 가능한 텍스트(표 행 제목 등). 값은 accent-fill과 같지만
        // 역할이 달라 별도 토큰으로 둔다 — 채움 '배경'과 링크 '글자'는 함께 바뀌지 않는다.
        // ⚠ 옛 링크색 #3182F6은 흰 배경 대비 3.71로 §2-4 미달이었다. 이 값은 4.92.
        link: "#1C6CE0", // --link
        // Primary — 면 / 글자 / 채움 3분리 (§2-3)
        "accent-bg": "#DCEAF5",
        "accent-ink": "#235C82", // accent-bg 위 5.78
        "accent-fill": "#1C6CE0", // 흰 글자 4.92 (#3182F6은 3.71로 미달)
        "accent-fill-hover": "#1A61CC", // 흰 글자 5.79
        "danger-bg": "#F7DFE0",
        "danger-ink": "#8A2A35", // danger-bg 위 6.74
        "warn-bg": "#F7EBD6",
        "warn-ink": "#7A5510",
        "info-bg": "#E4E2F5",
        "info-ink": "#453E85",
        "success-bg": "#DDEFE4",
        "success-ink": "#1F6644", // success-bg 위 5.76
        // 모달·시트 뒷배경. 순수 검정을 화면에서 직접 쓰지 않는다.
        scrim: "rgba(0,0,0,.45)",
      },

      // ── 타입 스케일 (§3) ───────────────────────────────────────────────
      // 굵기를 토큰에 포함시킨다. 화면에서 font-bold를 덧붙이지 않는다.
      fontSize: {
        page: ["20px", { lineHeight: "1.3", fontWeight: "600" }], // h1
        section: ["16px", { lineHeight: "1.4", fontWeight: "600" }], // h2·h3·모달 제목
        body: ["14px", { lineHeight: "1.5", fontWeight: "400" }], // 본문·표 셀·입력
        label: ["12px", { lineHeight: "1.4", fontWeight: "500" }], // 폼 라벨 전용
        // 목록 표 헤더 전용 (2026-07-30) — 이전엔 `label`(12px)을 표 헤더에도 같이 썼는데,
        // 화면 절반은 대신 text-[12px] font-bold를 하드코딩해 굵기가 500/700으로 갈려 있었다.
        // 셀(body 14px)과 나란히 놓였을 때 12px이 작아 보인다는 지적으로 14px로 올리며,
        // 폼 라벨까지 같이 커지지 않도록 표 헤더만의 토큰으로 분리했다.
        "table-head": ["14px", { lineHeight: "1.4", fontWeight: "500" }],
        caption: ["11px", { lineHeight: "1.4", fontWeight: "400" }], // 배지·도움말·오류
      },

      // ── Radius (§2-5) — 역할로 쓰고 값은 표면이 결정한다 ────────────────
      // 실제 값은 globals.css의 CSS 변수. /admin과 모바일 PWA가 다르다.
      borderRadius: {
        control: "var(--r-control)", // 버튼·입력·셀렉트·칩
        card: "var(--r-card)", // 카드·패널
        sheet: "var(--r-sheet)", // 모달·바텀시트
        pill: "var(--r-pill)", // 배지
      },

      // ── 컨트롤 높이 (§6-1) — padding이 아니라 고정 높이로 만든다 ─────────
      height: { control: "var(--h-control)" }, // /admin 32px · 모바일 44px
      minHeight: { control: "var(--h-control)" },
      width: { control: "var(--h-control)" }, // 아이콘 전용 정사각 버튼

      // ── Shadow (§2-6) — 띄우는 요소에만 1종 ────────────────────────────
      boxShadow: { overlay: "0 4px 16px rgba(0,0,0,.10)" },

      // 추가된 토스 스타일 애니메이션 키프레임
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      // 추가된 애니메이션 실행 설정
      animation: {
        "slide-up": "slide-up 0.3s ease-out forwards",
        "fade-in": "fade-in 0.2s ease-in-out forwards",
      },
    },
  },
  plugins: [],
};

// 파일 전체를 통틀어 export default는 이 위치에 딱 한 번만 있어야 합니다!
export default config;