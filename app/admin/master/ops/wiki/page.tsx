'use client';

// 용어 위키 — 수산물 ERP 도메인 용어·개념 레퍼런스.
// 목적: 1인 개발 프로젝트라, 나중에 합류할 사람이 용어를 검색·학습할 수 있게.
// 살아있는 문서 docs/업무프로세스.md 와 같은 내용을 화면으로 옮긴 것.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';

type Entry = {
  term: string;
  aka?: string; // 동의어·헷갈리는 말
  def: string;
  cat: '원가' | '가공' | '재고·보관' | '판매' | '일반';
  important?: boolean;
};

// 가치사슬 흐름 (수매 → 판매)
const VALUE_CHAIN = [
  '수매(경매)',
  '선별(자사 선별기)',
  '가공공장 입고(외주)',
  '가공·동결',
  '자사 재입고',
  '소분(진공)',
  '판매 / 수출',
];

const GLOSSARY: Entry[] = [
  // 일반
  {
    term: '미수',
    aka: '마리수 · 사이즈 (외상·미수금 아님)',
    def: '생선 한 박스에 몇 마리가 들어가는지 = 사이즈. 예 "26미" = 박스당 26마리. 숫자가 클수록 작은 생선. ⚠ 회계의 외상/미수금과는 전혀 다른 말.',
    cat: '일반',
    important: true,
  },
  {
    term: '규격',
    def: '박스당 무게(kg). 예 "10kg/박스". 원가를 kg 단가로 환산할 때 분모로 쓰임.',
    cat: '일반',
  },
  {
    term: 'LOT',
    aka: 'LOT번호',
    def: '재고를 추적하는 기본 단위. 번호 형식 = YYMMDD-품목코드-규격-미수-일련번호 (예 260417-MC1-11-26-0001). 영업일 오전 9시 기준 일련번호.',
    cat: '재고·보관',
  },
  {
    term: '원산지',
    def: '국내산 / 일본산 등 생선이 잡힌 곳. 원산지 증빙·이력추적에 사용.',
    cat: '일반',
  },
  {
    term: '수매',
    def: '경매 등에서 생선을 사들이는 것. "입고 시 매입"이라는 표현은 경매에서 수매한 경우를 가리킴(도착 ≈ 입고).',
    cat: '일반',
  },
  // 가공
  {
    term: '임가공',
    aka: '외주 가공',
    def: '가공을 타사(외부 가공공장)에 위탁하는 것. 그 비용 = 임가공비. 자체 노무가 아니라 외주 수수료라 LOT에 직접 얹힘.',
    cat: '가공',
  },
  {
    term: '소분',
    aka: '소포장 · 진공',
    def: '큰 단위를 작은 포장으로 나눠 진공 포장하는 가공. 소포장 판매 모드의 핵심 작업.',
    cat: '가공',
  },
  {
    term: '수율',
    aka: '산출량 ÷ 투입량',
    def: '가공 시 무게가 얼마나 남는지. 예 원물 10kg → 필렛 7kg = 수율 70%. 손실분만큼 단위원가가 올라감. 내장 상태에 따라 변동해 실제 산출량을 그때그때 측정하는 게 정확.',
    cat: '가공',
  },
  {
    term: 'ONE-Frozen',
    aka: '원프로즌 · 1회 동결',
    def: '제주 내 가공. 원물을 그대로 가공공장으로 옮겨 바로 작업 후 1회 동결. 임가공비는 투입 kg당 청구.',
    cat: '가공',
  },
  {
    term: 'TWO-Frozen',
    aka: '투프로즌 · 재동결',
    def: '부산·해외 가공. 냉동(1차) → 해동 → 가공(가시제거 등) → 재동결 → 수출 후 재수입. 국내 임가공비가 비싸 해외에서 가시제거. 임가공비는 산출 kg당 청구.',
    cat: '가공',
  },
  // 원가
  {
    term: '재고원가',
    def: '원물 보유 상태의 원가 = 수매가 + 창고경비(냉장료·입출고비·노조비·동결비). 회계상 재고자산 원가. "오늘 기준"으로 보관일수만큼 누적.',
    cat: '원가',
  },
  {
    term: '가공원가',
    def: '제품(필렛) 보유 상태의 원가 = (투입 원물의 재고원가 + 총임가공비) ÷ 산출kg. 가공공장행 운임 포함. TWO-Frozen은 수입 관세·운임도 추가.',
    cat: '원가',
    important: true,
  },
  {
    term: '판매원가',
    def: '출고·판매 시 원가. 원물 판매 = 재고원가 + 운임·경비(벌크 모드). 제품 판매 = 가공원가 + 소포장·포장경비·운임(소포장 모드).',
    cat: '원가',
  },
  {
    term: '매출원가',
    aka: 'COGS · 출고시점 판매원가',
    def: '실제 팔린 분의 원가 = 판매원가를 출고 시점에 얼린 스냅샷. 시스템 필드 `출고시점 판매원가`가 이 값.',
    cat: '원가',
  },
  {
    term: '제조원가',
    aka: '(이 시스템에선 안 씀)',
    def: '정식 제조원가회계(명세서·간접비 배부·재공품)를 부를 수 있어 쓰지 않음. 가공품 원가는 "가공원가"로 부른다.',
    cat: '원가',
  },
  {
    term: '동결비',
    def: '냉동(동결) 처리 비용. 보관비(재고원가)를 구성하는 1회성 항목. 재고 이동된 LOT은 동결비 0, 이월동결비는 원본 원가 보존.',
    cat: '재고·보관',
  },
  {
    term: '냉장료',
    def: '보관일수에 비례해 매일 쌓이는 보관 비용(flow). 재고원가의 시간 누적 부분.',
    cat: '재고·보관',
  },
  // 재고·보관
  {
    term: '보관처',
    aka: '자사창고 / 외부창고 / 가공공장',
    def: '재고를 두는 곳 3종. 입출고증 PDF 발행은 자사창고가 끝점일 때만. 외부창고는 임대.',
    cat: '재고·보관',
  },
  {
    term: '재고 이동',
    def: '보관처 간 이동 → 새 LOT 생성, 원본 차감. 주 이유 = ① 가공 투입 ② 수입품 물류(부산 선입고 → 판매 위해 제주로).',
    cat: '재고·보관',
  },
  // 판매
  {
    term: 'CIF',
    def: '운임·보험료 포함 인도조건. 수출 대부분 CIF라 운임이 판매원가에 포함됨.',
    cat: '판매',
  },
  {
    term: '소포장 모드',
    aka: '소분·진공',
    def: '소량·고가 가공품 판매. 판매원가 = 가공원가 + 부자재(박스·아이스팩·내피·진공팩) + 운임.',
    cat: '판매',
  },
  {
    term: '벌크 모드',
    aka: '컨테이너 · 냉동물',
    def: '대량·저가 원물(냉동물) 판매. 판매원가 = 재고원가 + 운임(CIF, 지배적). 부자재 ≈ 0.',
    cat: '판매',
  },
];

