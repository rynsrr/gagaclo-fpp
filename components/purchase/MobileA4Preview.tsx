'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Printer } from 'lucide-react';

interface MobileA4PreviewProps {
  children: React.ReactNode;
  onPrint: () => void;
}

const A4_WIDTH_PX = 794; // 210mm at 96dpi

export default function MobileA4Preview({ children, onPrint }: MobileA4PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const updateMetrics = () => {
      if (!containerRef.current) return;
      const availableWidth = containerRef.current.clientWidth;
      if (availableWidth <= 0) return;

      const nextScale = fitToWidth ? Math.min(1, availableWidth / A4_WIDTH_PX) : 1;
      setScale(nextScale);

      if (contentRef.current) {
        const naturalHeight = contentRef.current.scrollHeight;
        setScaledHeight(fitToWidth && nextScale < 1 ? Math.ceil(naturalHeight * nextScale) : undefined);
      }
    };

    updateMetrics();
    const observer = new ResizeObserver(updateMetrics);
    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    window.addEventListener('resize', updateMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateMetrics);
    };
  }, [fitToWidth]);

  return (
    <div className="w-full space-y-3 print:space-y-0">
      {/* Mobile preview action bar */}
      <div className="no-print md:hidden flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <button
          type="button"
          onClick={() => setFitToWidth((prev) => !prev)}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-200 active:scale-95 transition"
        >
          {fitToWidth ? (
            <>
              <Maximize2 className="w-4 h-4" aria-hidden="true" />
              <span>Zoom 100%</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-4 h-4" aria-hidden="true" />
              <span>Pas Layar</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black text-xs font-semibold shadow-sm active:scale-95 transition"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          <span>Cetak / Simpan PDF</span>
        </button>
      </div>

      {/* Responsive A4 viewport container (unwrapped in @media print) */}
      <div
        ref={containerRef}
        className={`w-full print:overflow-visible print:h-auto ${
          fitToWidth ? 'overflow-hidden' : 'overflow-x-auto pb-2'
        }`}
        style={
          scaledHeight !== undefined
            ? { height: `${scaledHeight}px` }
            : undefined
        }
      >
        <div
          ref={contentRef}
          className="origin-top-left print:transform-none print:w-full"
          style={
            fitToWidth && scale < 1
              ? {
                  width: `${A4_WIDTH_PX}px`,
                  transform: `scale(${scale})`,
                }
              : !fitToWidth
              ? { width: `${A4_WIDTH_PX}px` }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
