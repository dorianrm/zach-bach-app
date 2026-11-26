import type { ReactNode } from 'react';

type Props = {
  variant?: 'primary' | 'secondary';
  href: string;
  className?: string;
  children: ReactNode;
};

const variants = {
  primary: 'bg-highlight text-on-highlight px-[18px] text-sm',
  secondary: 'border border-line text-text px-6 text-[15px]',
};

// Fully rounded, 44px minimum tap target. Rendered as a link until a thread needs a form button.
export function Button({ variant = 'primary', href, className = '', children }: Props) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-full font-semibold no-underline ${variants[variant]} ${className}`}
    >
      {children}
    </a>
  );
}
