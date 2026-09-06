import { Suspense } from 'react';
import ProductsPage from './ProductsPage';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';

export const metadata = {
  title: 'Shop T-Shirts — WAR',
  description: 'Browse our full range of premium men\'s t-shirts. Filter by category, size, colour, and more.',
};

export default function Page() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex gap-6">
          <div className="hidden lg:block w-56 flex-shrink-0" />
          <div className="flex-1">
            <ProductGridSkeleton count={9} />
          </div>
        </div>
      </div>
    }>
      <ProductsPage />
    </Suspense>
  );
}
