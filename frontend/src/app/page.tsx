import RackHero from '@/components/home/RackHero';
import { RACK_TEES, loadRackTees } from '@/lib/rackHero';
import { getServiceClient } from '@/lib/admin/routeHelpers';

// Rack tees are edited in Admin → Homepage → Rack tees — always show the latest.
export const dynamic = 'force-dynamic';

/** Rack page — only the rack hero. "Shop the drop" leads to the shop landing page (/shop). */
export default async function RackPage() {
  const tees = await loadRackTees(getServiceClient()).catch(() => RACK_TEES);
  return <RackHero tees={tees} shopHref="/shop" />;
}