const CAT_ORDER: Entry['cat'][] = ['원가', '가공', '재고·보관', '판매', '일반'];

export default function WikiPage() {
  const router = useRouter();
  const [q, setQ] = useState('');

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
    }
  }, [router]);

  const query = q.trim().toLowerCase();
  const match = useCallback(
    (...texts: (string | undefined)[]) =>
      !query || texts.some((t) => (t ?? '').toLowerCase().includes(query)),
    [query],
  );

  const visibleEntries = useMemo(
    () => GLOSSARY.filter((e) => match(e.term, e.aka, e.def, e.cat)),
    [match],
  );

  const showChain = match(
    '가치사슬 흐름 수매 선별 가공공장 재입고 소분 진공 판매 수출 수입 부산 제주 사업 개요 one-frozen two-frozen',
  );
  const showLadder = match(
    '원가 재고원가 가공원가 판매원가 매출원가 cogs 사다리 수율 임가공비 산출 운임 스냅샷 출고시점',
  );
  const showOneTwo = match(
    'one-frozen two-frozen 원프로즌 투프로즌 필렛 가시제거 동결 가공 제주 부산 해외 임가공 투입 산출 수율',
  );
  const showModes = match('판매 2모드 소포장 소분 진공 벌크 컨테이너 부자재 운임 cif 원물 제품');

  const nothing =
    query && !showChain && !showLadder && !showOneTwo && !showModes && visibleEntries.length === 0;

  return (
    <div className="mx-auto max-w-[1200px] p-8 min-w-0">
      <div className="mb-6">
        <h1 className="text-[22px] font-black text-gray-900 tracking-tight">용어 위키</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          수산물 ERP 도메인 용어·개념 정리. 헷갈리는 말은 여기서 검색하세요. (출처: docs/업무프로세스.md)
        </p>
      </div>

      {/* 검색 */}
      <div className="relative w-full max-w-md mb-7">
        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="용어 검색 (예: 미수, 가공원가, 수율, ONE-Frozen)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
        />
      </div>

      {nothing && (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-[14px] text-gray-400">
          &quot;{q}&quot; 에 해당하는 용어가 없어요.
        </div>
      )}

      <div className="space-y-6">
        {/* 1. 가치사슬 한눈에 */}
        {showChain && (
          <section
            id="가치사슬"
            className="scroll-mt-20 bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h2 className="text-[16px] font-black text-gray-900 mb-1">사업 한눈에 — 가치사슬</h2>
            <p className="text-[13px] text-gray-500 mb-4">
              수산물 <b>유통 + 가공</b> 사업. 단순 사고팔기가 아니라 <b>가공이 핵심 비중</b>.
            </p>
            <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
              {VALUE_CHAIN.map((step, i) => (
                <span key={step} className="flex items-center gap-1">
                  <span className="inline-block px-3 py-1.5 rounded-lg bg-[#3182F6]/10 text-[#3182F6] text-[13px] font-bold">
                    {step}
                  </span>
                  {i < VALUE_CHAIN.length - 1 && <span className="text-gray-300">→</span>}
                </span>
              ))}
            </div>
            <p className="text-[12px] text-gray-400 mt-4 leading-relaxed">
              · 수입(사료·냉동물)도 운영 → 보통 부산 선입고 후 제주로 이동.
              <br />· 가공 방식 2종(<b>ONE-Frozen</b> 제주·<b>TWO-Frozen</b> 해외)은 아래 참고.
              <br />· 판매는 가격표 없이 <b>원가 기반 건별 협상</b> → 정확한 원가 계산이 핵심.
            </p>
          </section>
        )}

        {/* 2. 원가 4단 사다리 (핵심) */}
        {showLadder && (
          <section
            id="원가-사다리"
            className="scroll-mt-20 bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h2 className="text-[16px] font-black text-gray-900 mb-1">원가 4단 사다리</h2>
            <p className="text-[13px] text-gray-500 mb-5">
              원물·제품 둘 다 취급하므로 원가는 단계마다 쌓이고, 판매 시 품목 종류에 따라 갈라짐.
            </p>
            <div className="space-y-2">
              <LadderTier
                accent="border-[#3182F6]"
                name="재고원가"
                state="원물 보유"
                formula="수매가 + 창고경비(냉장료·입출고비·노조비·동결비)"
              />
              <LadderArrow note="가공 — 임가공비 투입 + 수율 손실" />
              <LadderTier
                accent="border-amber-500"
                name="가공원가"
                state="제품(필렛) 보유"
                formula="(투입 원물의 재고원가 + 총임가공비) ÷ 산출kg"
                extra="임가공비: ONE-Frozen=투입kg당 · TWO-Frozen=산출kg당 / 가공공장행 운임 포함"
              />
              <LadderArrow note="출고 · 판매" />
              <LadderTier
                accent="border-emerald-500"
                name="판매원가"
                state="출고 시점"
                formula="원물 판매 → 재고원가 + 운임·경비   |   제품 판매 → 가공원가 + 소포장·포장·운임"
              />
              <LadderArrow note="출고 확정 — 스냅샷" />
              <LadderTier
                accent="border-slate-400"
                name="매출원가 (COGS)"
                state="팔린 분"
                formula="판매원가를 출고 시점에 얼린 값 ( = 필드 출고시점 판매원가 )"
              />
            </div>
            <div className="mt-5 rounded-xl bg-amber-50 border border-amber-100 p-4 text-[12.5px] text-amber-900 leading-relaxed">
              <b>수율 계산 핵심</b> — 손실로 부풀리는 건 재료비(원물)뿐. 가장 간단한 식은{' '}
              <code className="font-mono bg-white/70 px-1 rounded">(총투입비 ÷ 실제 산출량)</code> 한 줄.
              <br />예) 원물 10kg(5,000원/kg) + 임가공 1,000원/kg, 산출 7kg →
              <b> ONE-Frozen</b> (5,000+1,000)÷0.7 = <b>8,571원/kg</b>,
              <b> TWO-Frozen</b> 5,000÷0.7+1,000 = <b>8,143원/kg</b>.
            </div>
          </section>
        )}

        {/* 3. ONE / TWO-Frozen */}
        {showOneTwo && (
          <section
            id="동결-2종"
            className="scroll-mt-20 bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h2 className="text-[16px] font-black text-gray-900 mb-1">필렛 2종 — ONE / TWO-Frozen</h2>
            <p className="text-[13px] text-gray-500 mb-4">
              프로젝트 확장의 핵심 개념. 동결 방식이 임가공비 청구 기준까지 결정한다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left">
                    <th className="px-3 py-2 font-bold rounded-l-lg">구분</th>
                    <th className="px-3 py-2 font-bold">가공지</th>
                    <th className="px-3 py-2 font-bold">흐름</th>
                    <th className="px-3 py-2 font-bold rounded-r-lg">임가공비 기준</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100">
                    <td className="px-3 py-2.5 font-bold text-amber-700">ONE-Frozen</td>
                    <td className="px-3 py-2.5">제주 내</td>
                    <td className="px-3 py-2.5 text-gray-600">원물 그대로 이동 → 바로 작업 후 1회 동결</td>
                    <td className="px-3 py-2.5 font-medium">투입 kg당</td>
                  </tr>
                  <tr className="border-t border-gray-100">
                    <td className="px-3 py-2.5 font-bold text-amber-700">TWO-Frozen</td>
                    <td className="px-3 py-2.5">부산·해외</td>
                    <td className="px-3 py-2.5 text-gray-600">
                      냉동 → 해동 → 가공(가시제거) → 재동결 → 수출 후 재수입
                    </td>
                    <td className="px-3 py-2.5 font-medium">산출 kg당</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 4. 판매 2모드 */}
        {showModes && (
          <section
            id="판매-2모드"
            className="scroll-mt-20 bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h2 className="text-[16px] font-black text-gray-900 mb-1">판매 2모드</h2>
            <p className="text-[13px] text-gray-500 mb-4">판매 종류에 따라 판매원가 구성이 다름.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left">
                    <th className="px-3 py-2 font-bold rounded-l-lg">모드</th>
                    <th className="px-3 py-2 font-bold">상황</th>
                    <th className="px-3 py-2 font-bold rounded-r-lg">판매원가 구성</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100">
                    <td className="px-3 py-2.5 font-bold text-emerald-700">소포장 (소분·진공)</td>
                    <td className="px-3 py-2.5 text-gray-600">소량·고가, 가공품</td>
                    <td className="px-3 py-2.5">가공원가 + 부자재(박스·아이스팩·내피·진공팩) + 운임</td>
                  </tr>
                  <tr className="border-t border-gray-100">
                    <td className="px-3 py-2.5 font-bold text-emerald-700">벌크 (컨테이너)</td>
                    <td className="px-3 py-2.5 text-gray-600">대량·저가, 냉동물(원물)</td>
                    <td className="px-3 py-2.5">재고원가 + 운임(CIF, 지배적), 부자재 ≈ 0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 5. 용어집 */}
        {visibleEntries.length > 0 && (
          <section
            id="용어집"
            className="scroll-mt-20 bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h2 className="text-[16px] font-black text-gray-900 mb-4">용어집</h2>
            <div className="space-y-5">
              {CAT_ORDER.map((cat) => {
                const rows = visibleEntries.filter((e) => e.cat === cat);
                if (rows.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="text-[12px] font-black text-gray-400 mb-2 uppercase tracking-wide">
                      {cat}
                    </div>
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                      {rows.map((e) => (
                        <div
                          key={e.term}
                          id={e.term}
                          className={`scroll-mt-20 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 px-4 py-3 ${
                            e.important ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          <div>
                            <span className="text-[14px] font-bold text-gray-900">{e.term}</span>
                            {e.important && (
                              <span className="ml-2 text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                중요
                              </span>
                            )}
                            {e.aka && (
                              <div className="text-[11.5px] text-gray-400 mt-0.5">{e.aka}</div>
                            )}
                          </div>
                          <div className="text-[13px] text-gray-600 leading-relaxed">{e.def}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <p className="text-[12px] text-gray-400 mt-8">
        이 문서는 살아있는 자료입니다. 내용 변경은 docs/업무프로세스.md 와 함께 갱신하세요.
      </p>
    </div>
  );
}

// 원가 사다리 한 칸
function LadderTier({
  accent,
  name,
  state,
  formula,
  extra,
}: {
  accent: string;
  name: string;
  state: string;
  formula: string;
  extra?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 border-l-4 ${accent} bg-white p-4`}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[15px] font-black text-gray-900">{name}</span>
        <span className="text-[11px] font-bold text-gray-400">{state}</span>
      </div>
      <div className="text-[13px] text-gray-700 mt-1 font-medium">{formula}</div>
      {extra && <div className="text-[11.5px] text-gray-400 mt-1">{extra}</div>}
    </div>
  );
}

// 사다리 단계 사이 화살표
function LadderArrow({ note }: { note: string }) {
  return (
    <div className="flex items-center gap-2 pl-4">
      <span className="text-gray-300 text-lg leading-none">↓</span>
      <span className="text-[11.5px] text-gray-400">{note}</span>
    </div>
  );
}
