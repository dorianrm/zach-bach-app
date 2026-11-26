import type { ReactNode } from 'react';

type Common = {
  variant?: 'primary' | 'secondary';
  className?: string;
  children: ReactNode;
};
type LinkProps = Common & { href: string };
type ButtonProps = Common & { href?: undefined; type?: 'button' | 'submit'; disabled?: boolean; onClick?: () => void };

const variants = {
  primary: 'bg-highlight text-on-highlight px-[18px] text-sm',
  secondary: 'border border-line text-text px-6 text-[15px]',
};

// Fully rounded, 44px minimum tap target. A link when given href, else a <button>.
export function Button(props: LinkProps | ButtonProps) {
  const { variant = 'primary', className = '', children } = props;
  const classes = `inline-flex min-h-11 items-center justify-center rounded-full font-semibold no-underline disabled:opacity-60 ${variants[variant]} ${className}`;
  if (props.href !== undefined) {
    return (
      <a href={props.href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button type={props.type ?? 'button'} disabled={props.disabled} onClick={props.onClick} className={classes}>
      {children}
    </button>
  );
}
