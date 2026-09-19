'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { AppLayout } from '@/components/layout/AppLayout';

const TemporalCompareSlider = dynamic(
  () => import('@/components/map/TemporalCompareSlider'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[700px] bg-white rounded-2xl border border-[#e5ebe4] shadow-xs flex items-center justify-center text-xs font-medium text-slate-500 animate-pulse">
        Loading Satellite Comparison Studio...
      </div>
    ),
  }
);

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-[#f4f6f3] text-slate-500 font-medium text-xs">
          Loading TerraWatch Satellite Comparison...
        </div>
      }
    >
      <AppLayout>
        <div className="max-w-[1600px] mx-auto space-y-4 pb-12">
          <TemporalCompareSlider isStandalonePage={true} />
        </div>
      </AppLayout>
    </Suspense>
  );
}
