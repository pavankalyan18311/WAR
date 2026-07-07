'use client';

import { useRef, useEffect, useState, type CSSProperties, type ReactNode } from 'react';

type AnimationType = 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'zoom-in' | 'fade';

const HIDDEN: Record<AnimationType, CSSProperties> = {
  'fade-up':    { opacity: 0, transform: 'translateY(48px)' },
  'fade-down':  { opacity: 0, transform: 'translateY(-48px)' },
  'fade-left':  { opacity: 0, transform: 'translateX(48px)' },
  'fade-right': { opacity: 0, transform: 'translateX(-48px)' },
  'zoom-in':    { opacity: 0, transform: 'scale(0.88)' },
  'fade':       { opacity: 0 },
};

const VISIBLE: Record<AnimationType, CSSProperties> = {
  'fade-up':    { opacity: 1, transform: 'translateY(0)' },
  'fade-down':  { opacity: 1, transform: 'translateY(0)' },
  'fade-left':  { opacity: 1, transform: 'translateX(0)' },
  'fade-right': { opacity: 1, transform: 'translateX(0)' },
  'zoom-in':    { opacity: 1, transform: 'scale(1)' },
  'fade':       { opacity: 1 },
};

interface ScrollRevealProps {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number;       // ms
  duration?: number;    // ms
  threshold?: number;   // 0-1
  once?: boolean;       // default true
  className?: string;
  style?: CSSProperties;
  as?: keyof JSX.IntrinsicElements;
}

export default function ScrollReveal({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 700,
  threshold = 0.15,
  once = true,
  className,
  style,
  as: Tag = 'div',
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold]);

  const transitionStyle: CSSProperties = {
    transition: `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
    ...(visible ? VISIBLE[animation] : HIDDEN[animation]),
    ...style,
  };

  // @ts-expect-error — dynamic tag
  return (
    <Tag ref={ref} className={className} style={transitionStyle}>
      {children}
    </Tag>
  );
}
