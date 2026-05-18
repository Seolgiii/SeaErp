/**
 * 옛 입고관리 + LOT의 보관처·품목마스터 link 일괄 backfill
 *
 * 배경 (2026-05-18 분석):
 *   - 입고관리 199건 중 196건이 link 누락 (옛 backfill 데이터)
 *     · 보관처 link 누락: 45건
 *     · 품목마스터 link 누락: 196건
 *   - LOT별 재고 198건 중 196건이 품목마스터 link 누락 (보관처는 거의 다 채워짐)
 *   - 출고관리.품목명은 입고관리.품목마스터 lookup의 transitive 결과 → link 비면 빈칸
 *
 * 처리 전략:
 *   1. LOT.품목명(text) → 품목마스터 record id 매핑 (이름 일치)
 *   2. 누락된 LOT.품목마스터 → 매핑된 품목마스터 id로 PATCH
 *   3. 누락된 입고관리.보관처 → LOT.보관처에서 가져와 PATCH
 *   4. 누락된 입고관리.품목마스터 → LOT.품목마스터(방금 채운 것)로 PATCH
 *
 * 매칭 실패 케이스:
 *   - LOT.품목명이 품목마스터에 없음 (오타·미등록) → skip + 경고
 *   - 입고관리에 LOT link 자체가 없음 (앞 분석에서 17건) → skip + 경고 (수동 처리)
 *
 * 실행:
 *   node scripts/backfill-inbound-product-storage.mjs            # dry-run
 *   node scripts/backfill-inbound-product-storage.mjs --execute  # 실제 PATCH
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
  return env;
}

const env = loadEnv(envPath);
const API_KEY = env.AIRTABLE_API_KEY ?? "";
const BASE_ID = env.AIRTABLE_BASE_ID ?? "";
if (!API_KEY || !BASE_ID) {
  console.error("❌ AIRTABLE_API_KEY 또는 AIRTABLE_BASE_ID가 .env.local에 없습니다.");
  process.exit(1);
}

const EXECUTE = process.argv.includes("--execute");
const API = "https://api.airtable.com/v0";

const TABLES = {
  inbound: "입고 관리",
  lot: "LOT별 재고",
  product: "품목마스터",
};

async function fetchAll(tableName, fields = []) {
  const all = [];
  let offset;
  do {
    const params = new URLSearchParams();
    for (const f of fields) params.append("fields[]", f);
    params.set("pageSize", "100");
    if (offset) params.set("offset", offset);
    const url = `${API}/${BASE_ID}/${encodeURIComponent(tableName)}?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
    if (!res.ok) {
      throw new Error(`fetchAll ${tableName} 실패: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    all.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset);
  return all;
}

async function patchBatch(tableName, records) {
  if (records.length === 0) return { success: true, count: 0 };
  const chunks = [];
  for (let i = 0; i < records.length; i += 10) chunks.push(records.slice(i, i + 10));
  let totalOk = 0;
  for (const chunk of chunks) {
    const url = `${API}/${BASE_ID}/${encodeURIComponent(tableName)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: chunk, typecast: false }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PATCH ${tableName} 실패: ${res.status} ${body}`);
    }
    totalOk += chunk.length;
    await new Promise((r) => setTimeout(r, 250)); // rate-limit 여유
  }
  return { success: true, count: totalOk };
}

function firstLinkedId(field) {
  if (!Array.isArray(field) || field.length === 0) return null;
  const v = field[0];
  return typeof v === "string" && /^rec[A-Za-z0-9]+$/.test(v) ? v : null;
}

function firstLinkedName(field) {
  // 새 cellValuesByFieldId 형식과 fields 형식 둘 다 대응
  // fields["품목마스터"] = ["recXXX"] 또는 [{ id, name }] 가능
  if (!Array.isArray(field) || field.length === 0) return null;
  const v = field[0];
  if (typeof v === "string") return null;
  if (v && typeof v === "object" && typeof v.name === "string") return v.name;
  return null;
}

(async () => {
  console.log(`\n=== 옛 입고관리·LOT link backfill (${EXECUTE ? "EXECUTE" : "DRY-RUN"}) ===\n`);

  // 1) 품목마스터 전체 fetch → {품목명: id}
  console.log("1) 품목마스터 fetch...");
  const products = await fetchAll(TABLES.product, ["품목명"]);
  const productMap = new Map();
  for (const p of products) {
    const name = String(p.fields["품목명"] ?? "").trim();
    if (name) {
      if (productMap.has(name)) {
        console.warn(`  ⚠ 중복 품목명: "${name}" (${productMap.get(name)} vs ${p.id})`);
      }
      productMap.set(name, p.id);
    }
  }
  console.log(`   품목마스터: ${products.length}건, 매핑: ${productMap.size}건`);

  // 2) LOT 전체 fetch
  console.log("\n2) LOT별 재고 fetch...");
  const lots = await fetchAll(TABLES.lot, ["LOT번호", "품목명", "보관처", "품목마스터", "입고관리링크"]);
  console.log(`   LOT: ${lots.length}건`);

  // LOT id → {보관처, 품목마스터, 입고관리 id, 품목명}
  const lotInfo = new Map();
  for (const lot of lots) {
    const f = lot.fields;
    lotInfo.set(lot.id, {
      lotNumber: String(f["LOT번호"] ?? "").trim(),
      storageId: firstLinkedId(f["보관처"]),
      productLinkId: firstLinkedId(f["품목마스터"]),
      inboundLinkId: firstLinkedId(f["입고관리링크"]),
      productNameText: String(f["품목명"] ?? "").trim(),
    });
  }

  // 3) 입고관리 전체 fetch
  console.log("\n3) 입고 관리 fetch...");
  const inbounds = await fetchAll(TABLES.inbound, ["입고일", "보관처", "품목마스터", "LOT번호"]);
  console.log(`   입고관리: ${inbounds.length}건`);

  // 입고 → LOT 역인덱스 (LOT.입고관리링크 기반)
  const inboundToLot = new Map();
  for (const [lotId, info] of lotInfo) {
    if (info.inboundLinkId) inboundToLot.set(info.inboundLinkId, lotId);
  }

  // 4) 매핑 계산
  console.log("\n4) backfill 매핑 계산...");
  const lotPatches = []; // {id, fields: {품목마스터: [pid]}}
  const inboundPatches = []; // {id, fields: {보관처?, 품목마스터?}}
  const warnings = {
    lotNoProductMatch: [],   // LOT.품목명이 품목마스터에 매칭 안 됨
    inboundNoLotLink: [],    // 입고관리에 LOT link 없음
    inboundLotNotFound: [],  // 입고관리의 LOT link가 존재하지 않는 LOT
  };

  // LOT 패치 — 품목마스터 link 누락 & 품목명 텍스트로 매칭 가능
  for (const [lotId, info] of lotInfo) {
    if (info.productLinkId) continue; // 이미 채워짐
    const matched = productMap.get(info.productNameText);
    if (!matched) {
      warnings.lotNoProductMatch.push({ lotId, lotNumber: info.lotNumber, productNameText: info.productNameText });
      continue;
    }
    lotPatches.push({ id: lotId, fields: { 품목마스터: [matched] } });
  }

  // 입고관리 패치 — 보관처/품목마스터 누락 & LOT에서 가져옴
  for (const inbound of inbounds) {
    const f = inbound.fields;
    const storageMissing = !firstLinkedId(f["보관처"]);
    const productMissing = !firstLinkedId(f["품목마스터"]);
    if (!storageMissing && !productMissing) continue;

    const lotId = inboundToLot.get(inbound.id);
    if (!lotId) {
      warnings.inboundNoLotLink.push({ inboundId: inbound.id, date: f["입고일"] });
      continue;
    }
    const lot = lotInfo.get(lotId);
    if (!lot) {
      warnings.inboundLotNotFound.push({ inboundId: inbound.id, lotId });
      continue;
    }

    const patch = {};
    if (storageMissing && lot.storageId) patch.보관처 = [lot.storageId];
    if (productMissing) {
      // 우선 LOT.품목마스터(이미 있거나, 위 LOT 패치로 추가될 예정인 것)
      // 단, lotPatches는 아직 PATCH 전이라 productMap.get으로 직접 매칭
      let productId = lot.productLinkId;
      if (!productId) productId = productMap.get(lot.productNameText) ?? null;
      if (productId) patch.품목마스터 = [productId];
    }
    if (Object.keys(patch).length > 0) {
      inboundPatches.push({ id: inbound.id, fields: patch });
    }
  }

  // 5) 결과 출력
  console.log("\n=== 결과 요약 ===");
  console.log(`LOT 품목마스터 backfill: ${lotPatches.length}건`);
  console.log(`입고관리 backfill: ${inboundPatches.length}건`);
  console.log(`경고`);
  console.log(`  - LOT.품목명이 품목마스터에 없음: ${warnings.lotNoProductMatch.length}건`);
  console.log(`  - 입고관리에 LOT link 없음: ${warnings.inboundNoLotLink.length}건`);
  console.log(`  - 입고관리의 LOT link가 존재하지 않음: ${warnings.inboundLotNotFound.length}건`);

  if (warnings.lotNoProductMatch.length > 0) {
    console.log("\n품목 매핑 실패 LOT (수동 처리 필요):");
    for (const w of warnings.lotNoProductMatch.slice(0, 30)) {
      console.log(`  [${w.lotId}] ${w.lotNumber} — 품목명: "${w.productNameText}"`);
    }
    if (warnings.lotNoProductMatch.length > 30) console.log(`  ... ${warnings.lotNoProductMatch.length - 30}건 더`);
  }

  if (warnings.inboundNoLotLink.length > 0) {
    console.log("\n입고관리 LOT link 없음 (수동 처리 필요):");
    for (const w of warnings.inboundNoLotLink) {
      console.log(`  [${w.inboundId}] 입고일: ${w.date ?? "-"}`);
    }
  }

  // 6) DRY-RUN이면 종료, EXECUTE면 실제 PATCH
  if (!EXECUTE) {
    console.log("\n💡 실제 PATCH는 --execute 플래그로 실행하세요.");
    process.exit(0);
  }

  console.log("\n=== EXECUTE: 실제 PATCH 진행 ===");
  if (lotPatches.length > 0) {
    console.log(`LOT 패치 ${lotPatches.length}건...`);
    const r = await patchBatch(TABLES.lot, lotPatches);
    console.log(`  ✓ ${r.count}건 완료`);
  }
  if (inboundPatches.length > 0) {
    console.log(`입고관리 패치 ${inboundPatches.length}건...`);
    const r = await patchBatch(TABLES.inbound, inboundPatches);
    console.log(`  ✓ ${r.count}건 완료`);
  }
  console.log("\n✅ 완료");
})().catch((e) => {
  console.error("\n❌ 오류:", e);
  process.exit(1);
});
