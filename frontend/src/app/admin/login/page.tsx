'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
