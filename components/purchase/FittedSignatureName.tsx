'use client';

import { useEffect, useRef } from 'react';

export default function FittedSignatureName({ name }: { name: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let active = true;
    const fit = () => {
      const box = boxRef.current;
      const text = nameRef.current;
      if (!active || !box || !text) return;
      text.style.fontSize = '21px';
      const naturalWidth = text.getBoundingClientRect().width;
      const availableWidth = Math.max(1, box.clientWidth - 12);
      text.style.fontSize = `${naturalWidth ? Math.min(21, 21 * availableWidth / naturalWidth) : 21}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (boxRef.current) observer.observe(boxRef.current);
    void document.fonts.ready.then(fit);
    document.fonts.addEventListener('loadingdone', fit);
    window.addEventListener('beforeprint', fit);
    return () => {
      active = false;
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', fit);
      window.removeEventListener('beforeprint', fit);
    };
  }, [name]);

  return (
    <div ref={boxRef} className="w-full flex items-center justify-center min-w-0">
      <span
        ref={nameRef}
        className="font-signature inline-block shrink-0 whitespace-nowrap font-bold text-black tracking-wide leading-normal select-none"
        style={{ fontSize: '21px', fontFamily: "var(--font-great-vibes), 'Great Vibes', var(--font-dancing-script), 'Dancing Script', 'Brush Script MT', cursive" }}
      >
        {name}
      </span>
    </div>
  );
}
