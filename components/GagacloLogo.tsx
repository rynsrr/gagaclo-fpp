import localFont from 'next/font/local';

const gagacloLogo = localFont({
  src: '../public/fonts/GagacloLogo-Regular.ttf',
  weight: '400',
  style: 'normal',
  display: 'block',
  preload: true,
});

export default function GagacloLogo({ className = '' }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="P.T. GAGACLO"
      style={{ wordSpacing: '-0.15em' }}
      className={`${gagacloLogo.className} inline-block whitespace-nowrap leading-none font-normal ${className}`}
    >
      P.T. GAGACLO
    </span>
  );
}
