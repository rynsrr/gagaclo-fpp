import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Formulir Permohonan Pembelian | PT Gagaclo',
  description: 'Aplikasi Pembuatan & Pencetakan Formulir Permohonan Pembelian (FPP) PT Gagaclo terintegrasi Supabase, GitHub, dan Vercel.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Great+Vibes&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('gagaclo_theme');
                  var isDark = saved === 'dark';
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#08090C] text-slate-900 dark:text-[#F5F5F7] transition-colors duration-200 selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
        {children}
      </body>
    </html>
  );
}
