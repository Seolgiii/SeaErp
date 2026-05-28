import ComingSoonPage from '@/app/components/ComingSoonPage';
import { findNavItem } from '@/app/admin/master/_nav';

/**
 * /admin/master 미정의 경로 catch-all → ComingSoonPage.
 *
 * IA 6 카테고리에 정의된 placeholder URL들이 모두 여기로 떨어진다.
 * 실제 화면이 만들어진 경로(products, suppliers, lots, ...)는 Next.js가
 * specific route를 우선하므로 영향 없음.
 */
export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const href = `/admin/master/${slug.join('/')}`;
  const found = findNavItem(href);
  return (
    <ComingSoonPage
      category={found?.category}
      label={found?.label}
      path={href}
    />
  );
}
