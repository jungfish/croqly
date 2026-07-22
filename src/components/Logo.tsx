interface LogoProps {
  variant?: 'ink' | 'paper' | 'color';
  showWordmark?: boolean;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}

const MARK_SRC: Record<NonNullable<LogoProps['variant']>, string> = {
  ink: '/croqly-mark-ink.svg',
  paper: '/croqly-mark-paper.svg',
  color: '/croqly-mark.svg',
};

const Logo = ({
  variant = 'color',
  showWordmark = true,
  className = '',
  markClassName = 'w-10 h-10',
  wordmarkClassName = 'text-primary',
}: LogoProps) => (
  <span className={`inline-flex items-center gap-3 ${className}`}>
    <img src={MARK_SRC[variant]} alt="Croqly" className={markClassName} />
    {showWordmark && (
      <span className={`font-display font-semibold text-xl ${wordmarkClassName}`}>Croqly</span>
    )}
  </span>
);

export default Logo;
