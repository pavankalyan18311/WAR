'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Upload,
  Camera,
  CheckCircle,
  RotateCcw,
  ShoppingBag,
  ChevronRight,
  Edit,
  Info,
} from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/mockData';
import { cn } from '@/lib/utils';

const STEPS = [
  { n: 1, label: 'Upload Photo' },
  { n: 2, label: 'Your Measurements' },
  { n: 3, label: 'Try On' },
];

const FIT_HIGHLIGHTS = ['Oversized Fit', 'Drop Shoulder', 'Relaxed Comfort'];

export default function TryOnPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [selectedView, setSelectedView] = useState<'front' | 'side' | 'back'>('front');
  const [measurements, setMeasurements] = useState({
    height: '175', weight: '70', chest: '40', shoulder: '18', waist: '32',
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const product = MOCK_PRODUCTS[0]; // Default to first product

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhoto(url);
    }
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    setCurrentStep(3);
    // Simulate 8-stage AI pipeline
    await new Promise((r) => setTimeout(r, 3000));
    setIsProcessing(false);
    setIsDone(true);
  };

  const tryOnViews = {
    front: photo ?? product.images[0]?.url,
    side: product.images[1]?.url ?? product.images[0]?.url,
    back: product.images[2]?.url ?? product.images[0]?.url,
  };

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Size Guide</h1>
        <p className="text-gray-500 mt-2">Guidance to pick the perfect oversized fit — measurements & conversions.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4 mb-10">
        {STEPS.map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
              currentStep >= n ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'
            )}>
              {currentStep > n ? <CheckCircle size={16} /> : n}
            </div>
            <span className={cn('text-sm hidden sm:block', currentStep >= n ? 'font-semibold text-gray-900' : 'text-gray-400')}>
              {label}
            </span>
            {n < 3 && <ChevronRight size={16} className="text-gray-300 ml-2" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-1 gap-8">
        {/* Left Panel */}
        <div className="space-y-5">
          {/* Size Guide Content (replaces AI Try-On) */}
          <div className="bg-white border rounded-2xl p-6">
            <h2 className="font-bold text-base mb-4">How to measure</h2>
            <p className="text-sm text-gray-600 mb-4">Measure your chest, shoulder and waist using a measuring tape. Use the table below to convert to our sizes.</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-2">Size</th>
                  <th className="py-2">Chest (in)</th>
                  <th className="py-2">Shoulder (in)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-2">S</td><td className="py-2">36-38</td><td className="py-2">16-17</td></tr>
                <tr><td className="py-2">M</td><td className="py-2">38-40</td><td className="py-2">17-18</td></tr>
                <tr><td className="py-2">L</td><td className="py-2">40-42</td><td className="py-2">18-19</td></tr>
                <tr><td className="py-2">XL</td><td className="py-2">42-44</td><td className="py-2">19-20</td></tr>
                <tr><td className="py-2">XXL</td><td className="py-2">44-46</td><td className="py-2">20-21</td></tr>
              </tbody>
            </table>
            <div className="mt-6 flex gap-3">
              <Link href="/products" className="flex-1 bg-black text-white py-3 rounded-full text-sm font-bold text-center">Shop Oversized</Link>
              <Link href="/contact" className="flex-1 border border-gray-200 py-3 rounded-full text-sm font-medium text-center">Need help?</Link>
            </div>
          </div>
        </div>

        {/* Right Panel — Result */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-base">
              {isDone ? 'Your Try-On Result' : 'Preview'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {product.name}
            </p>
          </div>

          {/* Preview Image */}
          <div className="relative bg-gray-50" style={{ minHeight: 400 }}>
            {isProcessing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-700">Processing 8-stage AI pipeline...</p>
                <p className="text-xs text-gray-400">Human Detection → Body Segmentation → Pose Estimation...</p>
              </div>
            ) : (
              <>
                <Image
                  src={tryOnViews[selectedView] ?? ''}
                  alt={`${selectedView} view`}
                  width={500}
                  height={600}
                  className="w-full object-cover"
                />
                {isDone && (
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                    <p className="text-xs font-semibold text-gray-700 mb-2">RECOMMENDED SIZE</p>
                    <div className="text-3xl font-black text-black mb-1">L</div>
                    <p className="text-[10px] text-gray-500">Based on your measurements</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* View Selector */}
          {isDone && (
            <div className="p-4 space-y-4">
              <div className="flex gap-3">
                {(['front', 'side', 'back'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setSelectedView(view)}
                    className={cn(
                      'flex-1 py-2 text-xs font-semibold rounded-lg transition-colors capitalize',
                      selectedView === view ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {view} View
                  </button>
                ))}
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">ABOUT THIS FIT</p>
                <div className="space-y-1">
                  {FIT_HIGHLIGHTS.map((point) => (
                    <div key={point} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <CheckCircle size={12} className="text-green-500" />
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setIsDone(false); setCurrentStep(1); setPhoto(null); }}
                  className="flex-1 border border-gray-200 py-3 rounded-full text-sm font-medium text-gray-700 flex items-center justify-center gap-2 hover:border-gray-400 transition-colors"
                >
                  <RotateCcw size={15} /> Try Again
                </button>
                <Link
                  href={`/products/${product.slug}`}
                  className="flex-[2] bg-black text-white py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors"
                >
                  <ShoppingBag size={15} /> Add to Cart
                </Link>
              </div>
            </div>
          )}

          {!isDone && !isProcessing && (
            <div className="p-5 text-center">
              <Image
                src={product.images[0]?.url}
                alt={product.name}
                width={200}
                height={250}
                className="w-full max-w-[200px] mx-auto object-cover rounded-xl"
              />
              <p className="text-xs text-gray-400 mt-3">Upload your photo to see the try-on result</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
