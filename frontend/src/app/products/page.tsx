import { Suspense } from 'react';
import ProductsPage from './ProductsPage';

export const metadata = {
  title: 'Shop T-Shirts — ThreadX',
  description: 'Browse our full range of premium men\'s t-shirts. Filter by category, size, colour, and more.',
};

export default function Page() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-5 py-16 text-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto" />
      </div>
    }>
      <ProductsPage />
    </Suspense>
  );
}
