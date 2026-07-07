'use client';

import { useRef, useCallback, type ReactNode, type CSSProperties, type MouseEvent } from 'react';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  /** How strongly the button follows the cursor. 0 = no effect, 1 = full follow. Default: 0.38 */
  strength?: number;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  dataTestId?: string;
}

export default function MagneticButton({
  children,
  className,
  style,
  onClick,
  disabled,
  strength = 0.38,
  type = 'button',
  'aria-label': ariaLabel,
  dataTestId,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => {
    const el = ref.current;
    if (!el || disabled) return;
    el.style.transition = 'transform 0.15s ease';
  }, [disabled]);

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const el = ref.current;
      if (!el || disabled) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    },
    [disabled, strength]
  );

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1)';
    el.style.transform = 'translate(0, 0)';
  }, []);

  return (
    <button
      ref={ref}
      type={type}
      data-testid={dataTestId}
      className={className}
      style={style}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
}
