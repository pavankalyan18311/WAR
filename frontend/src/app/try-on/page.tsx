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
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900">VIRTUAL TRY-ON</h1>
        <p className="text-gray-500 mt-2">See how this t-shirt looks on you</p>
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

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Panel */}
        <div className="space-y-5">
          {/* Step 1: Upload */}
          <div className={cn('bg-white border rounded-2xl p-6 transition-opacity', currentStep > 1 ? 'opacity-60' : '')}>
            <h2 className="font-bold text-base mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-black text-white rounded-full text-xs flex items-center justify-center">1</span>
              Upload Your Photo
            </h2>

            {photo ? (
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-24 rounded-xl overflow-hidden">
                  <Image src={photo} alt="Uploaded" fill className="object-cover" sizes="80px" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle size={14} /> Photo uploaded
                  </p>
                  <button
                    onClick={() => { setPhoto(null); setCurrentStep(1); setIsDone(false); }}
                    className="text-xs text-gray-500 underline mt-1"
                  >
                    Change photo
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <Camera size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Click to upload your photo</p>
                <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — max 10 MB</p>
                <p className="text-xs text-gray-400">Best: full-body, well-lit, plain background</p>
                <button className="mt-4 bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-900 transition-colors flex items-center gap-2 mx-auto">
                  <Upload size={14} /> Choose File
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

            {photo && currentStep === 1 && (
              <button
                onClick={() => setCurrentStep(2)}
                className="mt-4 w-full bg-black text-white py-3 rounded-full font-bold text-sm hover:bg-gray-900 transition-colors"
              >
                Continue to Measurements
              </button>
            )}
          </div>

          {/* Step 2: Measurements */}
          {currentStep >= 2 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <span className="w-6 h-6 bg-black text-white rounded-full text-xs flex items-center justify-center">2</span>
                  Your Measurements
                </h2>
                <button className="text-xs text-gray-500 flex items-center gap-1 hover:text-black">
                  <Edit size={12} /> Edit
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'height', label: 'Height', unit: 'cm' },
                  { key: 'weight', label: 'Weight', unit: 'kg' },
                  { key: 'chest', label: 'Chest', unit: 'inch' },
                  { key: 'shoulder', label: 'Shoulder', unit: 'inch' },
                  { key: 'waist', label: 'Waist', unit: 'inch' },
                ].map(({ key, label, unit }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 block mb-1">{label}</label>
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <input
                        type="number"
                        value={measurements[key as keyof typeof measurements]}
                        onChange={(e) => setMeasurements({ ...measurements, [key]: e.target.value })}
                        className="flex-1 px-3 py-2 text-sm outline-none text-gray-900"
                      />
                      <span className="bg-gray-50 border-l border-gray-200 px-2 py-2 text-xs text-gray-500">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 mt-3 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                <p>Measurements are optional but improve accuracy. If not provided, our AI estimates them from your photo.</p>
              </div>

              {!isDone && (
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="mt-4 w-full bg-black text-white py-3.5 rounded-full font-bold text-sm hover:bg-gray-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing AI Pipeline...
                    </>
                  ) : (
                    'Generate Try-On'
                  )}
                </button>
              )}
            </div>
          )}
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
